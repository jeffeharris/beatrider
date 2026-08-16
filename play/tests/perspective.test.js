import test from 'node:test';
import assert from 'node:assert/strict';

const {
  PERSPECTIVE_EXPONENT,
  PERSPECTIVE_SCALE_BASE,
  PERSPECTIVE_SCALE_RANGE,
  perspectiveCurve,
  projectY,
  unprojectY,
  perspectiveScale
} = await import('../src/systems/main-scene/perspective.js');

// Representative screen setup: 720px tall, vanishing point at 15% (as in the
// main scene, where vanishY = HEIGHT * 0.15).
const HEIGHT = 720;
const VANISH_Y = HEIGHT * 0.15;

test('perspectiveCurve matches Math.pow(progress, 2.5) exactly', () => {
  for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.94, 1, 1.1]) {
    assert.equal(perspectiveCurve(p), Math.pow(p, 2.5));
  }
});

test('projectY reproduces the original inline formula exactly', () => {
  for (const p of [0, 0.3, 0.5, 0.9, 1]) {
    const expected = VANISH_Y + (HEIGHT - VANISH_Y) * Math.pow(p, 2.5);
    assert.equal(projectY(p, VANISH_Y, HEIGHT), expected);
  }
});

test('projectY boundary values: 0 maps to vanishY, 1 maps to height', () => {
  assert.equal(projectY(0, VANISH_Y, HEIGHT), VANISH_Y);
  assert.equal(projectY(1, VANISH_Y, HEIGHT), HEIGHT);
});

test('unprojectY reproduces the original inline inverse exactly', () => {
  for (const y of [VANISH_Y, 300, 500, HEIGHT - 60, HEIGHT]) {
    const normalizedY = (y - VANISH_Y) / (HEIGHT - VANISH_Y);
    assert.equal(unprojectY(y, VANISH_Y, HEIGHT), Math.pow(normalizedY, 1 / 2.5));
  }
});

test('unprojectY is the inverse of projectY', () => {
  for (const p of [0, 0.1, 0.33, 0.5, 0.77, 1]) {
    const y = projectY(p, VANISH_Y, HEIGHT);
    const roundTripped = unprojectY(y, VANISH_Y, HEIGHT);
    assert.ok(Math.abs(roundTripped - p) < 1e-12, `round-trip drifted for progress ${p}: got ${roundTripped}`);
  }
});

test('perspectiveScale matches 0.1 + progress * 1.2 exactly', () => {
  for (const p of [0, 0.25, 0.5, 0.94, 1, 1.1]) {
    assert.equal(perspectiveScale(p), 0.1 + p * 1.2);
  }
});

test('perspectiveScale boundaries: tiny at vanishing point, full size at player row', () => {
  assert.equal(perspectiveScale(0), PERSPECTIVE_SCALE_BASE);
  assert.equal(perspectiveScale(1), PERSPECTIVE_SCALE_BASE + PERSPECTIVE_SCALE_RANGE);
});

test('exported constants keep the tuned values', () => {
  assert.equal(PERSPECTIVE_EXPONENT, 2.5);
  assert.equal(PERSPECTIVE_SCALE_BASE, 0.1);
  assert.equal(PERSPECTIVE_SCALE_RANGE, 1.2);
});
