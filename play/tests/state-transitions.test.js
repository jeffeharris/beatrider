import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPauseTransition,
  applyResumeTransition,
  applyGameOverTransition,
  applyGameResetTransition,
  resolveTouchReleaseAction,
  recoverOffScreenPlayer
} from '../src/systems/main-scene/state-transitions.js';

test('pause and resume transitions toggle flow.paused', () => {
  const flow = { paused: false, gameOver: false, invincible: false, playerCanControl: true };
  applyPauseTransition(flow);
  assert.equal(flow.paused, true);
  applyResumeTransition(flow);
  assert.equal(flow.paused, false);
});

test('game over transition disables player control', () => {
  const flow = { paused: false, gameOver: false, invincible: false, playerCanControl: true };
  applyGameOverTransition(flow);
  assert.equal(flow.gameOver, true);
  assert.equal(flow.playerCanControl, false);
});

test('game reset transition restores canonical round-start state', () => {
  const slices = {
    player: { lane: -1, moving: true, dashing: true, jumping: true, crouching: true, charging: true, stretching: true },
    combat: { score: 999, combo: 8, beats: 123, rapidFire: true, rapidFireTimer: 4200, offScreenTimer: 200 },
    flow: { paused: false, gameOver: true, invincible: true, playerCanControl: false },
    input: { touchActive: true, touchFiring: true, currentZone: 'crouch', jumpChargeAmount: 0.75 }
  };
  applyGameResetTransition(slices);

  assert.equal(slices.player.lane, 2);
  assert.equal(slices.player.moving, false);
  assert.equal(slices.player.dashing, false);
  assert.equal(slices.player.jumping, false);
  assert.equal(slices.player.crouching, false);
  assert.equal(slices.player.charging, false);
  assert.equal(slices.player.stretching, false);
  assert.equal(slices.combat.score, 0);
  assert.equal(slices.combat.combo, 1);
  assert.equal(slices.combat.beats, 0);
  assert.equal(slices.combat.rapidFire, false);
  assert.equal(slices.combat.rapidFireTimer, 0);
  assert.equal(slices.flow.gameOver, false);
  assert.equal(slices.flow.playerCanControl, true);
  assert.equal(slices.input.touchFiring, false);
  assert.equal(slices.input.jumpChargeAmount, 0);
});

test('touch release resolver chooses jump type from charge', () => {
  const player = { lane: 2, moving: false, dashing: false, jumping: false, crouching: false, charging: true, stretching: false };
  const input = { touchActive: true, touchFiring: true, currentZone: 'crouch', jumpChargeAmount: 0.2 };
  assert.equal(resolveTouchReleaseAction({ player, input }), 'jump');
  input.jumpChargeAmount = 0.7;
  assert.equal(resolveTouchReleaseAction({ player, input }), 'super_jump');
  player.jumping = true;
  assert.equal(resolveTouchReleaseAction({ player, input }), null);
});

test('off-screen recovery clamps lane and clears off-screen timer', () => {
  const player = { lane: -1, moving: false, dashing: false, jumping: false, crouching: false, charging: false, stretching: false };
  const combat = { score: 0, combo: 1, beats: 0, rapidFire: false, rapidFireTimer: 0, offScreenTimer: 321 };
  assert.equal(recoverOffScreenPlayer({ player, combat, lanes: 5 }), true);
  assert.equal(player.lane, 0);
  assert.equal(combat.offScreenTimer, 0);
  player.lane = 2;
  combat.offScreenTimer = 77;
  assert.equal(recoverOffScreenPlayer({ player, combat, lanes: 5 }), false);
  assert.equal(combat.offScreenTimer, 77);
});
