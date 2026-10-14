import test from 'node:test';
import assert from 'node:assert/strict';

const {
  PERSPECTIVE_EXPONENT,
  PERSPECTIVE_SCALE_BASE,
  PERSPECTIVE_SCALE_RANGE,
  PLAYER_PROGRESS,
  perspectiveCurve,
  projectY,
  unprojectY,
  perspectiveScale,
  laneSpread
} = await import('../src/systems/main-scene/perspective.js');

// Representative screen setup: 720px tall, vanishing point at 15% and the ship
// 60px off the bottom (as in the main scene on desktop).
const HEIGHT = 720;
const VANISH_Y = HEIGHT * 0.15;
const PLAYER_Y = HEIGHT - 60;

test('perspectiveCurve matches Math.pow(progress, 2.5) exactly', () => {
  for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.94, 1, 1.1]) {
    assert.equal(perspectiveCurve(p), Math.pow(p, 2.5));
  }
});

test('projectY puts PLAYER_PROGRESS exactly on the ship row', () => {
  assert.equal(projectY(PLAYER_PROGRESS, VANISH_Y, PLAYER_Y), PLAYER_Y);
});

test('projectY starts at the vanishing point and follows the 2.5 curve', () => {
  assert.equal(projectY(0, VANISH_Y, PLAYER_Y), VANISH_Y);
  for (const p of [0.1, 0.3, 0.5, 0.9]) {
    const expected = VANISH_Y + (PLAYER_Y - VANISH_Y) * Math.pow(p / PLAYER_PROGRESS, 2.5);
    assert.equal(projectY(p, VANISH_Y, PLAYER_Y), expected);
  }
});

test('collision window (0.94-0.97) straddles the ship row', () => {
  assert.ok(projectY(0.94, VANISH_Y, PLAYER_Y) < PLAYER_Y);
  assert.ok(projectY(0.97, VANISH_Y, PLAYER_Y) > PLAYER_Y);
});

test('progress past the ship continues below it', () => {
  assert.ok(projectY(1, VANISH_Y, PLAYER_Y) > PLAYER_Y);
});

test('projectY clamps negative progress to the vanishing point instead of NaN', () => {
  assert.equal(projectY(-0.05, VANISH_Y, PLAYER_Y), VANISH_Y);
});

test('unprojectY maps the ship row back to PLAYER_PROGRESS', () => {
  assert.ok(Math.abs(unprojectY(PLAYER_Y, VANISH_Y, PLAYER_Y) - PLAYER_PROGRESS) < 1e-12);
});

test('unprojectY is the inverse of projectY', () => {
  for (const p of [0, 0.1, 0.33, 0.5, 0.77, PLAYER_PROGRESS, 1]) {
    const y = projectY(p, VANISH_Y, PLAYER_Y);
    const roundTripped = unprojectY(y, VANISH_Y, PLAYER_Y);
    assert.ok(Math.abs(roundTripped - p) < 1e-12, `round-trip drifted for progress ${p}: got ${roundTripped}`);
  }
});

test('laneSpread is 0 at the horizon and exactly 1 on the ship row', () => {
  assert.equal(laneSpread(0), 0);
  assert.equal(laneSpread(PLAYER_PROGRESS), 1);
  assert.ok(laneSpread(1) > 1);
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
  assert.equal(PLAYER_PROGRESS, 0.955);
});
