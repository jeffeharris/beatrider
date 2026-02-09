import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, MAIN_SCENE_TUNING } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';
import { MAIN_SCENE_ACTIONS, dispatchMainSceneAction } from './action-dispatch.js';

export function handleMobilePointerMove(pointer) {
  const player = this.stateSlices?.player;
  const input = this.stateSlices?.input;
  if (!pointer.isDown || !(input?.touchActive ?? this.touchZoneActive)) return;

  if (this.touchIndicator && this.touchIndicator.visible) {
    this.touchIndicator.setPosition(pointer.x, pointer.y);
  }

  const currentTime = this.time.now;
  const dx = pointer.x - this.touchStartX;
  const dy = pointer.y - this.touchStartY;

  if ((player?.charging ?? this.isChargingJump) && !this.usingTimeBasedCharge) {
    const currentPullDistance = Math.max(0, dy);
    this.maxPullDistance = Math.max(this.maxPullDistance, currentPullDistance);

    const maxPullThreshold = this.zoneRadius * 2.25;
    const newCharge = Math.min(this.maxPullDistance / maxPullThreshold, 1.0);
    if (input) input.jumpChargeAmount = newCharge;
    else this.jumpChargeAmount = newCharge;

    this.chargeGlow.clear();
    this.chargeGlow.setPosition(this.player.x, this.player.y);

    const charge = input?.jumpChargeAmount ?? this.jumpChargeAmount;
    const pulseSpeed = 10 + charge * 20;
    const pulse = Math.sin(currentTime * pulseSpeed * 0.001) * 0.2 + 0.8;
    const glowRadius = 30 + charge * 50 * pulse;
    const glowAlpha = 0.3 + charge * 0.5 * pulse;

    const glowColor = charge < 0.3
      ? { r: 0, g: 136, b: 255 }
      : charge < 0.7
        ? { r: 255, g: 255, b: 0 }
        : { r: 255, g: 0, b: 255 };

    const hexColor = Phaser.Display.Color.GetColor(glowColor.r, glowColor.g, glowColor.b);

    this.chargeGlow.fillStyle(hexColor, glowAlpha);
    this.chargeGlow.fillCircle(0, 0, glowRadius);

    try {
      const pitchShift = 1 + charge * 2;
      gameSounds.jumpCharge.frequency.exponentialRampToValueAtTime(
        Tone.Frequency('C2').toFrequency() * pitchShift,
        Tone.now() + 0.05
      );
    } catch (e) {}

    if (this.touchIndicator) {
      const scale = 15 + charge * 20;
      this.touchIndicator.setRadius(scale);
      this.touchIndicator.setFillStyle(hexColor, 0.5 + charge * 0.3);
    }
  }

  let newZone = 'center';
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= this.zoneDeadRadius) {
    newZone = 'center';
  } else {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (angle >= -60 && angle < 60) {
      newZone = distance > this.zoneRadius ? 'rightDash' : 'rightMove';
    } else if (angle >= 60 && angle < 120) {
      newZone = 'crouch';
    } else if (angle >= -120 && angle < -60) {
      newZone = 'jump';
    } else {
      newZone = distance > this.zoneRadius ? 'leftDash' : 'leftMove';
    }
  }

  if (newZone !== (input?.currentZone ?? this.currentZone)) {
    if (this.touchIndicator) {
      switch (newZone) {
        case 'leftDash':
        case 'rightDash':
          this.touchIndicator.setFillStyle(0xff0000, 0.6);
          break;
        case 'leftMove':
        case 'rightMove':
          this.touchIndicator.setFillStyle(0xff8800, 0.5);
          break;
        case 'jump':
          this.touchIndicator.setFillStyle(0x00ff00, 0.5);
          break;
        case 'crouch':
          this.touchIndicator.setFillStyle(0x0088ff, 0.5);
          break;
        default:
          this.touchIndicator.setFillStyle(0x00aaff, 0.3);
      }
    }

    const timeSinceLastMove = currentTime - this.lastMoveTime;
    const canMove = !(player?.moving ?? this.isMoving) && !(player?.dashing ?? this.isDashing) && timeSinceLastMove > this.moveCooldown;
    const canDash = !(player?.dashing ?? this.isDashing);

    switch (newZone) {
      case 'leftMove':
        if (((input?.currentZone ?? this.currentZone) === 'center' || (input?.currentZone ?? this.currentZone) === 'jump') && canMove) {
          this.laneBeforeMove = player?.lane ?? this.playerLane;
          dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_LEFT, { source: 'touch' });
          this.lastMoveTime = currentTime;

          this.time.delayedCall(MAIN_SCENE_TUNING.touch.recenterDelayMs, () => {
            if (input?.touchActive ?? this.touchZoneActive) {
              const activePointer = this.input.activePointer;
              if (activePointer && activePointer.isDown) {
                const edgePadding = this.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
                this.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
                this.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);

                if (this.zoneVisuals) {
                  this.updateZoneVisuals();
                }
              }
            }
          });
        }
        break;

      case 'rightMove':
        if (((input?.currentZone ?? this.currentZone) === 'center' || (input?.currentZone ?? this.currentZone) === 'jump') && canMove) {
          this.laneBeforeMove = player?.lane ?? this.playerLane;
          dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_RIGHT, { source: 'touch' });
          this.lastMoveTime = currentTime;

          this.time.delayedCall(MAIN_SCENE_TUNING.touch.recenterDelayMs, () => {
            if (input?.touchActive ?? this.touchZoneActive) {
              const activePointer = this.input.activePointer;
              if (activePointer && activePointer.isDown) {
                const edgePadding = this.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
                this.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
                this.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);

                if (this.zoneVisuals) {
                  this.updateZoneVisuals();
                }
              }
            }
          });
        }
        break;

      case 'leftDash':
        if (canDash) {
          if (this.laneBeforeMove !== null && currentTime - this.lastMoveTime < MAIN_SCENE_TUNING.touch.dashFromMoveWindowMs) {
            this.tweens.killTweensOf(this.player);
            if (player) player.lane = this.laneBeforeMove;
            else this.playerLane = this.laneBeforeMove;
            this.player.x = this._laneX(player?.lane ?? this.playerLane);
            this.player.setScale(1, 1);
            this.laneBeforeMove = null;
            if (player) player.moving = false;
            else this.isMoving = false;
          }

          dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.DASH_LEFT, { source: 'touch' });
          this.lastMoveTime = currentTime;
        }
        break;

      case 'rightDash':
        if (canDash) {
          if (this.laneBeforeMove !== null && currentTime - this.lastMoveTime < MAIN_SCENE_TUNING.touch.dashFromMoveWindowMs) {
            this.tweens.killTweensOf(this.player);
            if (player) player.lane = this.laneBeforeMove;
            else this.playerLane = this.laneBeforeMove;
            this.player.x = this._laneX(player?.lane ?? this.playerLane);
            this.player.setScale(1, 1);
            this.laneBeforeMove = null;
            if (player) player.moving = false;
            else this.isMoving = false;
          }

          dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.DASH_RIGHT, { source: 'touch' });
          this.lastMoveTime = currentTime;
        }
        break;

      case 'jump':
        if ((input?.currentZone ?? this.currentZone) !== 'jump' && !(player?.jumping ?? this.isJumping) && !(player?.charging ?? this.isChargingJump)) {
          dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.JUMP, { source: 'touch' });
        }
        break;

      case 'crouch':
        if (!(player?.charging ?? this.isChargingJump)) {
          if (player?.jumping ?? this.isJumping) {
            this.queuedCrouchOnLanding = true;
          } else {
            if (player) player.charging = true;
            else this.isChargingJump = true;
            this.chargeGlow.setVisible(true);

            try {
              gameSounds.jumpCharge.triggerAttack('C2');
            } catch (e) {}
          }
        }
        break;
    }

    if ((input?.currentZone ?? this.currentZone) === 'crouch') {
      if (
        newZone === 'leftMove' || newZone === 'rightMove' ||
        newZone === 'leftDash' || newZone === 'rightDash'
      ) {
        if (player?.charging ?? this.isChargingJump) {
          if (player) player.charging = false;
          else this.isChargingJump = false;
          if (input) input.jumpChargeAmount = 0;
          else this.jumpChargeAmount = 0;
          this.maxPullDistance = 0;
          this.chargeGlow.setVisible(false);
        }
        this.queuedCrouchOnLanding = false;
        this.usingTimeBasedCharge = false;
        try {
          gameSounds.jumpCharge.triggerRelease();
        } catch (e) {}
      }
    }

    if (input) input.currentZone = newZone;
    else this.currentZone = newZone;
    this.zoneHoldTimer = 0;
  } else if ((input?.currentZone ?? this.currentZone) === 'leftMove' || (input?.currentZone ?? this.currentZone) === 'rightMove') {
    const now = this.time.now;
    this.zoneHoldTimer += now - (this.lastZoneCheckTime || now);

    const repeatThreshold = this.zoneHoldTimer > this.zoneRepeatDelay
      ? this.zoneRepeatRate
      : this.zoneRepeatDelay;

    const timeSinceLastMove = now - this.lastMoveTime;
    if (timeSinceLastMove > repeatThreshold && !(player?.moving ?? this.isMoving) && !(player?.dashing ?? this.isDashing)) {
      if ((input?.currentZone ?? this.currentZone) === 'leftMove') {
        dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_LEFT, { source: 'touch' });
      } else {
        dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_RIGHT, { source: 'touch' });
      }
      this.lastMoveTime = now;
    }
  }

  this.lastZoneCheckTime = this.time.now;
}
