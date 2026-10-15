import { gameState, getHudRowsY, MAX_AMMO, MAX_SHIELD } from '../../config.js';
import {
  beatPulseIntensity,
  createBeatPulseState,
  LOW_PULSE_FLOOR,
  CRITICAL_PULSE_FLOOR
} from './resource-pulse.js';

// Ammo and shield are tall gauges on the left and right screen edges, filling
// bottom-up, with an icon beneath each. They sit in the lower half - near the
// ship, where the player is looking - and stop above the combo row so the
// bottom-left HUD stays clear.
const GAUGE_WIDTH = 8;
const EDGE_INSET = 10;
const MAX_GAUGE_HEIGHT = 320;
const GAUGE_HEIGHT_RATIO = 0.42;  // of screen height, capped by MAX_GAUGE_HEIGHT
const MIN_TOP_RATIO = 0.25;       // never climb above this fraction of the screen
const ICON_SIZE = 16;
const ICON_GAP = 6;

const FILL_ALPHA = 0.9;          // fill alpha at full pulse intensity
const SOCKET_ALPHA = 0.35;       // resting outline around a non-empty socket
const EMPTY_SOCKET_ALPHA = 0.9;  // urgent outline around an empty socket
const EMPTY_COLOR = 0xff3333;    // matches the critical fill tier
const BACKGROUND_COLOR = 0x222222;

// Icon outlines on a 24-unit grid, scaled to ICON_SIZE when drawn.
const BOLT_ICON = [[13, 2], [4, 14], [11, 14], [10, 22], [19, 10], [12, 10]];
const SHIELD_ICON = [[12, 3], [20, 6], [20, 12], [18, 17], [12, 21], [6, 17], [4, 12], [4, 6]];

/**
 * Where the two gauges go for a given screen. Pure, so it can be tested
 * without Phaser.
 */
export function computeGaugeLayout({ width, height, comboY }) {
  const bottom = comboY - ICON_SIZE - ICON_GAP * 2;
  const minTop = Math.round(height * MIN_TOP_RATIO);
  const gaugeHeight = Math.max(0, Math.round(Math.min(
    height * GAUGE_HEIGHT_RATIO,
    MAX_GAUGE_HEIGHT,
    bottom - minTop
  )));
  const y = bottom - gaugeHeight;
  const iconY = bottom + ICON_GAP;
  return {
    ammo: { x: EDGE_INSET, y, w: GAUGE_WIDTH, h: gaugeHeight, iconY },
    shield: { x: width - EDGE_INSET - GAUGE_WIDTH, y, w: GAUGE_WIDTH, h: gaugeHeight, iconY }
  };
}

function currentLayout() {
  return computeGaugeLayout({
    width: gameState.WIDTH,
    height: gameState.HEIGHT,
    comboY: getHudRowsY().comboY
  });
}

export function createResourceBarSystem(scene) {
  scene.resourceGaugeLayout = currentLayout();

  // Beat tracking for the low-resource pulse; fed by GameAPI.onBeat.
  scene.beatPulse = createBeatPulseState();

  // Gauge backgrounds (dark)
  scene.resourceBarBg = scene.add.graphics();
  scene.resourceBarBg.setDepth(1000);
  drawGaugeBackgrounds(scene.resourceBarBg, scene.resourceGaugeLayout);

  // Fills, socket outlines and icons
  scene.resourceBarFg = scene.add.graphics();
  scene.resourceBarFg.setDepth(1001);
}

function drawGaugeBackgrounds(gfx, layout) {
  gfx.clear();
  gfx.fillStyle(BACKGROUND_COLOR, 0.6);
  for (const g of [layout.ammo, layout.shield]) {
    gfx.fillRect(g.x, g.y, g.w, g.h);
  }
}

export function updateResourceBarSystem() {
  const { combat } = this.stateSlices;
  if (!this.resourceBarFg) return;

  const layout = this.resourceGaugeLayout;
  const gfx = this.resourceBarFg;

  gfx.clear();

  // Beat-synced warning pulse: peaks on each kick and eases down to the
  // tier's floor across the beat interval. Falls back to a static full
  // intensity when no beat has been heard or the music has stopped.
  const pulse = (floor) => beatPulseIntensity({
    now: this.time.now,
    lastBeatTime: this.beatPulse ? this.beatPulse.lastBeatTime : null,
    beatInterval: this.beatPulse ? this.beatPulse.beatInterval : 0,
    minIntensity: floor
  });

  // Ammo gauge (left edge)
  const ammoPercent = combat.ammo / MAX_AMMO;
  const ammoColor = ammoPercent > 0.3 ? 0x00ffcc : ammoPercent > 0.1 ? 0xffff00 : 0xff3333;
  const ammoIntensity = ammoPercent > 0.3
    ? 1
    : pulse(ammoPercent > 0.1 ? LOW_PULSE_FLOOR : CRITICAL_PULSE_FLOOR);
  drawGauge(gfx, layout.ammo, ammoPercent, ammoColor, ammoIntensity, BOLT_ICON);

  // Shield gauge (right edge)
  const shieldPercent = combat.shield / MAX_SHIELD;
  const shieldColor = shieldPercent > 0.5 ? 0xcc44ff : shieldPercent > 0.25 ? 0xff8800 : 0xff3333;
  const shieldIntensity = shieldPercent > 0.5
    ? 1
    : pulse(shieldPercent > 0.25 ? LOW_PULSE_FLOOR : CRITICAL_PULSE_FLOOR);
  drawGauge(gfx, layout.shield, shieldPercent, shieldColor, shieldIntensity, SHIELD_ICON);
}

// One gauge: the fill rises from the bottom; an outlined socket keeps the slot
// visible even at zero. An empty shield means the next hit is lethal, so that
// state must never be rendered as an absence of pixels — at zero the socket
// outline and icon turn urgent red and throb with the beat pulse.
function drawGauge(gfx, gauge, percent, color, intensity, icon) {
  const { x, y, w, h } = gauge;
  if (percent > 0) {
    const fillHeight = h * Math.min(1, percent);
    gfx.fillStyle(color, FILL_ALPHA * intensity);
    gfx.fillRect(x, y + h - fillHeight, w, fillHeight);
    gfx.lineStyle(1, color, SOCKET_ALPHA);
  } else {
    gfx.lineStyle(1, EMPTY_COLOR, EMPTY_SOCKET_ALPHA * intensity);
  }
  gfx.strokeRect(x, y, w, h);

  const iconColor = percent > 0 ? color : EMPTY_COLOR;
  drawIcon(gfx, icon, x + w / 2, gauge.iconY, iconColor, intensity);
}

function drawIcon(gfx, icon, centerX, top, color, intensity) {
  const scale = ICON_SIZE / 24;
  const left = centerX - ICON_SIZE / 2;
  const points = icon.map(([px, py]) => ({ x: left + px * scale, y: top + py * scale }));
  gfx.lineStyle(1.5, color, FILL_ALPHA * intensity);
  gfx.strokePoints(points, true);
}

export function resizeResourceBarSystem() {
  if (!this.resourceBarBg) return;
  this.resourceGaugeLayout = currentLayout();
  drawGaugeBackgrounds(this.resourceBarBg, this.resourceGaugeLayout);
}
