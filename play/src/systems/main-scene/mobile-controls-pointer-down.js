import Phaser from 'phaser';
import { gameState, MAIN_SCENE_TUNING } from '../../config.js';
import { MAIN_SCENE_ACTIONS, dispatchMainSceneAction } from './action-dispatch.js';

export function handleMobilePointerDown(pointer) {
  const player = this.stateSlices?.player;
  const input = this.stateSlices?.input;
  const edgePadding = this.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
  this.touchStartX = Phaser.Math.Clamp(pointer.x, edgePadding, gameState.WIDTH - edgePadding);
  this.touchStartY = Phaser.Math.Clamp(pointer.y, edgePadding, gameState.HEIGHT - edgePadding);
  if (input) input.touchActive = true;
  else this.touchZoneActive = true;

  if (input) {
    input.currentZone = 'center';
    input.jumpChargeAmount = 0;
  } else {
    this.currentZone = 'center';
    this.jumpChargeAmount = 0;
  }
  if (player) player.charging = false;
  else this.isChargingJump = false;
  this.maxPullDistance = 0;
  this.queuedCrouchOnLanding = false;
  this.usingTimeBasedCharge = false;

  this.touchIndicator.setPosition(this.touchStartX, this.touchStartY);
  this.touchIndicator.setVisible(true);
  this.touchIndicator.setAlpha(0.5);

  if (input) input.touchFiring = true;
  else this.isTouchFiring = true;

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
        dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_LEFT, { source: 'touch' });
      } else {
        dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_RIGHT, { source: 'touch' });
      }
      this.lastMoveTime = this.time.now;
      if (input) input.currentZone = startZone;
      else this.currentZone = startZone;
    }
  }

  if (this.zoneVisuals) {
    this.updateZoneVisuals();
  }
}
