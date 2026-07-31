import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGenreAttributionState,
  recordGenreSwitch,
  summarizeGenreAttribution
} from '../src/leaderboard/genre-attribution.js';

test('a single-genre run is not mixed', () => {
  const state = createGenreAttributionState('techno');
  const summary = summarizeGenreAttribution(state, { elapsedMs: 90000 });

  assert.equal(summary.dominantGenre, 'techno');
  assert.equal(summary.isMixed, false);
  assert.equal(summary.breakdownMs.techno, 90000);
});

test('recordGenreSwitch is a no-op when the genre has not changed', () => {
  const state = createGenreAttributionState('techno');
  const next = recordGenreSwitch(state, { genre: 'techno', elapsedMs: 5000 });

  assert.equal(next, state, 'polling the same genre every frame must not allocate');
});

test('dominant genre is the one played longest, not the one played last', () => {
  let state = createGenreAttributionState('techno');
  state = recordGenreSwitch(state, { genre: 'dnb', elapsedMs: 80000 });

  const summary = summarizeGenreAttribution(state, { elapsedMs: 100000 });

  assert.equal(summary.dominantGenre, 'techno');
  assert.equal(summary.isMixed, true);
  assert.equal(summary.breakdownMs.techno, 80000);
  assert.equal(summary.breakdownMs.dnb, 20000);
});

test('time in a genre accumulates across separate visits', () => {
  let state = createGenreAttributionState('techno');
  state = recordGenreSwitch(state, { genre: 'trance', elapsedMs: 10000 });
  state = recordGenreSwitch(state, { genre: 'techno', elapsedMs: 40000 });

  const summary = summarizeGenreAttribution(state, { elapsedMs: 50000 });

  assert.equal(summary.breakdownMs.techno, 20000); // 0-10s plus 40-50s
  assert.equal(summary.breakdownMs.trance, 30000);
  assert.equal(summary.dominantGenre, 'trance');
});

test('genres switched through without elapsed time do not make a run mixed', () => {
  let state = createGenreAttributionState('techno');
  state = recordGenreSwitch(state, { genre: 'dnb', elapsedMs: 0 });
  state = recordGenreSwitch(state, { genre: 'techno', elapsedMs: 0 });

  const summary = summarizeGenreAttribution(state, { elapsedMs: 60000 });

  assert.equal(summary.isMixed, false);
  assert.equal(summary.dominantGenre, 'techno');
});

test('paused time is excluded because elapsed play time is what advances', () => {
  // resumeGameSystem() shifts gameStartTime by the pause duration, so elapsed play time
  // simply stops advancing while paused. A switch made either side of a pause must
  // therefore attribute only real play time.
  let state = createGenreAttributionState('techno');
  state = recordGenreSwitch(state, { genre: 'dnb', elapsedMs: 30000 });

  // 60s of wall clock passes while paused; elapsed play time is unchanged at 30s.
  const summary = summarizeGenreAttribution(state, { elapsedMs: 45000 });

  assert.equal(summary.breakdownMs.techno, 30000);
  assert.equal(summary.breakdownMs.dnb, 15000);
});

test('a switch cannot start a segment before the one it follows', () => {
  let state = createGenreAttributionState('techno');
  state = recordGenreSwitch(state, { genre: 'dnb', elapsedMs: 30000 });
  state = recordGenreSwitch(state, { genre: 'trance', elapsedMs: 10000 });

  const summary = summarizeGenreAttribution(state, { elapsedMs: 40000 });

  assert.ok(Object.values(summary.breakdownMs).every(ms => ms >= 0));
  assert.equal(summary.breakdownMs.dnb, 0);
});

test('summarizing an empty or missing state is safe', () => {
  const summary = summarizeGenreAttribution(null, { elapsedMs: 1000 });

  assert.equal(summary.dominantGenre, 'unknown');
  assert.equal(summary.isMixed, false);
});
