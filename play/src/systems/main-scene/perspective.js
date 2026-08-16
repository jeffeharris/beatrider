// Perspective projection helpers for the lane-based playfield.
//
// Entities travel along a normalized `progress` value (0 = at the vanishing
// point, 1 = at the bottom/player row). Screen Y follows an exponential curve
// so movement accelerates toward the camera, and sprite scale grows linearly
// with progress.
//
// These helpers are intentionally pure (no imports, explicit parameters) so
// they can run under `node --test` without stubbing window/navigator the way
// config.js requires.

// Exponent of the distance curve: y grows as progress^2.5.
export const PERSPECTIVE_EXPONENT = 2.5;

// Sprite scale is PERSPECTIVE_SCALE_BASE at the vanishing point and grows by
// PERSPECTIVE_SCALE_RANGE per unit of progress (so 1.3 at progress 1).
export const PERSPECTIVE_SCALE_BASE = 0.1;
export const PERSPECTIVE_SCALE_RANGE = 1.2;

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
