import test from 'node:test';
import assert from 'node:assert/strict';

// perspective.js reads gameState from config.js, which touches browser globals at
// module-evaluation time. Stub them before the dynamic import below.
globalThis.window = { innerWidth: 800, innerHeight: 1000 };
// Node supplies a getter-only `navigator`; config.js only reads userAgent and
// maxTouchPoints off it, so redefine rather than assign.
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node', maxTouchPoints: 0 },
  configurable: true
});
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const { gameState } = await import('../src/config.js');
const {
  FAR_PERSPECTIVE,
  NEAR_PERSPECTIVE,
  ZOOM_IN_MS,
  ZOOM_OUT_MS,
  STARFIELD_ZOOM_STRENGTH,
  resetPerspective,
  updatePerspective,
  getZoom,
  getPerspective,
  getVanishY,
  projectY,
  unprojectProgress,
  entityScale,
  hitboxScale,
  laneOffsetFactor,
  depthForProgress,
  PLAYER_PROGRESS
} = await import('../src/systems/main-scene/perspective.js');

const HEIGHT = 1000;
gameState.HEIGHT = HEIGHT;
const PLAYER_Y = gameState.PLAYER_Y;

/** Run the zoom to a settled endpoint. */
function settle(wantNear) {
  updatePerspective(wantNear ? ZOOM_IN_MS : ZOOM_OUT_MS, wantNear);
}

