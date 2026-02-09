import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginJumpState,
  finalizeJumpState,
  resolveLandingQueuedActions
} from '../src/systems/main-scene/jump-state.js';

test('beginJumpState prevents double-trigger while already jumping', () => {
  const player = { jumping: false };
  assert.equal(beginJumpState(player), true);
  assert.equal(player.jumping, true);
  assert.equal(beginJumpState(player), false);
  assert.equal(player.jumping, true);
});

test('finalizeJumpState clears jumping flag after landing', () => {
  const player = { jumping: true };
  finalizeJumpState(player);
  assert.equal(player.jumping, false);
});

test('resolveLandingQueuedActions starts queued crouch charge only in crouch zone', () => {
  const queued = resolveLandingQueuedActions({
    queuedCrouchOnLanding: true,
    currentZone: 'crouch',
    queuedSuperJumpCharge: 0
  });

  assert.equal(queued.shouldStartQueuedCharge, true);
  assert.equal(queued.nextQueuedCrouchOnLanding, false);
});

test('resolveLandingQueuedActions consumes queued super jump charge once', () => {
  const first = resolveLandingQueuedActions({
    queuedCrouchOnLanding: false,
    currentZone: 'center',
    queuedSuperJumpCharge: 0.65
  });

  assert.equal(first.queuedSuperJumpCharge, 0.65);
  assert.equal(first.nextQueuedSuperJumpCharge, 0);

  const second = resolveLandingQueuedActions({
    queuedCrouchOnLanding: false,
    currentZone: 'center',
    queuedSuperJumpCharge: first.nextQueuedSuperJumpCharge
  });

  assert.equal(second.queuedSuperJumpCharge, null);
  assert.equal(second.nextQueuedSuperJumpCharge, 0);
});
