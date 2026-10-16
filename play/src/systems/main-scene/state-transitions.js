/**
 * @typedef {{paused:boolean, gameOver:boolean, invincible:boolean, playerCanControl:boolean, menu?:string, settingsReturnTo?:string}} FlowSlice
 * @typedef {{lane:number, moving:boolean, dashing:boolean, jumping:boolean, crouching:boolean, charging:boolean, stretching:boolean}} PlayerSlice
 * @typedef {{score:number, combo:number, beats:number, rapidFire:boolean, rapidFireTimer:number, offScreenTimer:number}} CombatSlice
 * @typedef {{touchActive:boolean, touchFiring:boolean, currentZone:string, jumpChargeAmount:number}} InputSlice
 */

/**
 * Which menu is on screen. Any menu freezes gameplay (flow.paused); only the
 * pause menu also stops the music, so settings changes can be heard live.
 */
export const MENU = Object.freeze({ NONE: 'none', PAUSE: 'pause', SETTINGS: 'settings' });

/**
 * Open the pause menu, from play or from settings.
 * @param {FlowSlice} flow
 * @returns {boolean} whether anything changed
 */
export function applyPauseTransition(flow) {
  if (flow.gameOver || flow.menu === MENU.PAUSE) return false;
  flow.paused = true;
  flow.menu = MENU.PAUSE;
  return true;
}

/**
 * Close every menu and return to play.
 * @param {FlowSlice} flow
 * @returns {boolean} whether anything changed
 */
export function applyResumeTransition(flow) {
  if (!flow.paused) return false;
  flow.paused = false;
  flow.menu = MENU.NONE;
  return true;
}

/**
 * Open settings over play or over the pause menu; closing returns to whichever it was.
 * @param {FlowSlice} flow
 * @returns {boolean} whether anything changed
 */
export function applyOpenSettingsTransition(flow) {
  if (flow.gameOver || flow.menu === MENU.SETTINGS) return false;
  flow.settingsReturnTo = flow.menu === MENU.PAUSE ? MENU.PAUSE : MENU.NONE;
  flow.paused = true;
  flow.menu = MENU.SETTINGS;
  return true;
}

/**
 * @param {FlowSlice} flow
 * @returns {boolean} whether anything changed
 */
export function applyCloseSettingsTransition(flow) {
  if (flow.menu !== MENU.SETTINGS) return false;
  flow.menu = flow.settingsReturnTo === MENU.PAUSE ? MENU.PAUSE : MENU.NONE;
  flow.paused = flow.menu !== MENU.NONE;
  return true;
}

/**
 * Music plays during play and while settings is open; only the pause menu silences it.
 * @param {FlowSlice} flow
 */
export function shouldMusicPlay(flow) {
  return flow.menu !== MENU.PAUSE;
}

/**
 * @param {FlowSlice} flow
 */
export function applyGameOverTransition(flow) {
  flow.gameOver = true;
  flow.playerCanControl = false;
}

/**
 * @param {{ player: PlayerSlice, combat: CombatSlice, flow: FlowSlice, input: InputSlice }} slices
 */
export function applyGameResetTransition(slices) {
  const { player, combat, flow, input } = slices;
  combat.score = 0;
  combat.combo = 1;
  combat.beats = 0;
  combat.rapidFire = false;
  combat.rapidFireTimer = 0;
  combat.ammo = 100;
  combat.shield = 0;
  combat.rapidFireFromShield = false;

  player.lane = 2;
  player.jumping = false;
  player.crouching = false;
  player.stretching = false;
  player.dashing = false;
  player.moving = false;
  player.charging = false;

  input.touchFiring = false;
  input.jumpChargeAmount = 0;

  flow.gameOver = false;
  flow.playerCanControl = true;
}

/**
 * @param {{ player: PlayerSlice, input: InputSlice, superJumpThreshold?: number }} params
 * @returns {'super_jump'|'jump'|null}
 */
export function resolveTouchReleaseAction(params) {
  const { player, input, superJumpThreshold = 0.3 } = params;
  if (!player.charging || input.jumpChargeAmount <= 0) return null;
  if (player.jumping) return null;
  return input.jumpChargeAmount > superJumpThreshold ? 'super_jump' : 'jump';
}

/**
 * @param {{ player: PlayerSlice, combat: CombatSlice, lanes?: number }} params
 * @returns {boolean}
 */
export function recoverOffScreenPlayer(params) {
  const { player, combat, lanes = 5 } = params;
  if (player.lane >= 0 && player.lane < lanes) return false;
  if (player.lane < 0) player.lane = 0;
  else if (player.lane >= lanes) player.lane = lanes - 1;
  combat.offScreenTimer = 0;
  return true;
}
