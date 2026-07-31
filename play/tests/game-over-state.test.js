import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRecentDeath,
  buildSurvivalStats,
  getScoreBucket,
  resolveGameOverLayout,
  shouldEnableAdaptiveAssist
} from '../src/systems/main-scene/game-over-state.js';

const layout = (overrides = {}) => resolveGameOverLayout({
  screenRef: 400,
  beatHighScore: false,
  leaderboardHeight: 100,
  viewportHeight: 800,
  ...overrides
});

test('game-over layout keeps the restart countdown on screen', () => {
  // A short landscape viewport: centring the score block pushed the table and the
  // countdown below the bottom edge.
  const short = resolveGameOverLayout({
    screenRef: 493,
    beatHighScore: true,
    leaderboardHeight: 96,
    viewportHeight: 493
  });

  assert.ok(
    short.centerY + short.restartOffset <= 493,
    'restart text must fit within the viewport'
  );
  assert.ok(short.centerY < 493 / 2, 'the stack should shift up rather than overflow');
});

test('game-over layout stays centred when there is room', () => {
  assert.equal(layout().centerY, 400);
});

test('game-over layout orders its sections top to bottom', () => {
  const { statsOffset, leaderboardTitleOffset, leaderboardOffset, restartOffset } = layout();

  assert.ok(statsOffset < leaderboardTitleOffset);
  assert.ok(leaderboardTitleOffset < leaderboardOffset);
  assert.ok(leaderboardOffset < restartOffset);
});

test('a taller leaderboard pushes the countdown further down', () => {
  assert.ok(layout({ leaderboardHeight: 200 }).restartOffset > layout().restartOffset);
});

test('game-over layout never anchors the stack off the top edge', () => {
  // Absurdly tall content on a tiny viewport: clamping must not produce a negative top.
  const cramped = resolveGameOverLayout({
    screenRef: 300,
    beatHighScore: true,
    leaderboardHeight: 900,
    viewportHeight: 200
  });

  assert.ok(cramped.centerY - cramped.topOffset >= 0);
});

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
