import { gameSounds } from '../../audio/game-sounds.js';
import { MAIN_SCENE_ACTIONS, dispatchMainSceneAction } from './action-dispatch.js';

export function handleMobilePointerUp() {
  const { player, input } = this.stateSlices;
  if (this.touchIndicator) {
    this.touchIndicator.setVisible(false);
    this.touchIndicator.setFillStyle(0x00ff00, 0.3);
  }

  if (this.zoneVisuals) {
    this.zoneVisuals.clear();
  }

  this.usingTimeBasedCharge = false;

  if (player.charging && input.jumpChargeAmount > 0) {
    const chargePercent = input.jumpChargeAmount;
    if (chargePercent > 0.3) {
      if (!player.jumping) {
        dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.SUPER_JUMP, { chargePercent, source: 'touch' });
      } else {
        this.queuedSuperJumpCharge = chargePercent;
      }
    } else if (!player.jumping) {
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.JUMP, { source: 'touch' });
    }

    this.chargeGlow.setVisible(false);

    try {
      gameSounds.jumpCharge.triggerRelease();
    } catch (e) {}
  }

  input.touchActive = false;
  input.touchFiring = false;
  input.currentZone = 'center';
  input.jumpChargeAmount = 0;
  player.charging = false;
  this.maxPullDistance = 0;

  if (this.touchIndicator) {
    this.touchIndicator.setRadius(15);
  }
}
