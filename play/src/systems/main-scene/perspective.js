import { gameState } from '../../config.js';

// ============================================
// PERSPECTIVE PROJECTION
// ============================================
// The world is faked in 3D from four numbers. Entities never store a screen Y -
// they store `progress` (0 = horizon, 1 = at the player) and their Y is re-derived
// every frame from the curve below. That means changing these numbers reprojects
// the whole world with no state migration, and - because progress advances at a
// rate that never reads the projection - without touching difficulty or the
// progress-space collision windows.

/** The default top-down view: long runway, enemies crawl in from a distant dot. */
export const FAR_PERSPECTIVE = Object.freeze({
  vanishRatio: 0.15, // horizon height, as a fraction of screen height
  exponent: 2.5,     // depth curve - higher compresses distance harder
  scaleBase: 0.1,    // sprite scale at the horizon
  scaleRamp: 1.2,    // scale gained between horizon and player
  laneExponent: 1.0  // how fast lanes fan out from the vanishing point
});

// The near view used during rapid fire: short runway, enemies barrel at you.
//
// The exponent below 1.0 is what makes this read as a lunge rather than just a
// bigger picture: above 1.0 the curve is concave and things ease gently out of
// the horizon, below it the curve flips convex and they leap off the vanishing
// point, then travel most of the way at size.
//
// vanishRatio and scaleRamp are the two that turn dramatic into unplayable -
// past ~0.40 the empty sky eats the top of the screen, and past ~2.4 sprites
// overlap enough to hide each other and blur which lane they are in.
// laneExponent below 1.0 fans the lanes out faster. It has to: sprite scale and
// lane spread both grow linearly with progress at FAR, which is what keeps a
// sprite at a constant ~28% of its lane at every depth and makes lanes legible.
// Growing scale without widening lanes breaks that invariant - 0.75 restores it.
export const NEAR_PERSPECTIVE = Object.freeze({
  vanishRatio: 0.36,
  exponent: 0.95,
  scaleBase: 0.45,
  scaleRamp: 2.2,
  laneExponent: 0.75
});

export const ZOOM_IN_MS = 900;
export const ZOOM_OUT_MS = 600;

/** Stars are meant to read as far away, so they only take a fraction of the shift. */
export const STARFIELD_ZOOM_STRENGTH = 0.4;

/**
 * How much the camera follows the ship laterally while zoomed, 0..1.
 *
 * A follow cam has to do two things at once: translate with the ship, and yaw so
 * it keeps looking down the track. Translating alone slides the corridor off the
 * screen; yawing alone reads as a stationary camera turning. Both together give
 * the third-person feel, which is why getVanishX() offsets by this same scroll -
 * the point the lanes converge on has to stay dead ahead of the camera.
 *
 * Only the near end of the far-side lane leaves frame, which is harmless: the
 * one lane whose near end can hit you is your own, and that is the centred one.
 */
export const CAMERA_LOCK_AMOUNT = 0.7;

/**
 * How much the camera rises with a jump, 0..1. Below 1.0 the ship still gains
 * height on screen, so a jump reads as leaving the ground rather than the world
 * simply dropping - the camera follows you up without pinning you.
 */
export const CAMERA_JUMP_FOLLOW = 0.55;

/** Camera catch-up time constant, ms. Higher lags more - this is the handheld feel. */
export const CAMERA_LOCK_LAG_MS = 130;

/** Raw 0..1 transition position. Eased on read, never read directly. */
let zoomT = 0;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

// Smoothstep rather than a directional ease: the same curve applies in both
// directions, so grabbing a power-up mid-retreat resumes without a visible snap.
const smoothstep = (t) => t * t * (3 - 2 * t);

export function resetPerspective() {
  zoomT = 0;
}

/**
 * Advance the transition. Call once per frame, before anything projects.
 * @param {number} dt milliseconds since last frame
 * @param {boolean} wantNear true while the power-up is active
 */
export function updatePerspective(dt, wantNear) {
  const step = dt / (wantNear ? ZOOM_IN_MS : ZOOM_OUT_MS);
  zoomT = clamp01(wantNear ? zoomT + step : zoomT - step);
}

/** Eased transition position: 0 = fully far, 1 = fully near. */
export function getZoom() {
  return smoothstep(zoomT);
}

