import { gameSounds } from '../../audio/game-sounds.js';
import { MAIN_SCENE_ACTIONS, dispatchMainSceneAction } from './action-dispatch.js';

export function handleMobilePointerUp() {
  const player = this.stateSlices?.player;
  const input = this.stateSlices?.input;
  if (this.touchIndicator) {
    this.touchIndicator.setVisible(false);
    this.touchIndicator.setFillStyle(0x00ff00, 0.3);
  }

  if (this.zoneVisuals) {
    this.zoneVisuals.clear();
  }

  this.usingTimeBasedCharge = false;

  if ((player?.charging ?? this.isChargingJump) && (input?.jumpChargeAmount ?? this.jumpChargeAmount) > 0) {
    const chargePercent = input?.jumpChargeAmount ?? this.jumpChargeAmount;
    if (chargePercent > 0.3) {
      if (!(player?.jumping ?? this.isJumping)) {
        dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.SUPER_JUMP, { chargePercent, source: 'touch' });
      } else {
        this.queuedSuperJumpCharge = chargePercent;
      }
    } else if (!(player?.jumping ?? this.isJumping)) {
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.JUMP, { source: 'touch' });
    }

    this.chargeGlow.setVisible(false);

    try {
      gameSounds.jumpCharge.triggerRelease();
    } catch (e) {}
  }

  if (input) {
    input.touchActive = false;
    input.touchFiring = false;
    input.currentZone = 'center';
    input.jumpChargeAmount = 0;
  } else {
    this.touchZoneActive = false;
    this.isTouchFiring = false;
    this.currentZone = 'center';
    this.jumpChargeAmount = 0;
  }
  if (player) player.charging = false;
  else this.isChargingJump = false;
  this.maxPullDistance = 0;

  if (this.touchIndicator) {
    this.touchIndicator.setRadius(15);
  }
}
