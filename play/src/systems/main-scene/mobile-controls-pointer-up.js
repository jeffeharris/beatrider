import { gameSounds } from '../../audio/game-sounds.js';

export function handleMobilePointerUp() {
  if (this.touchIndicator) {
    this.touchIndicator.setVisible(false);
    this.touchIndicator.setFillStyle(0x00ff00, 0.3);
  }

  if (this.zoneVisuals) {
    this.zoneVisuals.clear();
  }

  this.usingTimeBasedCharge = false;

  if (this.isChargingJump && this.jumpChargeAmount > 0) {
    const chargePercent = this.jumpChargeAmount;
    if (chargePercent > 0.3) {
      if (!this.isJumping) {
        this.superJump(chargePercent);
      } else {
        this.queuedSuperJumpCharge = chargePercent;
      }
    } else if (!this.isJumping) {
      this.jump();
    }

    this.chargeGlow.setVisible(false);

    try {
      gameSounds.jumpCharge.triggerRelease();
    } catch (e) {}
  }

  this.touchZoneActive = false;
  this.isTouchFiring = false;
  this.currentZone = 'center';
  this.isChargingJump = false;
  this.jumpChargeAmount = 0;
  this.maxPullDistance = 0;

  if (this.touchIndicator) {
    this.touchIndicator.setRadius(15);
  }
}
