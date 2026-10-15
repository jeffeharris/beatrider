import test from 'node:test';
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node', maxTouchPoints: 0 },
  configurable: true
});
globalThis.window = { innerWidth: 1280, innerHeight: 720 };
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const { computeGaugeLayout } = await import('../src/systems/main-scene/resource-bar.js');

const SCREENS = {
  desktop: { width: 1280, height: 720, comboY: 720 - 96 },
  phone: { width: 390, height: 844, comboY: 844 - 128 },
  landscapePhone: { width: 844, height: 390, comboY: 390 - 128 }
};

test('ammo hugs the left edge and shield the right edge', () => {
  for (const screen of Object.values(SCREENS)) {
    const { ammo, shield } = computeGaugeLayout(screen);
    assert.ok(ammo.x > 0 && ammo.x < 20);
    assert.ok(shield.x + shield.w < screen.width && shield.x + shield.w > screen.width - 20);
    assert.equal(ammo.y, shield.y);
    assert.equal(ammo.h, shield.h);
  }
});

test('gauges and their icons stay above the combo row', () => {
  for (const screen of Object.values(SCREENS)) {
    const { ammo } = computeGaugeLayout(screen);
    assert.ok(ammo.y + ammo.h < ammo.iconY);
    assert.ok(ammo.iconY + 16 < screen.comboY, `icon overlaps combo row on ${screen.width}x${screen.height}`);
  }
});

test('gauges stay in the lower part of the screen', () => {
  for (const screen of Object.values(SCREENS)) {
    const { ammo } = computeGaugeLayout(screen);
    assert.ok(ammo.y >= screen.height * 0.25);
    assert.ok(ammo.h > 0);
  }
});

test('gauge height is capped on tall screens', () => {
  const { ammo } = computeGaugeLayout({ width: 1080, height: 2400, comboY: 2400 - 128 });
  assert.equal(ammo.h, 320);
});
