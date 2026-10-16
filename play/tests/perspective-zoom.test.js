import test from 'node:test';
import assert from 'node:assert/strict';

const {
  stepZoom,
  easeZoom,
  followTargetX,
  followTowards,
  computeZoomFrame
} = await import('../src/systems/main-scene/perspective-zoom.js');
const { projectY, PLAYER_PROGRESS } = await import('../src/systems/main-scene/perspective.js');
const {
  PERSPECTIVE_EXPONENT,
  PERSPECTIVE_VANISH_RATIO,
  ZOOM_IN_MS,
  ZOOM_OUT_MS,
  ZOOM_CAMERA_NEAR,
  ZOOM_HORIZON_NEAR,
  ZOOM_EXPONENT_NEAR
} = await import('../src/tuning.js');

const SCREEN = { width: 1280, height: 720, playerY: 660 };
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('stepZoom reaches near in ZOOM_IN_MS and far in ZOOM_OUT_MS, clamped', () => {
  close(stepZoom(0, ZOOM_IN_MS, true), 1, 'in');
  close(stepZoom(1, ZOOM_OUT_MS, false), 0, 'out');
  close(stepZoom(0, ZOOM_IN_MS / 2, true), 0.5, 'halfway in');
  assert.equal(stepZoom(1, 50, true), 1);
  assert.equal(stepZoom(0, 50, false), 0);
});

test('easeZoom is a smoothstep pinned at both ends', () => {
  assert.equal(easeZoom(0), 0);
  assert.equal(easeZoom(1), 1);
  assert.equal(easeZoom(0.5), 0.5);
});

test('unzoomed frame is exactly the normal view', () => {
  for (const followX of [0, 300, 640, 1280]) {
    const f = computeZoomFrame({ ease: 0, followX, ...SCREEN });
    assert.equal(f.zoom, 1);
    assert.equal(f.viewLeft, 0);
    assert.equal(f.viewTop, 0);
    assert.equal(f.vanishX, SCREEN.width / 2);
    close(f.vanishY, SCREEN.height * PERSPECTIVE_VANISH_RATIO, 'vanishY');
    assert.equal(f.exponent, PERSPECTIVE_EXPONENT);
  }
});

test('full zoom uses the near camera, horizon and curve', () => {
  const f = computeZoomFrame({ ease: 1, followX: 640, ...SCREEN });
  assert.equal(f.zoom, ZOOM_CAMERA_NEAR);
  assert.equal(f.exponent, ZOOM_EXPONENT_NEAR);
  // Horizon lands at the near fraction of the screen once zoomed onto it.
  close((f.vanishY - f.viewTop) * f.zoom, SCREEN.height * ZOOM_HORIZON_NEAR, 'screen horizon');
});

test('the ship row stays at the same screen height at every zoom', () => {
  for (const ease of [0, 0.25, 0.5, 1]) {
    const f = computeZoomFrame({ ease, followX: 640, ...SCREEN });
    close((SCREEN.playerY - f.viewTop) * f.zoom, SCREEN.playerY, `ease ${ease}`);
  }
});

test('unzoomed, the view is the world wherever the ship is or jumps', () => {
  for (const followX of [-500, 0, 128, 640, 1152, 2000]) {
    const f = computeZoomFrame({ ease: 0, followX, shipY: SCREEN.playerY - 200, ...SCREEN });
    assert.equal(f.viewLeft, 0);
    assert.equal(f.viewTop, 0);
  }
});

test('fully zoomed, the camera centres on the ship even in the outer lanes', () => {
  for (const shipX of [128, 640, 1152]) {
    const f = computeZoomFrame({ ease: 1, followX: shipX, ...SCREEN });
    close((shipX - f.viewLeft) * f.zoom, SCREEN.width / 2, `shipX ${shipX}`);
  }
});

test('fully zoomed, a jump carries the camera: the ship holds its screen height', () => {
  for (const jump of [0, 60, 150, 240]) {
    const shipY = SCREEN.playerY - jump;
    const f = computeZoomFrame({ ease: 1, followX: 640, shipY, ...SCREEN });
    close((shipY - f.viewTop) * f.zoom, SCREEN.playerY, `jump ${jump}`);
    // ...and the horizon stays put on screen, so it reads as rising, not tilting.
    close((f.vanishY - f.viewTop) * f.zoom, SCREEN.height * ZOOM_HORIZON_NEAR, `horizon at jump ${jump}`);
  }
});

test('the vanishing point stays centred in the view', () => {
  const f = computeZoomFrame({ ease: 1, followX: 128, ...SCREEN });
  close((f.vanishX - f.viewLeft) * f.zoom, SCREEN.width / 2, 'screen vanishX');
});

test('the collision depth still projects onto the ship row with the near curve', () => {
  const f = computeZoomFrame({ ease: 1, followX: 640, ...SCREEN });
  assert.equal(projectY(PLAYER_PROGRESS, f.vanishY, SCREEN.playerY, f.exponent), SCREEN.playerY);
});

test('follow targets the ship only while zoomed', () => {
  assert.equal(followTargetX(1280, 128, 0), 640);
  assert.equal(followTargetX(1280, 128, 1), 128);
});

test('followTowards converges without overshooting', () => {
  let x = 0;
  for (let i = 0; i < 200; i++) {
    const next = followTowards(x, 100, 16);
    assert.ok(next >= x && next <= 100);
    x = next;
  }
  assert.ok(100 - x < 1e-6);
});
