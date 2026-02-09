import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPoints,
  resolveComboForChain,
  resolveComboFromWindow,
  updateMaxComboReached
} from '../src/systems/main-scene/score-combo-state.js';

test('resolveComboFromWindow increments when inside combo window', () => {
  const combo = resolveComboFromWindow({
    currentCombo: 2,
    nowMs: 1200,
    lastKillTimeMs: 500,
    comboWindowMs: 1000,
    maxCombo: 8
  });
  assert.equal(combo, 3);
});

test('resolveComboFromWindow resets when outside combo window', () => {
  const combo = resolveComboFromWindow({
    currentCombo: 6,
    nowMs: 3000,
    lastKillTimeMs: 500,
    comboWindowMs: 1000,
    maxCombo: 8
  });
  assert.equal(combo, 1);
});

test('resolveComboForChain always increments and respects cap', () => {
  assert.equal(resolveComboForChain({ currentCombo: 1, maxCombo: 8 }), 2);
  assert.equal(resolveComboForChain({ currentCombo: 8, maxCombo: 8 }), 8);
});

test('applyPoints returns awarded points and updated score', () => {
  const result = applyPoints({ currentScore: 100, basePoints: 25, comboMultiplier: 3 });
  assert.equal(result.pointsAwarded, 75);
  assert.equal(result.nextScore, 175);
});

test('updateMaxComboReached tracks highest combo seen', () => {
  assert.equal(updateMaxComboReached({ currentMaxComboReached: 4, combo: 3 }), 4);
  assert.equal(updateMaxComboReached({ currentMaxComboReached: 4, combo: 6 }), 6);
});
