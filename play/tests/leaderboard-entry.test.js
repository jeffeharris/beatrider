import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLeaderboardEntry,
  computePointsPerMinute,
  insertEntryRanked,
  seedLeaderboardFromLegacyHighScore
} from '../src/leaderboard/leaderboard-entry.js';

const entry = (score, timestamp = 0) => ({ score, timestamp });

test('computePointsPerMinute scales seconds to minutes', () => {
  assert.equal(computePointsPerMinute(600, 60), 600);
  assert.equal(computePointsPerMinute(600, 120), 300);
  assert.equal(computePointsPerMinute(100, 45), 133);
});

test('computePointsPerMinute returns 0 for a zero or missing duration', () => {
  assert.equal(computePointsPerMinute(500, 0), 0);
  assert.equal(computePointsPerMinute(500, undefined), 0);
  assert.equal(computePointsPerMinute(500, -10), 0);
});

test('buildLeaderboardEntry captures the run summary', () => {
  const built = buildLeaderboardEntry({
    score: 1200,
    genreSummary: { dominantGenre: 'dnb', isMixed: true },
    difficultyKey: 'chaos',
    durationSeconds: 120,
    timestamp: 1700000000000
  });

  assert.equal(built.score, 1200);
  assert.equal(built.genre, 'dnb');
  assert.equal(built.isMixedGenre, true);
  assert.equal(built.difficulty, 'chaos');
  assert.equal(built.durationSeconds, 120);
  assert.equal(built.pointsPerMinute, 600);
  assert.equal(built.timestamp, 1700000000000);
  assert.ok(built.id, 'entries need a stable id for future score syncing');
});

test('buildLeaderboardEntry falls back to unknown for a missing summary', () => {
  const built = buildLeaderboardEntry({
    score: 10,
    genreSummary: null,
    difficultyKey: undefined,
    durationSeconds: 5,
    timestamp: 1
  });

  assert.equal(built.genre, 'unknown');
  assert.equal(built.difficulty, 'unknown');
  assert.equal(built.isMixedGenre, false);
});

test('insertEntryRanked sorts by score descending and reports the rank', () => {
  const existing = [entry(900), entry(400)];
  const added = entry(600, 5);

  const { entries, rank } = insertEntryRanked(existing, added);

  assert.deepEqual(entries.map(e => e.score), [900, 600, 400]);
  assert.equal(rank, 2);
});

test('insertEntryRanked breaks ties in favour of the earlier run', () => {
  const existing = [entry(500, 100)];
  const added = entry(500, 200);

  const { entries, rank } = insertEntryRanked(existing, added);

  assert.deepEqual(entries.map(e => e.timestamp), [100, 200]);
  assert.equal(rank, 2);
});

test('insertEntryRanked caps the list and reports null when the entry misses the cut', () => {
  const existing = [entry(900), entry(800), entry(700)];
  const added = entry(100, 9);

  const { entries, rank } = insertEntryRanked(existing, added, 3);

  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map(e => e.score), [900, 800, 700]);
  assert.equal(rank, null);
});

test('insertEntryRanked evicts the lowest entry when the list is full', () => {
  const existing = [entry(900), entry(800), entry(100)];
  const added = entry(500, 9);

  const { entries, rank } = insertEntryRanked(existing, added, 3);

  assert.deepEqual(entries.map(e => e.score), [900, 800, 500]);
  assert.equal(rank, 3);
});

test('seedLeaderboardFromLegacyHighScore migrates an existing high score', () => {
  const seeded = seedLeaderboardFromLegacyHighScore(4200);

  assert.equal(seeded.length, 1);
  assert.equal(seeded[0].score, 4200);
  assert.equal(seeded[0].isLegacySeed, true);
  assert.equal(seeded[0].genre, 'unknown');
  assert.equal(seeded[0].durationSeconds, 0);
});

test('seedLeaderboardFromLegacyHighScore yields nothing without a prior score', () => {
  assert.deepEqual(seedLeaderboardFromLegacyHighScore(0), []);
  assert.deepEqual(seedLeaderboardFromLegacyHighScore(undefined), []);
});
