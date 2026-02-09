export function beginJumpState(player) {
  if (player.jumping) return false;
  player.jumping = true;
  return true;
}

export function finalizeJumpState(player) {
  player.jumping = false;
}

export function resolveLandingQueuedActions({ queuedCrouchOnLanding, currentZone, queuedSuperJumpCharge }) {
  const shouldStartQueuedCharge = Boolean(queuedCrouchOnLanding && currentZone === 'crouch');
  const hasQueuedSuperJump = queuedSuperJumpCharge > 0;

  return {
    shouldStartQueuedCharge,
    nextQueuedCrouchOnLanding: shouldStartQueuedCharge ? false : queuedCrouchOnLanding,
    queuedSuperJumpCharge: hasQueuedSuperJump ? queuedSuperJumpCharge : null,
    nextQueuedSuperJumpCharge: hasQueuedSuperJump ? 0 : queuedSuperJumpCharge
  };
}
