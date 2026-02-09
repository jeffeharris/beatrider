import { MAIN_SCENE_TUNING } from '../../config.js';
import { savedData } from '../../storage.js';
import { handleMobilePointerDown } from './mobile-controls-pointer-down.js';
import { handleMobilePointerMove } from './mobile-controls-pointer-move.js';
import { handleMobilePointerUp } from './mobile-controls-pointer-up.js';

export function setupMobileControlsSystem() {
  const { player, input } = this.stateSlices;
  this.touchStartX = 0;
  this.touchStartY = 0;
  input.touchActive = false;
  input.touchFiring = false;

  this.zoneRadius = MAIN_SCENE_TUNING.touch.zoneRadiusPx;
  this.zoneDeadRadius = savedData.settings?.touchSensitivity || MAIN_SCENE_TUNING.touch.defaultDeadZonePx;

  input.currentZone = 'center';
  this.lastMoveTime = 0;
  this.moveCooldown = MAIN_SCENE_TUNING.touch.moveCooldownMs;
  this.laneBeforeMove = null;
  this.zoneHoldTimer = 0;
  this.zoneRepeatDelay = MAIN_SCENE_TUNING.touch.zoneRepeatDelayMs;
  this.zoneRepeatRate = MAIN_SCENE_TUNING.touch.zoneRepeatRateMs;
  this.lastZoneCheckTime = 0;

  input.jumpChargeAmount = 0;
  this.maxPullDistance = 0;
  player.charging = false;
  this.jumpThreshold = MAIN_SCENE_TUNING.touch.jumpThresholdPx;

  this.touchIndicator = this.add.circle(0, 0, 15, 0x00ff00, 0.3);
  this.touchIndicator.setVisible(false);

  this.zoneVisuals = this.add.graphics();
  this.zoneVisuals.setDepth(1000);

  this.input.on('pointerdown', pointer => {
    handleMobilePointerDown.call(this, pointer);
  });

  this.input.on('pointermove', pointer => {
    handleMobilePointerMove.call(this, pointer);
  });

  this.input.on('pointerup', () => {
    handleMobilePointerUp.call(this);
  });
}
