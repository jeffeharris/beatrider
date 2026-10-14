// Perspective projection helpers for the lane-based playfield.
//
// Entities travel along a normalized `progress` value (0 = at the vanishing
// point, PLAYER_PROGRESS = on the ship's row, a little past that = behind the
// ship and off toward the screen bottom). Screen Y follows an exponential curve
// so movement accelerates toward the camera, and sprite scale grows linearly
// with progress.
//
// These helpers are intentionally pure (explicit parameters, no browser
// globals) so they can run under `node --test` without stubbing
// window/navigator the way config.js requires. The tuning constants live in
// src/tuning.js — itself a pure leaf module — and are re-exported here so
// existing importers (including tests/perspective.test.js) keep working.

import {
  PERSPECTIVE_EXPONENT,
  PERSPECTIVE_SCALE_BASE,
  PERSPECTIVE_SCALE_RANGE,
  PLAYER_PROGRESS
} from '../../tuning.js';

export { PERSPECTIVE_EXPONENT, PERSPECTIVE_SCALE_BASE, PERSPECTIVE_SCALE_RANGE, PLAYER_PROGRESS };

// The raw distance curve: progress^2.5. Exposed separately because the
// starfield projects toward per-star base positions rather than the screen
// bottom and only needs the curve itself.
export function perspectiveCurve(progress) {
  return Math.pow(progress, PERSPECTIVE_EXPONENT);
}

// Screen Y for a given progress, projecting from vanishY so that PLAYER_PROGRESS
// lands exactly on `playerY` (the ship's row). Projecting to the screen bottom
// instead put the collision window ~40px above the ship, so enemies hit you
// before they visibly reached you. Progress past PLAYER_PROGRESS continues
// below the ship toward the bottom edge.
//
// Progress is clamped at 0 because a fractional exponent of a negative base is
// NaN, and bullets briefly sit below 0 before they are culled.
export function projectY(progress, vanishY, playerY) {
  const reach = perspectiveCurve(Math.max(0, progress) / PLAYER_PROGRESS);
  return vanishY + (playerY - vanishY) * reach;
}

// Inverse of projectY: recover progress from a screen Y coordinate.
export function unprojectY(y, vanishY, playerY) {
  const reach = Math.max(0, (y - vanishY) / (playerY - vanishY));
  return PLAYER_PROGRESS * Math.pow(reach, 1 / PERSPECTIVE_EXPONENT);
}

// How far a lane has fanned out from the vanishing point, as a fraction of its
// X at the ship's row: 0 at the horizon, exactly 1 at PLAYER_PROGRESS, and a
// little over 1 behind the ship. Pairs with projectY so an entity in your lane
// crosses your row directly over the ship, not inward of it.
export function laneSpread(progress) {
  return progress / PLAYER_PROGRESS;
}

// Sprite scale for a given progress (start tiny, grow to full size).
export function perspectiveScale(progress) {
  return PERSPECTIVE_SCALE_BASE + progress * PERSPECTIVE_SCALE_RANGE;
}
