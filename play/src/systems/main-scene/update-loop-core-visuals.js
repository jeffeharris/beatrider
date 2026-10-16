import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameSounds } from '../../audio/game-sounds.js';
import { perspectiveScale } from './perspective.js';
import { applyEnemyBeatPulse } from './update-loop-enemies.js';
import { applyObstacleBeatPulse, obstacleShimmerAlpha } from './update-loop-obstacles-stars-powerups.js';

export function updateIdleWobble(dt) {
  const { player } = this.stateSlices;
  if (typeof this.updatePlayerCharacterCosmetics === 'function') {
    this.updatePlayerCharacterCosmetics();
  }

  if (!player.moving && !player.jumping && !player.dashing && this.player) {
    this.idleWobblePhase += dt * 0.003;
    const breathScale = 1 + Math.sin(this.idleWobblePhase) * 0.03;
    const squishScale = 1 - Math.cos(this.idleWobblePhase * 2) * 0.02;

    if (!this.tweens.isTweening(this.player)) {
      this.player.setScale(
        breathScale * (1 + this.wobbleVelocity.x * 0.01),
        squishScale * (1 + this.wobbleVelocity.y * 0.01)
      );
    }

    this.wobbleVelocity.x *= this.wobbleDamping;
    this.wobbleVelocity.y *= this.wobbleDamping;

    if (Math.random() < 0.02) {
      this.wobbleVelocity.x += (Math.random() - 0.5) * 2;
      this.wobbleVelocity.y += (Math.random() - 0.5) * 2;
    }
  }
}

export function updateTimeBasedTouchCharge(dt) {
  const { player, input } = this.stateSlices;
  if (player.charging && this.usingTimeBasedCharge) {
    const currentTime = this.time.now;
    const elapsed = currentTime - this.touchChargeStartTime;
    const charge = Math.min(elapsed / this.maxChargeTime, 1.0);
    input.jumpChargeAmount = charge;

    this.chargeGlow.clear();
    this.chargeGlow.setPosition(this.player.x, this.player.y);

    const currentCharge = input.jumpChargeAmount;
    const pulseSpeed = 10 + currentCharge * 20;
    const pulse = Math.sin(currentTime * pulseSpeed * 0.001) * 0.2 + 0.8;
    const glowRadius = 30 + currentCharge * 50 * pulse;
    const glowAlpha = 0.3 + currentCharge * 0.5 * pulse;

    const glowColor = currentCharge < 0.3
      ? { r: 0, g: 136, b: 255 }
      : currentCharge < 0.7
        ? { r: 255, g: 255, b: 0 }
        : { r: 255, g: 0, b: 255 };

    const hexColor = Phaser.Display.Color.GetColor(glowColor.r, glowColor.g, glowColor.b);
    this.chargeGlow.fillStyle(hexColor, glowAlpha);
    this.chargeGlow.fillCircle(0, 0, glowRadius);

    try {
      const pitchShift = 1 + currentCharge * 2;
      gameSounds.jumpCharge.frequency.exponentialRampToValueAtTime(
        Tone.Frequency('C2').toFrequency() * pitchShift,
        Tone.now() + 0.05
      );
    } catch (e) {}
  }
}

export function updateComboMeter() {
  const { combat } = this.stateSlices;
  const combo = combat.combo;
  if (combo > 1) {
    const timeSinceKill = this.time.now - this.lastKillTime;
    const timeRemaining = Math.max(0, this.comboWindow - timeSinceKill);
    const meterPercent = timeRemaining / this.comboWindow;

    this.comboMeterBg.setVisible(true);
    this.comboMeter.clear();

    let meterColor = 0x00ff00;
    if (meterPercent < 0.3) meterColor = 0xff0000;
    else if (meterPercent < 0.6) meterColor = 0xffff00;
    else if (combo >= 6) meterColor = 0xff00ff;
    else if (combo >= 4) meterColor = 0x00ffff;

    this.comboMeter.fillStyle(meterColor, 0.8);
    this.comboMeter.fillRect(10, this.comboMeterY, this.comboMeterWidth * meterPercent, 8);

    if (timeRemaining <= 0) {
      combat.combo = 1;
      this.comboMeterBg.setVisible(false);
      this.comboMeter.clear();
    }
  } else {
    this.comboMeterBg.setVisible(false);
    this.comboMeter.clear();
  }
}

// Advance the sub-bass grid pulse and return this frame's lurch (progress) and sway (x).
function advanceGridPulse(dt) {
  let pulseShift = 0;
  let pulseXShift = 0;

  if (this.pulseActive && !this.isTutorial) {
    this.pulseTimer -= dt;
    if (this.pulseTimer <= 0) {
      this.pulseActive = false;
    } else {
      const t = 1 - this.pulseTimer / 150;
      const amount = Math.sin(t * Math.PI);

      if (this.pulseType === 0) {
        pulseShift = amount * 0.015;
      } else if (this.pulseType === 1) {
        pulseXShift = -amount * 30;
      } else {
        pulseXShift = amount * 30;
      }
    }
  }

  return { pulseShift, pulseXShift };
}

function applyGridSway(pulseXShift) {
  if (this.gridGraphics) {
    this.gridGraphics.x = pulseXShift;
  }
}

/**
 * While settings is open over a run, the world is frozen but the music keeps playing.
 * Keep the beat visible: grid pulses and enemy/shield flashes still fire, nothing moves.
 */
export function updateFrozenPulseVisuals(dt) {
  const { pulseShift, pulseXShift } = advanceGridPulse.call(this, dt);

  if (this.gridVisible) {
    this.gridOffset = (this.gridOffset || 0) + pulseShift;
    this._drawPerspectiveGrid();
  }
  applyGridSway.call(this, pulseXShift);

  const now = this.time.now;
  for (const e of this.enemies) {
    e.setScale(applyEnemyBeatPulse(e, perspectiveScale(e.progress), now));
  }
  for (const o of this.obstacles) {
    const scale = perspectiveScale(o.progress);
    o.setScale(scale, scale * 1.2);
    o.setAlpha(applyObstacleBeatPulse(o, scale, obstacleShimmerAlpha(o), now));
  }
}

export function updatePulseAndGrid(dt) {
  const { pulseShift, pulseXShift } = advanceGridPulse.call(this, dt);

  if (!this.gridOffset) this.gridOffset = 0;
  const currentBPM = typeof Tone !== 'undefined' && Tone.Transport ? Tone.Transport.bpm.value : 132;

  if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) {
    gameSounds.currentLaserSound = 0;
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
    gameSounds.currentLaserSound = 1;
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
    gameSounds.currentLaserSound = 2;
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) {
    gameSounds.currentLaserSound = 3;
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.FIVE)) {
    gameSounds.currentLaserSound = 4;
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.SIX)) {
    gameSounds.currentLaserSound = 5;
  }

  this.gridOffset += (dt / 1000) * (currentBPM / 60) + pulseShift;
  if (this.gridVisible) {
    this._drawPerspectiveGrid();
  }

  applyGridSway.call(this, pulseXShift);

  return { pulseShift, pulseXShift };
}
