function bindAliasSlice(scene, fields) {
  const slice = {};
  for (const [alias, field] of Object.entries(fields)) {
    Object.defineProperty(slice, alias, {
      enumerable: true,
      get() {
        return scene[field];
      },
      set(value) {
        scene[field] = value;
      }
    });
  }
  return slice;
}

export function initializeMainSceneStateSlices() {
  this.stateSlices = {
    player: bindAliasSlice(this, {
      lane: 'playerLane',
      moving: 'isMoving',
      dashing: 'isDashing',
      jumping: 'isJumping',
      crouching: 'isCrouching',
      charging: 'isChargingJump',
      stretching: 'isStretching'
    }),
    combat: bindAliasSlice(this, {
      score: 'score',
      combo: 'combo',
      beats: 'beats',
      rapidFire: 'rapidFire',
      rapidFireTimer: 'rapidFireTimer',
      offScreenTimer: 'offScreenTimer'
    }),
    flow: bindAliasSlice(this, {
      paused: 'isPaused',
      gameOver: 'isShowingGameOver',
      invincible: 'isInvincible',
      playerCanControl: 'playerCanControl'
    }),
    input: bindAliasSlice(this, {
      touchActive: 'touchZoneActive',
      touchFiring: 'isTouchFiring',
      currentZone: 'currentZone',
      jumpChargeAmount: 'jumpChargeAmount'
    })
  };
}
