import Phaser from 'phaser';
import { gameState, MAIN_SCENE_TUNING } from '../../config.js';

export function handleMobilePointerDown(pointer) {
  const edgePadding = this.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
  this.touchStartX = Phaser.Math.Clamp(pointer.x, edgePadding, gameState.WIDTH - edgePadding);
  this.touchStartY = Phaser.Math.Clamp(pointer.y, edgePadding, gameState.HEIGHT - edgePadding);
  this.touchZoneActive = true;

  this.currentZone = 'center';
  this.isChargingJump = false;
  this.jumpChargeAmount = 0;
  this.maxPullDistance = 0;
  this.queuedCrouchOnLanding = false;
  this.usingTimeBasedCharge = false;

  this.touchIndicator.setPosition(this.touchStartX, this.touchStartY);
  this.touchIndicator.setVisible(true);
  this.touchIndicator.setAlpha(0.5);

  this.isTouchFiring = true;

  const dx = pointer.x - this.touchStartX;
  const dy = pointer.y - this.touchStartY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > this.zoneDeadRadius) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    let startZone = 'center';

    if (angle >= -60 && angle < 60) {
      startZone = distance > this.zoneRadius ? 'rightDash' : 'rightMove';
    } else if (angle >= 60 && angle < 120) {
      startZone = 'crouch';
    } else if (angle >= -120 && angle < -60) {
      startZone = 'jump';
    } else {
      startZone = distance > this.zoneRadius ? 'leftDash' : 'leftMove';
    }

    if (startZone === 'leftMove' || startZone === 'rightMove') {
      if (startZone === 'leftMove') {
        this.moveLeft();
      } else {
        this.moveRight();
      }
      this.lastMoveTime = this.time.now;
      this.currentZone = startZone;
    }
  }

  if (this.zoneVisuals) {
    this.updateZoneVisuals();
  }
}
