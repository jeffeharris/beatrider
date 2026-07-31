import { gameState, MAX_AMMO, MAX_SHIELD } from '../../config.js';

const BAR_WIDTH = 300;
const BAR_HEIGHT = 10;
const BAR_GAP = 4;    // gap between ammo and shield halves
const BAR_Y = 12;

function getBarX() {
  return (gameState.WIDTH - BAR_WIDTH) / 2;
}

export function createResourceBarSystem(scene) {
  const barX = getBarX();

  // Background bar (dark)
  scene.resourceBarBg = scene.add.graphics();
  scene.resourceBarBg.setDepth(1000);
  drawBarBackground(scene.resourceBarBg, barX);

  // Foreground bars (ammo + shield)
  scene.resourceBarFg = scene.add.graphics();
  scene.resourceBarFg.setDepth(1001);

  // Labels
  const labelStyle = { font: '10px monospace', fill: '#888' };
  scene.ammoLabel = scene.add.text(barX, BAR_Y + BAR_HEIGHT + 2, 'AMMO', labelStyle);
  scene.ammoLabel.setDepth(1001);
  scene.shieldLabel = scene.add.text(barX + BAR_WIDTH, BAR_Y + BAR_HEIGHT + 2, 'SHIELD', labelStyle);
  scene.shieldLabel.setOrigin(1, 0);
  scene.shieldLabel.setDepth(1001);
}

function drawBarBackground(gfx, barX) {
  gfx.clear();
  gfx.fillStyle(0x222222, 0.6);
  gfx.fillRect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT);
  // Center divider
  gfx.fillStyle(0x000000, 0.8);
  gfx.fillRect(barX + BAR_WIDTH / 2 - BAR_GAP / 2, BAR_Y, BAR_GAP, BAR_HEIGHT);
}

export function updateResourceBarSystem() {
  const { combat } = this.stateSlices;
  if (!this.resourceBarFg) return;

  const barX = getBarX();
  const halfWidth = (BAR_WIDTH - BAR_GAP) / 2;

  this.resourceBarFg.clear();

  // Ammo bar (left half) — fills left to right
  const ammoPercent = combat.ammo / MAX_AMMO;
  const ammoColor = ammoPercent > 0.3 ? 0x00ffcc : ammoPercent > 0.1 ? 0xffff00 : 0xff3333;
  this.resourceBarFg.fillStyle(ammoColor, 0.9);
  this.resourceBarFg.fillRect(barX, BAR_Y, halfWidth * ammoPercent, BAR_HEIGHT);

  // Shield bar (right half) — fills left to right
  const shieldPercent = combat.shield / MAX_SHIELD;
  if (shieldPercent > 0) {
    const shieldColor = shieldPercent > 0.5 ? 0xcc44ff : shieldPercent > 0.25 ? 0xff8800 : 0xff3333;
    const shieldX = barX + halfWidth + BAR_GAP;
    this.resourceBarFg.fillStyle(shieldColor, 0.9);
    this.resourceBarFg.fillRect(shieldX, BAR_Y, halfWidth * shieldPercent, BAR_HEIGHT);
  }
}

export function resizeResourceBarSystem() {
  if (!this.resourceBarBg) return;
  const barX = getBarX();
  drawBarBackground(this.resourceBarBg, barX);

  if (this.ammoLabel) this.ammoLabel.x = barX;
  if (this.shieldLabel) {
    this.shieldLabel.x = barX + BAR_WIDTH;
  }
}
