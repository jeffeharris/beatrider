import Phaser from 'phaser';
import { MAIN_SCENE_TUNING } from '../../config.js';

function warnInvariant(scene, key, message) {
  const now = scene.time.now;
  scene._debugWarnTimes ??= {};
  const lastWarnAt = scene._debugWarnTimes[key] || 0;
  if (now - lastWarnAt < 1000) return;
  scene._debugWarnTimes[key] = now;
  console.warn(`[dev-invariant] ${message}`);
}

export function setupDebugToolsSystem() {
  this.debugHudVisible = false;
  this.lastDebugHudUpdateAt = 0;
  this._debugWarnTimes = {};

  this.debugHudText = this.add.text(12, 12, '', {
    font: '12px monospace',
    fill: '#ffffff',
    backgroundColor: '#000000'
  });
  this.debugHudText.setDepth(30000);
  this.debugHudText.setScrollFactor(0);
  this.debugHudText.setAlpha(0.8);
  this.debugHudText.setVisible(false);
}

export function assertMainSceneStateDev() {
  if (!import.meta.env.DEV) return;

  if (this.isPaused && this.isShowingGameOver) {
    warnInvariant(this, 'paused-and-gameover', 'paused and game-over are both true');
  }
  if (this.isDashing && this.isStretching) {
    warnInvariant(this, 'dashing-and-stretching', 'dash and stretch states overlap');
  }
  if (this.isChargingJump && this.chargeGlow && !this.chargeGlow.visible) {
    warnInvariant(this, 'charging-without-glow', 'charging jump while glow is hidden');
  }
  if (this.playerLane < -1 || this.playerLane > 5) {
    warnInvariant(this, 'lane-out-of-range', `playerLane out of expected bounds: ${this.playerLane}`);
  }
}

export function updateDebugHudSystem() {
  if (!import.meta.env.DEV || !this.debugHudText) return;

  if (Phaser.Input.Keyboard.JustDown(this.keys[MAIN_SCENE_TUNING.debug.toggleKey])) {
    this.debugHudVisible = !this.debugHudVisible;
    this.debugHudText.setVisible(this.debugHudVisible);
  }

  if (!this.debugHudVisible) return;
  if (this.time.now - this.lastDebugHudUpdateAt < MAIN_SCENE_TUNING.debug.hudUpdateMs) return;
  this.lastDebugHudUpdateAt = this.time.now;

  const text = [
    `paused=${!!this.isPaused} gameOver=${!!this.isShowingGameOver}`,
    `lane=${this.playerLane} moving=${!!this.isMoving} dashing=${!!this.isDashing} jumping=${!!this.isJumping}`,
    `charging=${!!this.isChargingJump} charge=${(this.jumpChargeAmount || 0).toFixed(2)} touch=${!!this.touchZoneActive}`,
    `combo=${this.combo} beats=${this.beats} score=${this.score}`,
    `assist=${!!this.adaptiveState?.isAssisting} spawnMul=${(this.adaptiveState?.currentSpawnMultiplier ?? 1).toFixed(2)} speedMul=${(this.adaptiveState?.currentSpeedMultiplier ?? 1).toFixed(2)}`,
    `${MAIN_SCENE_TUNING.debug.toggleKey}: toggle debug HUD`
  ].join('\n');

  this.debugHudText.setText(text);
}
