import { MAX_AMMO, MAX_SHIELD, ENERGY_PER_PICKUP } from '../../config.js';

/**
 * Apply damage to shield. Returns new shield value and whether the hit was lethal.
 * @param {{ shield: number, damage: number }} params
 * @returns {{ nextShield: number, lethal: boolean }}
 */
export function applyDamage({ shield, damage }) {
  if (shield <= 0) return { nextShield: 0, lethal: true };
  const nextShield = Math.max(0, shield - damage);
  return { nextShield, lethal: false };
}

/**
 * Fill resources from a green ball pickup. Energy flows: ammo → shield → rapid fire.
 * @param {{ ammo: number, shield: number }} params
 * @returns {{ nextAmmo: number, nextShield: number, triggerRapidFire: boolean }}
 */
export function fillResourcesFromPickup({ ammo, shield }) {
  let energy = ENERGY_PER_PICKUP;
  let nextAmmo = ammo;
  let nextShield = shield;
  let triggerRapidFire = false;

  // Priority 1: Fill ammo
  if (nextAmmo < MAX_AMMO) {
    const ammoSpace = MAX_AMMO - nextAmmo;
    const ammoFill = Math.min(energy, ammoSpace);
    nextAmmo += ammoFill;
    energy -= ammoFill;
  }

  // Priority 2: Fill shield (only if ammo is full)
  if (energy > 0 && nextShield < MAX_SHIELD) {
    const shieldSpace = MAX_SHIELD - nextShield;
    const shieldFill = Math.min(energy, shieldSpace);
    nextShield += shieldFill;
    energy -= shieldFill;
  }

  // Priority 3: Trigger rapid fire (both maxed)
  if (energy > 0) {
    triggerRapidFire = true;
  }

  return { nextAmmo, nextShield, triggerRapidFire };
}