/** Interpolating to an endpoint is not bit-exact for arbitrary preset values. */
function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ~${expected}, got ${actual}`
  );
}

test('starts fully far: horizon and scale match the pre-existing projection', () => {
  resetPerspective();
  assert.equal(getZoom(), 0);
  assert.equal(getVanishY(), HEIGHT * 0.15);

  for (const p of [0, 0.25, 0.5, 0.94, 1]) {
    assert.equal(entityScale(p), 0.1 + p * 1.2);
  }
  assert.equal(projectY(0), HEIGHT * 0.15, 'spawns still sit on the horizon');
});

test('the collision depth lands on the ship at every zoom level', () => {
  // The whole point of normalising the curve: an enemy at the depth where it can
  // hit you is drawn at your row, not above or below it. Before this, the same
  // progress mapped to a different height at each exponent, so enemies appeared
  // to slide underneath the ship when zoomed.
  for (const zoomed of [false, true]) {
    resetPerspective();
    if (zoomed) settle(true);

    closeTo(projectY(PLAYER_PROGRESS), PLAYER_Y, `collision row when zoomed=${zoomed}`);
    assert.ok(projectY(0.94) < PLAYER_Y, 'still approaching at the near edge of the window');
    assert.ok(projectY(0.97) > PLAYER_Y, 'past you at the far edge of the window');
  }
});

test('depth ordering puts nearer things in front of the ship', () => {
  const playerDepth = depthForProgress(PLAYER_PROGRESS);
  assert.ok(depthForProgress(0.5) < playerDepth, 'distant enemies draw behind you');
  assert.ok(depthForProgress(0.94) < playerDepth, 'still behind as it enters the window');
  assert.ok(depthForProgress(0.97) > playerDepth, 'in front once it has reached you');
  assert.ok(depthForProgress(1.1) > playerDepth, 'and stays in front on the way out');
});

test('settles on the near projection while the buff is held', () => {
  resetPerspective();
  settle(true);
  assert.equal(getZoom(), 1);

  const near = getPerspective();
  closeTo(near.vanishY, HEIGHT * NEAR_PERSPECTIVE.vanishRatio, 'vanishY');
  closeTo(near.exponent, NEAR_PERSPECTIVE.exponent, 'exponent');
  closeTo(near.scaleBase, NEAR_PERSPECTIVE.scaleBase, 'scaleBase');
  closeTo(near.scaleRamp, NEAR_PERSPECTIVE.scaleRamp, 'scaleRamp');
});

test('holding the buff past full zoom does not overshoot', () => {
  resetPerspective();
  settle(true);
  updatePerspective(5000, true);
  assert.equal(getZoom(), 1);
  closeTo(getVanishY(), HEIGHT * NEAR_PERSPECTIVE.vanishRatio, 'vanishY after overshoot');
});

test('returns to the far projection once the buff drops', () => {
  resetPerspective();
  settle(true);
  settle(false);
  assert.equal(getZoom(), 0);
  assert.equal(getVanishY(), HEIGHT * FAR_PERSPECTIVE.vanishRatio);

  updatePerspective(5000, false);
  assert.equal(getZoom(), 0, 'does not undershoot below far');
});

test('zooms in over ZOOM_IN_MS and out over the shorter ZOOM_OUT_MS', () => {
  assert.ok(ZOOM_OUT_MS < ZOOM_IN_MS, 'retreat should be snappier than the approach');

  resetPerspective();
  updatePerspective(ZOOM_IN_MS / 2, true);
  assert.ok(getZoom() > 0 && getZoom() < 1, 'mid-transition after half the in-duration');

  resetPerspective();
  updatePerspective(ZOOM_IN_MS - 1, true);
  assert.ok(getZoom() < 1, 'not yet settled one millisecond early');
});

test('re-engaging mid-retreat resumes without a jump', () => {
  resetPerspective();
  settle(true);
  updatePerspective(ZOOM_OUT_MS / 2, false);
  const midRetreat = getZoom();

  updatePerspective(1, true);
  const resumed = getZoom();

  assert.ok(resumed > midRetreat, 're-engaging moves back toward near');
  assert.ok(Math.abs(resumed - midRetreat) < 0.01, 'and does so continuously');
});

test('projectY and unprojectProgress round-trip at any zoom', () => {
  for (const zoomed of [false, true]) {
    resetPerspective();
    if (zoomed) settle(true);

    for (const p of [0, 0.3, 0.7, 0.95, 1]) {
      const roundTripped = unprojectProgress(projectY(p));
      assert.ok(
        Math.abs(roundTripped - p) < 1e-9,
        `progress ${p} survived the round trip when zoomed=${zoomed}`
      );
    }
  }
});

test('never returns NaN for out-of-range inputs', () => {
  resetPerspective();
  settle(true); // fractional exponent - the case where a negative base would be NaN

  assert.equal(projectY(-0.01), getVanishY(), 'culled bullets clamp to the horizon');
  assert.ok(Number.isFinite(unprojectProgress(-500)), 'a Y above the horizon stays finite');
  assert.equal(unprojectProgress(-500), 0);
});

test('the horizon rises and sprites arrive larger when zoomed', () => {
  resetPerspective();
  const farVanish = getVanishY();
  const farScale = entityScale(0.5);

  settle(true);
  assert.ok(getVanishY() > farVanish, 'horizon drops down the screen, shortening the runway');
  assert.ok(entityScale(0.5) > farScale, 'mid-distance sprites are bigger');
  assert.ok(projectY(0.5) > farVanish, 'mid-distance depth sits lower on screen');
});

test('the starfield takes only a fraction of the shift', () => {
  resetPerspective();
  settle(true);

  const world = getPerspective();
  const stars = getPerspective(STARFIELD_ZOOM_STRENGTH);
  const far = FAR_PERSPECTIVE;

  assert.ok(STARFIELD_ZOOM_STRENGTH > 0 && STARFIELD_ZOOM_STRENGTH < 1);
  assert.ok(stars.exponent > world.exponent, 'stars stay closer to the far curve');
  assert.ok(stars.exponent < far.exponent, 'but they do still move');
  assert.ok(stars.vanishY < world.vanishY);
  assert.ok(stars.vanishY > HEIGHT * far.vanishRatio);
});

test('hitboxes never change with the zoom', () => {
  resetPerspective();
  const far = [0, 0.25, 0.5, 0.94, 0.97, 1].map(hitboxScale);

  settle(true);
  const near = [0, 0.25, 0.5, 0.94, 0.97, 1].map(hitboxScale);

  assert.deepEqual(near, far, 'collision geometry must be identical at any zoom');
  assert.ok(entityScale(0.95) > hitboxScale(0.95), 'while the visual does grow');
});

test('lanes fan out in step with sprite scale, keeping lane fill constant', () => {
  // A sprite occupying a constant fraction of its lane at every depth is what
  // makes lanes readable. Growing scale without fanning lanes breaks it.
  const fillRatios = () => [0.25, 0.5, 0.75, 0.95].map((p) => {
    const laneWidth = laneOffsetFactor(p);   // relative lane spread at this depth
    return entityScale(p) / laneWidth;
  });

  resetPerspective();
  const farFill = fillRatios();
  settle(true);
  const nearFill = fillRatios();

  const spread = (xs) => Math.max(...xs) / Math.min(...xs);
  assert.ok(spread(farFill) < 1.35, `far fill should be near-constant, got ${farFill}`);
  assert.ok(spread(nearFill) < 1.35, `near fill should be near-constant, got ${nearFill}`);
});

test('lane fan leaves the far projection and the player position untouched', () => {
  resetPerspective();
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    assert.equal(laneOffsetFactor(p), p, 'far lanes stay linear in progress');
  }

  // The player sits at progress 1 and must not move when the zoom engages.
  settle(true);
  assert.equal(laneOffsetFactor(1), 1);
  assert.equal(laneOffsetFactor(0), 0, 'spawns stay pinned to the vanishing point');
});

test('a scene restart resets the zoom', () => {
  settle(true);
  assert.equal(getZoom(), 1);
  resetPerspective();
  assert.equal(getZoom(), 0);
});
