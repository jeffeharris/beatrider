import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEADERBOARD_VARIANTS,
  abbreviateNumber,
  formatDuration,
  formatDifficulty,
  formatGenre,
  formatLeaderboardHeader,
  formatLeaderboardRow
} from '../src/leaderboard/leaderboard-format.js';

const run = (overrides = {}) => ({
  score: 4820,
  genre: 'techno',
  isMixedGenre: false,
  difficulty: 'normal',
  durationSeconds: 134,
  pointsPerMinute: 2158,
  timestamp: 1700000000000,
  ...overrides
});

test('formatDuration renders m:ss', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(9), '0:09');
  assert.equal(formatDuration(60), '1:00');
  assert.equal(formatDuration(134), '2:14');
  assert.equal(formatDuration(3661), '61:01');
});

test('formatGenre uses codes when compact and labels when long', () => {
  assert.equal(formatGenre(run({ genre: 'dnb' })), 'DNB');
  assert.equal(formatGenre(run({ genre: 'dnb' }), { long: true }), 'D&B');
});

test('a mixed run is labelled as mixed rather than by its dominant genre', () => {
  const mixed = run({ genre: 'techno', isMixedGenre: true });

  assert.equal(formatGenre(mixed), 'MIX');
  assert.equal(formatGenre(mixed, { long: true }), 'MIXED');
});

test('unknown genre and difficulty render as an em dash', () => {
  const legacy = run({ genre: 'unknown', difficulty: 'unknown' });

  assert.equal(formatGenre(legacy), '—');
  assert.equal(formatDifficulty(legacy), '—');
});

test('every column is padded to its declared width', () => {
  Object.entries(LEADERBOARD_VARIANTS).forEach(([name, variant]) => {
    const expectedWidth = variant.columns.reduce((total, column) => total + column.width, 0)
      + (variant.columns.length - 1);

    assert.equal(
      formatLeaderboardHeader(variant).length,
      expectedWidth,
      `${name} header width`
    );
    assert.equal(
      formatLeaderboardRow(run(), 1, variant).length,
      expectedWidth,
      `${name} row width`
    );
  });
});

test('rows stay aligned when values are unusually wide or narrow', () => {
  const variant = LEADERBOARD_VARIANTS.compact;
  const baseline = formatLeaderboardRow(run(), 1, variant).length;

  const extremes = [
    formatLeaderboardRow(run({ score: 999999, pointsPerMinute: 99999 }), 10, variant),
    formatLeaderboardRow(run({ score: 0, durationSeconds: 0, pointsPerMinute: 0 }), 1, variant),
    formatLeaderboardRow(run({ genre: 'unknown', difficulty: 'unknown' }), 5, variant, true)
  ];

  extremes.forEach(row => assert.equal(row.length, baseline));
});

test('the highlighted row is marked and stays within the rank column', () => {
  const variant = LEADERBOARD_VARIANTS.compact;
  const highlighted = formatLeaderboardRow(run(), 3, variant, true);
  const plain = formatLeaderboardRow(run(), 3, variant, false);

  assert.ok(highlighted.includes('>3'));
  assert.ok(!plain.includes('>'));
  assert.equal(highlighted.length, plain.length);
});

test('abbreviateNumber leaves values that already fit alone', () => {
  assert.equal(abbreviateNumber(0, 5), '0');
  assert.equal(abbreviateNumber(4820, 5), '4820');
  assert.equal(abbreviateNumber(99999, 5), '99999');
});

test('abbreviateNumber uses magnitude suffixes rather than truncating', () => {
  // A one-second run scores 289200 pts/min. Slicing that to '28920' would display a
  // different, wrong number - the failure this replaced.
  assert.equal(abbreviateNumber(289200, 5), '289k');
  assert.equal(abbreviateNumber(1234567, 6), '1235k');
  assert.equal(abbreviateNumber(5000000000, 4), '5b');
});

test('an implausibly fast run still renders a correct, in-width rate', () => {
  const variant = LEADERBOARD_VARIANTS.compact;
  const sprint = run({ score: 4820, durationSeconds: 1, pointsPerMinute: 289200 });
  const row = formatLeaderboardRow(sprint, 1, variant);

  assert.ok(row.includes('289k'));
  assert.ok(!row.includes('28920 '), 'must not silently truncate to a wrong number');
  assert.equal(row.length, formatLeaderboardRow(run(), 1, variant).length);
});

test('the compact variant fits the narrowest supported viewport', () => {
  // 320px-wide phone: game-over uses a 9px monospace font, ~5.4px per glyph.
  const width = formatLeaderboardHeader(LEADERBOARD_VARIANTS.compact).length;
  assert.ok(width * 5.4 < 320, `compact table is ${width} chars, too wide for a 320px screen`);
});
