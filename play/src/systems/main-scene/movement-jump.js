import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, MAIN_SCENE_TUNING } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';
import { beginJumpState, finalizeJumpState, resolveLandingQueuedActions } from './jump-state.js';

function resetPlayerRotation(scene) {
  if (Math.abs(scene.player.angle % 360) > 1) {
    scene.tweens.add({
      targets: scene.player,
      angle: 0,
      duration: 200,
      ease: 'Cubic.easeOut'
    });
  } else {
    scene.player.angle = 0;
  }
}

function refreshTouchChargeAnchor(scene) {
  const activePointer = scene.input.activePointer;
  if (!activePointer || !activePointer.isDown) return;

  const edgePadding = scene.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
  scene.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
  scene.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);
}

function startQueuedTouchCharge(scene, player, input) {
  player.charging = true;
  scene.chargeGlow.setVisible(true);

  scene.touchChargeStartTime = scene.time.now;
  scene.usingTimeBasedCharge = true;
  input.jumpChargeAmount = 0;
  scene.maxPullDistance = 0;

  try {
    gameSounds.jumpCharge.triggerAttack('C2');
  } catch (e) {}

  refreshTouchChargeAnchor(scene);

  scene.tweens.add({
    targets: scene.player,
    scaleX: MAIN_SCENE_TUNING.jump.queuedCrouchScaleX,
    scaleY: MAIN_SCENE_TUNING.jump.queuedCrouchScaleY,
    duration: MAIN_SCENE_TUNING.jump.queuedCrouchDurationMs,
    ease: 'Power2'
  });
}

function finalizeLanding(scene, player, input) {
  finalizeJumpState(player);
  scene.player.y = gameState.PLAYER_Y;
  resetPlayerRotation(scene);

  const queued = resolveLandingQueuedActions({
    queuedCrouchOnLanding: scene.queuedCrouchOnLanding,
    currentZone: input.currentZone,
    queuedSuperJumpCharge: scene.queuedSuperJumpCharge
  });

  scene.queuedCrouchOnLanding = queued.nextQueuedCrouchOnLanding;
  scene.queuedSuperJumpCharge = queued.nextQueuedSuperJumpCharge;

  if (queued.shouldStartQueuedCharge) {
    startQueuedTouchCharge(scene, player, input);
  }

  if (queued.queuedSuperJumpCharge !== null) {
    scene.time.delayedCall(MAIN_SCENE_TUNING.jump.queuedSuperJumpDelayMs, () => {
      scene.superJump(queued.queuedSuperJumpCharge);
    });
  }
}

function playRegularJumpSound() {
  try {
    const now = Tone.now();
    gameSounds.move.triggerAttackRelease('C6', '16n', now);
    gameSounds.move.triggerAttackRelease('G6', '16n', now + 0.05);
  } catch (e) {}
}

function spawnSuperJumpParticles(scene, normalizedCharge) {
  const particleConfig = MAIN_SCENE_TUNING.jump.super.particles;
  if (normalizedCharge <= particleConfig.activeThreshold) return;

  const particleCount = Math.floor(particleConfig.baseCount + normalizedCharge * particleConfig.perChargeCount);
  const speed = particleConfig.baseSpeed + normalizedCharge * particleConfig.perChargeSpeed;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const particle = scene.add.graphics();
    particle.x = scene.player.x;
    particle.y = scene.player.y;

    const particleColor = normalizedCharge > particleConfig.highChargeThreshold
      ? particleConfig.highColor
      : particleConfig.lowColor;

    particle.fillStyle(particleColor, 1);
    particle.fillCircle(0, 0, particleConfig.radiusPx);

    scene.tweens.add({
      targets: particle,
      x: particle.x + Math.cos(angle) * speed,
      y: particle.y + (Math.sin(angle) * speed) / 2,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        particle.destroy();
      }
    });
  }

  if (normalizedCharge > particleConfig.highChargeThreshold) {
    scene.cameras.main.shake(
      particleConfig.shakeDurationMs,
      particleConfig.shakeBaseIntensity + normalizedCharge * particleConfig.shakePerChargeIntensity
    );
  }
}

function playSuperJumpSound(normalizedCharge) {
  try {
    const now = Tone.now();

    gameSounds.powerUp.triggerAttackRelease('C3', '8n', now);

    if (normalizedCharge > 0.3) {
      gameSounds.powerUp.triggerAttackRelease('G3', '8n', now + 0.02);
      gameSounds.move.triggerAttackRelease('C6', '16n', now);
    }
    if (normalizedCharge > 0.5) {
      gameSounds.powerUp.triggerAttackRelease('E4', '16n', now + 0.05);
      gameSounds.move.triggerAttackRelease('G6', '16n', now + 0.08);
    }
    if (normalizedCharge > 0.7) {
      gameSounds.powerUp.triggerAttackRelease('C5', '32n', now + 0.1);
      gameSounds.move.triggerAttackRelease('E7', '32n', now + 0.12);
      gameSounds.offScreenWomp.triggerAttackRelease('C1', '16n', now);
    }
  } catch (e) {}
}

