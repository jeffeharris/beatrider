import Phaser from 'phaser';
import { LANES, MAIN_SCENE_TUNING } from '../../config.js';

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
  this.playerLaneDesyncFrames = 0;
  this.playerLaneLastHealAt = 0;
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
  const { player, flow } = this.stateSlices;

  if (flow.paused && flow.gameOver) {
    warnInvariant(this, 'paused-and-gameover', 'paused and game-over are both true');
  }
  if (player.dashing && player.stretching) {
    warnInvariant(this, 'dashing-and-stretching', 'dash and stretch states overlap');
  }
  if (player.charging && this.chargeGlow && !this.chargeGlow.visible) {
    warnInvariant(this, 'charging-without-glow', 'charging jump while glow is hidden');
  }
  if (player.lane < -1 || player.lane > 5) {
    warnInvariant(this, 'lane-out-of-range', `playerLane out of expected bounds: ${player.lane}`);
  }
}

export function monitorAndHealPlayerLaneDesync() {
  const { player, flow } = this.stateSlices;
  if (!this.player || flow.paused || flow.gameOver) return;

  if (player.lane < 0 || player.lane >= LANES || player.moving || player.dashing) {
    this.playerLaneDesyncFrames = 0;
    return;
  }

  const expectedX = this._laneX(player.lane);
  const diff = Math.abs(this.player.x - expectedX);
  if (diff <= 2) {
    this.playerLaneDesyncFrames = 0;
    return;
  }

  this.playerLaneDesyncFrames = (this.playerLaneDesyncFrames || 0) + 1;

  if (import.meta.env.DEV) {
    warnInvariant(this, 'lane-position-desync', `player x desynced by ${diff.toFixed(2)} at lane ${player.lane}`);
  }

  if (this.playerLaneDesyncFrames < 4) return;

  const now = this.time.now;
  if (now - (this.playerLaneLastHealAt || 0) < 500) return;

  this.tweens.killTweensOf(this.player);
  this.player.x = expectedX;
  this.playerLaneDesyncFrames = 0;
  this.playerLaneLastHealAt = now;

  if (import.meta.env.DEV) {
    warnInvariant(this, 'lane-position-heal', `corrected player x to lane ${player.lane}`);
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

  const { player, flow, input, combat } = this.stateSlices;

  const text = [
    `paused=${!!flow.paused} gameOver=${!!flow.gameOver}`,
    `lane=${player.lane} moving=${!!player.moving} dashing=${!!player.dashing} jumping=${!!player.jumping}`,
    `charging=${!!player.charging} charge=${(input.jumpChargeAmount || 0).toFixed(2)} touch=${!!input.touchActive}`,
    `combo=${combat.combo} beats=${combat.beats} score=${combat.score}`,
    `assist=${!!this.adaptiveState?.isAssisting} spawnMul=${(this.adaptiveState?.currentSpawnMultiplier ?? 1).toFixed(2)} speedMul=${(this.adaptiveState?.currentSpeedMultiplier ?? 1).toFixed(2)}`,
    `${MAIN_SCENE_TUNING.debug.toggleKey}: toggle debug HUD`
  ].join('\n');

  this.debugHudText.setText(text);
}
