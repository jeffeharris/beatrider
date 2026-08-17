// Perspective projection helpers for the lane-based playfield.
//
// Entities travel along a normalized `progress` value (0 = at the vanishing
// point, 1 = at the bottom/player row). Screen Y follows an exponential curve
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
  PERSPECTIVE_SCALE_RANGE
} from '../../tuning.js';

export { PERSPECTIVE_EXPONENT, PERSPECTIVE_SCALE_BASE, PERSPECTIVE_SCALE_RANGE };

// The raw distance curve: progress^2.5. Exposed separately because the
// starfield projects toward per-star base positions rather than the screen
// bottom and only needs the curve itself.
export function perspectiveCurve(progress) {
  return Math.pow(progress, PERSPECTIVE_EXPONENT);
}

// Screen Y for a given progress, projecting from vanishY down to `height`
// (the bottom of the screen).
export function projectY(progress, vanishY, height) {
  return vanishY + (height - vanishY) * perspectiveCurve(progress);
}

// Inverse of projectY: recover progress from a screen Y coordinate.
export function unprojectY(y, vanishY, height) {
  return Math.pow((y - vanishY) / (height - vanishY), 1 / PERSPECTIVE_EXPONENT);
}

// Sprite scale for a given progress (start tiny, grow to full size).
export function perspectiveScale(progress) {
  return PERSPECTIVE_SCALE_BASE + progress * PERSPECTIVE_SCALE_RANGE;
}
