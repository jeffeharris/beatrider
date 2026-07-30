function createSilentSound() {
  const noop = () => {};
  return {
    triggerAttackRelease: noop,
    triggerAttack: noop,
    triggerRelease: noop,
    frequency: {
      rampTo: noop,
      exponentialRampToValueAtTime: noop
    }
  };
}

export function createSilentGameSounds(savedData) {
  return {
    move: createSilentSound(),
    offScreenWomp: createSilentSound(),
    jumpCharge: createSilentSound(),
    laserSounds: Array.from({ length: 6 }, createSilentSound),
    currentLaserSound: savedData.settings?.laserSound || 0,
    explosion: createSilentSound(),
    enemyDestroy: createSilentSound(),
    obstacleHit: createSilentSound(),
    powerUp: createSilentSound()
  };
}