export function jumpSystem() {
  const { player, input } = this.stateSlices;
  if (!beginJumpState(player)) return;

  const jumpConfig = MAIN_SCENE_TUNING.jump.regular;

  this.tweens.add({
    targets: this.player,
    y: gameState.PLAYER_Y - jumpConfig.heightPx,
    scaleX: jumpConfig.scaleX,
    scaleY: jumpConfig.scaleY,
    duration: jumpConfig.durationMs,
    ease: 'Quad.easeOut',
    yoyo: true,
    onComplete: () => {
      finalizeLanding(this, player, input);
    }
  });

  this.jumpSpinTween = this.tweens.add({
    targets: this.player,
    angle: jumpConfig.spinAngle,
    duration: jumpConfig.durationMs * 2,
    ease: 'Linear'
  });

  playRegularJumpSound();
}

export function superJumpSystem(chargePercent = 1.0) {
  const { player, input } = this.stateSlices;
  if (!beginJumpState(player)) return;

  const normalizedCharge = Phaser.Math.Clamp(chargePercent, 0, 1);
  const superJumpConfig = MAIN_SCENE_TUNING.jump.super;

  if (
    this.isTutorial &&
    this.tutorialWave === 5 &&
    normalizedCharge > superJumpConfig.tutorialCountThreshold
  ) {
    this.tutorialSuperJumps = (this.tutorialSuperJumps || 0) + 1;
  }

  const jumpHeight = superJumpConfig.minHeightPx +
    (superJumpConfig.maxHeightPx - superJumpConfig.minHeightPx) * normalizedCharge;

  const stretchX = superJumpConfig.stretchXBase + (1.0 - normalizedCharge) * superJumpConfig.stretchXFalloff;
  const stretchY = superJumpConfig.stretchYBase + normalizedCharge * superJumpConfig.stretchYGain;

  spawnSuperJumpParticles(this, normalizedCharge);

  this.player.setScale(superJumpConfig.launchSquashX, superJumpConfig.launchSquashY);
  this.wobbleVelocity.y = superJumpConfig.launchWobbleVelocityBase * (1 + normalizedCharge);

  this.tweens.add({
    targets: this.player,
    scaleX: stretchX * 0.7,
    scaleY: stretchY * 1.3,
    duration: superJumpConfig.launchStretchDurationMs,
    ease: 'Back.easeOut',
    onComplete: () => {
      const jumpDuration =
        superJumpConfig.jumpDurationBaseMs +
        normalizedCharge * superJumpConfig.jumpDurationPerChargeMs;

      this.tweens.add({
        targets: this.player,
        y: gameState.PLAYER_Y - jumpHeight,
        duration: jumpDuration,
        ease: 'Cubic.easeOut',
        onUpdate: tween => {
          const progress = tween.progress;
          const wobbleAmount = (1 - progress) * superJumpConfig.flightWobbleMax;
          const wobblePhase = Math.PI * superJumpConfig.flightWobbleCycles;
          this.player.scaleX = 1 + Math.sin(progress * wobblePhase) * wobbleAmount;
          this.player.scaleY = 1 + Math.cos(progress * wobblePhase) * wobbleAmount;
        },
        yoyo: true,
        onYoyo: () => {
          this.player.setScale(superJumpConfig.apexScaleX, superJumpConfig.apexScaleY);
          this.tweens.add({
            targets: this.player,
            scaleX: 1,
            scaleY: 1,
            duration: superJumpConfig.apexSettleDurationMs,
            ease: 'Sine.easeInOut'
          });
        },
        onComplete: () => {
          this.player.setScale(superJumpConfig.landingSquashX, superJumpConfig.landingSquashY);
          this.wobbleVelocity.y = superJumpConfig.landingWobbleVelocityY;

          this.tweens.add({
            targets: this.player,
            scaleX: superJumpConfig.bounceUpScaleX,
            scaleY: superJumpConfig.bounceUpScaleY,
            y: gameState.PLAYER_Y - superJumpConfig.bounceHeightPx,
            duration: superJumpConfig.bounceUpDurationMs,
            ease: 'Quad.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: this.player,
                scaleX: superJumpConfig.bounceDownScaleX,
                scaleY: superJumpConfig.bounceDownScaleY,
                y: gameState.PLAYER_Y,
                duration: superJumpConfig.bounceDownDurationMs,
                ease: 'Quad.easeIn',
                onComplete: () => {
                  finalizeLanding(this, player, input);

                  this.tweens.add({
                    targets: this.player,
                    scaleX: 1,
                    scaleY: 1,
                    duration: superJumpConfig.settleDurationMs,
                    ease: 'Elastic.easeOut',
                    easeParams: superJumpConfig.settleElasticParams
                  });
                }
              });
            }
          });
        }
      });

      this.tweens.add({
        targets: this.player,
        angle: superJumpConfig.spinBaseAngle + normalizedCharge * superJumpConfig.spinPerChargeAngle,
        duration: jumpDuration * 2,
        ease: 'Cubic.easeInOut'
      });
    }
  });

  playSuperJumpSound(normalizedCharge);
}
