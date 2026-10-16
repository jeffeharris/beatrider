// Rapid-fire perspective zoom: pure state and geometry.
//
// The zoom is a 0..1 transition `t` that eases between the normal view and a
// near view. In the near view the camera dollies in on the ship, the horizon
// drops, and the depth curve flattens, so enemies leap off the vanishing point
// rather than easing out of it.
//
// While zoomed the camera is locked over the shoulder: it centres on the ship
// and rises with its jumps, so the ship holds still on screen and the track
// swings and drops beneath it. The lock scales with the zoom.
//
// The world never moves to make room for the zoom: lanes keep their X, the ship
// keeps its row, and progress/collision are untouched. Only the camera and the
// projection parameters change, so nothing in gameplay can drift out of step
// with what is drawn. At t = 0 every value here is exactly the unzoomed view.
//
// Pure (no Phaser, no browser globals) so it runs under `node --test`.

import {
  PERSPECTIVE_EXPONENT,
  PERSPECTIVE_VANISH_RATIO,
  ZOOM_IN_MS,
  ZOOM_OUT_MS,
  ZOOM_CAMERA_NEAR,
  ZOOM_HORIZON_NEAR,
  ZOOM_EXPONENT_NEAR,
  ZOOM_FOLLOW,
  ZOOM_JUMP_FOLLOW,
  ZOOM_FOLLOW_LAG_MS
} from '../../tuning.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Advance the raw transition by dt ms toward near (wantNear) or far.
export function stepZoom(t, dt, wantNear) {
  const step = dt / (wantNear ? ZOOM_IN_MS : ZOOM_OUT_MS);
  return clamp(wantNear ? t + step : t - step, 0, 1);
}

// Smoothstep: the same curve both ways, so re-engaging mid-retreat has no snap.
export function easeZoom(t) {
  return t * t * (3 - 2 * t);
}

// Where the camera wants to centre horizontally: toward the ship as it zooms.
export function followTargetX(width, playerX, ease) {
  return lerp(width / 2, playerX, ZOOM_FOLLOW * ease);
}

// Frame-rate independent exponential catch-up toward `target`.
export function followTowards(current, target, dt) {
  return current + (target - current) * (1 - Math.exp(-dt / ZOOM_FOLLOW_LAG_MS));
}

/**
 * The camera and projection for one frame.
 *
 * Returns the visible world rectangle (viewLeft/viewTop at `zoom`) and the
 * projection the world should be drawn with:
 * - viewTop keeps the ship (at `shipY`, its live height) at the ship row's
 *   screen height, so with ZOOM_JUMP_FOLLOW = 1 a jump carries the camera up.
 * - The view may leave the world only in proportion to the zoom, so the
 *   unzoomed view is always exactly the world. (The starfield is drawn per view,
 *   so space past the world's edge is still full of stars.)
 * - vanishX sits at the centre of the view: a camera that pans keeps looking
 *   straight down the track, so the corridor converges ahead of it.
 * - vanishY puts the horizon at a fixed fraction of the screen height, so a jump
 *   reads as the camera rising rather than tilting.
 */
export function computeZoomFrame({ ease, width, height, playerY, followX, shipY = playerY }) {
  const zoom = lerp(1, ZOOM_CAMERA_NEAR, ease);
  const viewW = width / zoom;
  const viewH = height / zoom;
  const overflowX = width * ease;
  const viewLeft = clamp(followX - viewW / 2, 0 - overflowX, width - viewW + overflowX);
  const anchorY = playerY + (shipY - playerY) * ZOOM_JUMP_FOLLOW * ease;
  const viewTop = clamp(anchorY - playerY / zoom, 0 - height * ease, height - viewH);
  const horizon = lerp(PERSPECTIVE_VANISH_RATIO, ZOOM_HORIZON_NEAR, ease);
  return {
    zoom,
    viewLeft,
    viewTop,
    vanishX: viewLeft + viewW / 2,
    vanishY: viewTop + horizon * viewH,
    exponent: lerp(PERSPECTIVE_EXPONENT, ZOOM_EXPONENT_NEAR, ease)
  };
}
