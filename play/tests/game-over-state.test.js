import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRecentDeath,
  buildSurvivalStats,
  getScoreBucket,
  shouldEnableAdaptiveAssist
} from '../src/systems/main-scene/game-over-state.js';

test('getScoreBucket maps score ranges consistently', () => {
  assert.equal(getScoreBucket(0), '0-99');
  assert.equal(getScoreBucket(150), '100-499');
  assert.equal(getScoreBucket(900), '500-999');
  assert.equal(getScoreBucket(1200), '1000-2499');
  assert.equal(getScoreBucket(3000), '2500-4999');
  assert.equal(getScoreBucket(5000), '5000+');
});

test('buildSurvivalStats formats time and points-per-second', () => {
  const stats = buildSurvivalStats({
    nowMs: 65000,
    gameStartTimeMs: 5000,
    score: 600
  });

  assert.equal(stats.survivalSeconds, 60);
  assert.equal(stats.survivalTimeString, '1:00');
  assert.equal(stats.pointsPerSecond, '10.0');
});

test('appendRecentDeath keeps only latest entries', () => {
  let deaths = [];
  deaths = appendRecentDeath(deaths, 100, 3);
  deaths = appendRecentDeath(deaths, 200, 3);
  deaths = appendRecentDeath(deaths, 300, 3);
  deaths = appendRecentDeath(deaths, 400, 3);

  assert.equal(deaths.length, 3);
  assert.deepEqual(deaths.map(d => d.score), [200, 300, 400]);
});

test('shouldEnableAdaptiveAssist requires three low-score deaths', () => {
  const lowDeaths = [{ score: 100 }, { score: 500 }, { score: 900 }];
  const mixedDeaths = [{ score: 100 }, { score: 1200 }, { score: 400 }];

  assert.equal(shouldEnableAdaptiveAssist(lowDeaths), true);
  assert.equal(shouldEnableAdaptiveAssist(mixedDeaths), false);
  assert.equal(shouldEnableAdaptiveAssist([{ score: 1 }, { score: 2 }]), false);
});
