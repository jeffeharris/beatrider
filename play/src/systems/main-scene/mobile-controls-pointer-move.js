import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function handleMobilePointerMove(pointer) {
  if (!pointer.isDown || !this.touchZoneActive) return;

  if (this.touchIndicator && this.touchIndicator.visible) {
    this.touchIndicator.setPosition(pointer.x, pointer.y);
  }

  const currentTime = this.time.now;
  const dx = pointer.x - this.touchStartX;
  const dy = pointer.y - this.touchStartY;

  if (this.isChargingJump && !this.usingTimeBasedCharge) {
    const currentPullDistance = Math.max(0, dy);
    this.maxPullDistance = Math.max(this.maxPullDistance, currentPullDistance);

    const maxPullThreshold = this.zoneRadius * 2.25;
    this.jumpChargeAmount = Math.min(this.maxPullDistance / maxPullThreshold, 1.0);

    this.chargeGlow.clear();
    this.chargeGlow.setPosition(this.player.x, this.player.y);

    const pulseSpeed = 10 + this.jumpChargeAmount * 20;
    const pulse = Math.sin(currentTime * pulseSpeed * 0.001) * 0.2 + 0.8;
    const glowRadius = 30 + this.jumpChargeAmount * 50 * pulse;
    const glowAlpha = 0.3 + this.jumpChargeAmount * 0.5 * pulse;

    const glowColor = this.jumpChargeAmount < 0.3
      ? { r: 0, g: 136, b: 255 }
      : this.jumpChargeAmount < 0.7
        ? { r: 255, g: 255, b: 0 }
        : { r: 255, g: 0, b: 255 };

    const hexColor = Phaser.Display.Color.GetColor(glowColor.r, glowColor.g, glowColor.b);

    this.chargeGlow.fillStyle(hexColor, glowAlpha);
    this.chargeGlow.fillCircle(0, 0, glowRadius);

    try {
      const pitchShift = 1 + this.jumpChargeAmount * 2;
      gameSounds.jumpCharge.frequency.exponentialRampToValueAtTime(
        Tone.Frequency('C2').toFrequency() * pitchShift,
        Tone.now() + 0.05
      );
    } catch (e) {}

    if (this.touchIndicator) {
      const scale = 15 + this.jumpChargeAmount * 20;
      this.touchIndicator.setRadius(scale);
      this.touchIndicator.setFillStyle(hexColor, 0.5 + this.jumpChargeAmount * 0.3);
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

  if (newZone !== this.currentZone) {
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
    const canMove = !this.isMoving && !this.isDashing && timeSinceLastMove > this.moveCooldown;
    const canDash = !this.isDashing;

    switch (newZone) {
      case 'leftMove':
        if ((this.currentZone === 'center' || this.currentZone === 'jump') && canMove) {
          this.laneBeforeMove = this.playerLane;
          this.moveLeft();
          this.lastMoveTime = currentTime;

          this.time.delayedCall(150, () => {
            if (this.touchZoneActive) {
              const activePointer = this.input.activePointer;
              if (activePointer && activePointer.isDown) {
                const edgePadding = this.zoneRadius * 0.7;
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
        if ((this.currentZone === 'center' || this.currentZone === 'jump') && canMove) {
          this.laneBeforeMove = this.playerLane;
          this.moveRight();
          this.lastMoveTime = currentTime;

          this.time.delayedCall(150, () => {
            if (this.touchZoneActive) {
              const activePointer = this.input.activePointer;
              if (activePointer && activePointer.isDown) {
                const edgePadding = this.zoneRadius * 0.7;
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
          if (this.laneBeforeMove !== null && currentTime - this.lastMoveTime < 250) {
            this.tweens.killTweensOf(this.player);
            this.playerLane = this.laneBeforeMove;
            this.player.x = this._laneX(this.playerLane);
            this.player.setScale(1, 1);
            this.laneBeforeMove = null;
            this.isMoving = false;
          }

          this.dashLeft();
          this.lastMoveTime = currentTime;
        }
        break;

      case 'rightDash':
        if (canDash) {
          if (this.laneBeforeMove !== null && currentTime - this.lastMoveTime < 250) {
            this.tweens.killTweensOf(this.player);
            this.playerLane = this.laneBeforeMove;
            this.player.x = this._laneX(this.playerLane);
            this.player.setScale(1, 1);
            this.laneBeforeMove = null;
            this.isMoving = false;
          }

          this.dashRight();
          this.lastMoveTime = currentTime;
        }
        break;

      case 'jump':
        if (this.currentZone !== 'jump' && !this.isJumping && !this.isChargingJump) {
          this.jump();
        }
        break;

      case 'crouch':
        if (!this.isChargingJump) {
          if (this.isJumping) {
            this.queuedCrouchOnLanding = true;
          } else {
            this.isChargingJump = true;
            this.chargeGlow.setVisible(true);

            try {
              gameSounds.jumpCharge.triggerAttack('C2');
            } catch (e) {}
          }
        }
        break;
    }

    if (this.currentZone === 'crouch') {
      if (
        newZone === 'leftMove' || newZone === 'rightMove' ||
        newZone === 'leftDash' || newZone === 'rightDash'
      ) {
        if (this.isChargingJump) {
          this.isChargingJump = false;
          this.jumpChargeAmount = 0;
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

    this.currentZone = newZone;
    this.zoneHoldTimer = 0;
  } else if (this.currentZone === 'leftMove' || this.currentZone === 'rightMove') {
    const now = this.time.now;
    this.zoneHoldTimer += now - (this.lastZoneCheckTime || now);

    const repeatThreshold = this.zoneHoldTimer > this.zoneRepeatDelay
      ? this.zoneRepeatRate
      : this.zoneRepeatDelay;

    const timeSinceLastMove = now - this.lastMoveTime;
    if (timeSinceLastMove > repeatThreshold && !this.isMoving && !this.isDashing) {
      if (this.currentZone === 'leftMove') {
        this.moveLeft();
      } else {
        this.moveRight();
      }
      this.lastMoveTime = now;
    }
  }

  this.lastZoneCheckTime = this.time.now;
}