/**
 * The live projection parameters.
 * @param {number} strength how much of the zoom this layer takes (0..1)
 */
export function getPerspective(strength = 1) {
  const t = getZoom() * strength;
  return {
    vanishY: gameState.HEIGHT * lerp(FAR_PERSPECTIVE.vanishRatio, NEAR_PERSPECTIVE.vanishRatio, t),
    exponent: lerp(FAR_PERSPECTIVE.exponent, NEAR_PERSPECTIVE.exponent, t),
    scaleBase: lerp(FAR_PERSPECTIVE.scaleBase, NEAR_PERSPECTIVE.scaleBase, t),
    scaleRamp: lerp(FAR_PERSPECTIVE.scaleRamp, NEAR_PERSPECTIVE.scaleRamp, t),
    laneExponent: lerp(FAR_PERSPECTIVE.laneExponent, NEAR_PERSPECTIVE.laneExponent, t)
  };
}

/**
 * How far a lane has fanned out from the vanishing point at this depth, 0..1.
 * Lanes must widen in step with sprite scale or sprites overflow their lane.
 */
export function laneOffsetFactor(progress) {
  const { laneExponent } = getPerspective();
  return Math.pow(Math.max(0, progress), laneExponent);
}

/** Current horizon Y in screen pixels. */
export function getVanishY(strength = 1) {
  return getPerspective(strength).vanishY;
}

/**
 * World X where the lanes converge, offset by the camera scroll so the point
 * always lands at screen centre. This is the camera's yaw: it looks straight
 * down the track no matter where it has panned to.
 * @param {number} scrollX current camera scroll
 */
export function getVanishX(scrollX = 0) {
  return gameState.WIDTH / 2 + scrollX;
}

/**
 * Project a depth onto a screen Y.
 *
 * The curve is normalised so PLAYER_PROGRESS lands exactly on the ship's row,
 * rather than running to the bottom of the screen. Without that the collision
 * depth maps to a different height at every exponent - it sat 32px above the
 * ship at the far view and 33px below it when zoomed, which is what made
 * enemies look like they slid underneath instead of arriving.
 *
 * Progress is clamped at 0 because a fractional exponent over a negative base
 * is NaN, and bullets briefly sit at progress < 0 before they are culled.
 */
export function projectY(progress, strength = 1) {
  const { vanishY, exponent } = getPerspective(strength);
  const reach = Math.pow(Math.max(0, progress) / PLAYER_PROGRESS, exponent);
  return vanishY + (gameState.PLAYER_Y - vanishY) * reach;
}

/** Inverse of projectY - which depth does this screen Y sit at? */
export function unprojectProgress(y, strength = 1) {
  const { vanishY, exponent } = getPerspective(strength);
  const normalized = (y - vanishY) / (gameState.PLAYER_Y - vanishY);
  return PLAYER_PROGRESS * Math.pow(Math.max(0, normalized), 1 / exponent);
}

/**
 * Where the ship sits on the depth axis - the centre of the 0.94-0.97 collision
 * window, so an enemy crosses from behind it to in front of it exactly as it
 * becomes able to hit you.
 */
export const PLAYER_PROGRESS = 0.955;

/**
 * Render order along the Z axis. Anything nearer than you draws over you, so a
 * enemy that has reached you visibly passes in front instead of sliding
 * underneath. Scaled to stay clear of the 999+ band used by effects and UI.
 */
export function depthForProgress(progress) {
  return Math.round(progress * 500);
}

/** Sprite scale for a given depth. */
export function entityScale(progress) {
  const { scaleBase, scaleRamp } = getPerspective();
  return scaleBase + progress * scaleRamp;
}

/**
 * Scale for collision boxes, deliberately pinned to FAR and never zoomed.
 *
 * Hitboxes are in screen pixels and the AABB threshold is (a.w + b.w) / 2, so
 * letting them grow with the zoom would widen the X window you can be clipped
 * from - the player's own box is a fixed size and cannot compensate. The zoom
 * has to stay cosmetic, so the collision geometry stays at the far projection.
 */
export function hitboxScale(progress) {
  return FAR_PERSPECTIVE.scaleBase + progress * FAR_PERSPECTIVE.scaleRamp;
}
