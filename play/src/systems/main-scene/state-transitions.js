/**
 * @typedef {{paused:boolean, gameOver:boolean, invincible:boolean, playerCanControl:boolean}} FlowSlice
 * @typedef {{lane:number, moving:boolean, dashing:boolean, jumping:boolean, crouching:boolean, charging:boolean, stretching:boolean}} PlayerSlice
 * @typedef {{score:number, combo:number, beats:number, rapidFire:boolean, rapidFireTimer:number, offScreenTimer:number}} CombatSlice
 * @typedef {{touchActive:boolean, touchFiring:boolean, currentZone:string, jumpChargeAmount:number}} InputSlice
 */

/**
 * @param {FlowSlice} flow
 */
export function applyPauseTransition(flow) {
  flow.paused = true;
}

/**
 * @param {FlowSlice} flow
 */
export function applyResumeTransition(flow) {
  flow.paused = false;
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
