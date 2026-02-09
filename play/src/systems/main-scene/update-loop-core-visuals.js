import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameSounds } from '../../audio/game-sounds.js';

export function updateIdleWobble(dt) {
  const player = this.stateSlices?.player;
  if (!(player?.moving ?? this.isMoving) && !(player?.jumping ?? this.isJumping) && !(player?.dashing ?? this.isDashing) && this.player) {
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
  const player = this.stateSlices?.player;
  const input = this.stateSlices?.input;
  if ((player?.charging ?? this.isChargingJump) && this.usingTimeBasedCharge) {
    const currentTime = this.time.now;
    const elapsed = currentTime - this.touchChargeStartTime;
    const charge = Math.min(elapsed / this.maxChargeTime, 1.0);
    if (input) input.jumpChargeAmount = charge;
    else this.jumpChargeAmount = charge;

    this.chargeGlow.clear();
    this.chargeGlow.setPosition(this.player.x, this.player.y);

    const currentCharge = input?.jumpChargeAmount ?? this.jumpChargeAmount;
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
  const combat = this.stateSlices?.combat;
  const combo = combat?.combo ?? this.combo;
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
    this.comboMeter.fillRect(10, this.comboMeterY, 200 * meterPercent, 8);

    if (timeRemaining <= 0) {
      if (combat) combat.combo = 1;
      else this.combo = 1;
      this.comboMeterBg.setVisible(false);
      this.comboMeter.clear();
    }
  } else {
    this.comboMeterBg.setVisible(false);
    this.comboMeter.clear();
  }
}

export function updatePulseAndGrid(dt) {
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

  if (!this.gridOffset) this.gridOffset = 0;
  const currentBPM = typeof Tone !== 'undefined' && Tone.Transport ? Tone.Transport.bpm.value : 132;

  if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) {
    gameSounds.currentLaserSound = 0;
    this.updateSoundDisplay();
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
    gameSounds.currentLaserSound = 1;
    this.updateSoundDisplay();
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
    gameSounds.currentLaserSound = 2;
    this.updateSoundDisplay();
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) {
    gameSounds.currentLaserSound = 3;
    this.updateSoundDisplay();
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.FIVE)) {
    gameSounds.currentLaserSound = 4;
    this.updateSoundDisplay();
  }
  if (Phaser.Input.Keyboard.JustDown(this.keys.SIX)) {
    gameSounds.currentLaserSound = 5;
    this.updateSoundDisplay();
  }

  this.gridOffset += (dt / 1000) * (currentBPM / 60) + pulseShift;
  if (this.gridVisible) {
    this._drawPerspectiveGrid();
  }

  if (this.gridGraphics && pulseXShift !== 0) {
    this.gridGraphics.x = pulseXShift;
  } else if (this.gridGraphics) {
    this.gridGraphics.x = 0;
  }

  return { pulseShift, pulseXShift };
}
