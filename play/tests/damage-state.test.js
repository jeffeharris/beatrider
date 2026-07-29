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

const { applyDamage, fillResourcesFromPickup } = await import('../src/systems/main-scene/damage-state.js');

test('damage is lethal without shield', () => {
  assert.deepEqual(
    applyDamage({ shield: 0, damage: 15 }),
    { nextShield: 0, lethal: true }
  );
});

test('positive shield absorbs one hit even when depleted', () => {
  assert.deepEqual(
    applyDamage({ shield: 10, damage: 50 }),
    { nextShield: 0, lethal: false }
  );
});

test('pickup energy fills ammo before shield', () => {
  assert.deepEqual(
    fillResourcesFromPickup({ ammo: 90, shield: 10 }),
    { nextAmmo: 100, nextShield: 25, triggerRapidFire: false }
  );
});

test('pickup overflow triggers rapid fire when resources are full', () => {
  assert.deepEqual(
    fillResourcesFromPickup({ ammo: 100, shield: 50 }),
    { nextAmmo: 100, nextShield: 50, triggerRapidFire: true }
  );
});
