import { gameState } from '../../config.js';
import { savedData } from '../../storage.js';
import { handleMobilePointerDown } from './mobile-controls-pointer-down.js';
import { handleMobilePointerMove } from './mobile-controls-pointer-move.js';
import { handleMobilePointerUp } from './mobile-controls-pointer-up.js';

export function setupMobileControlsSystem() {
  this.touchStartX = 0;
  this.touchStartY = 0;
  this.touchZoneActive = false;
  this.isTouchFiring = false;

  this.zoneRadius = 100;
  this.zoneDeadRadius = savedData.settings?.touchSensitivity || 30;

  this.currentZone = 'center';
  this.lastMoveTime = 0;
  this.moveCooldown = 150;
  this.laneBeforeMove = null;
  this.zoneHoldTimer = 0;
  this.zoneRepeatDelay = 300;
  this.zoneRepeatRate = 150;
  this.lastZoneCheckTime = 0;

  this.jumpChargeAmount = 0;
  this.maxPullDistance = 0;
  this.isChargingJump = false;
  this.jumpThreshold = 40;

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
