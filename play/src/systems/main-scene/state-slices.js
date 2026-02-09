/**
 * @typedef {{ lane:number, moving:boolean, dashing:boolean, jumping:boolean, crouching:boolean, charging:boolean, stretching:boolean }} PlayerStateSlice
 * @typedef {{ score:number, combo:number, beats:number, rapidFire:boolean, rapidFireTimer:number, offScreenTimer:number }} CombatStateSlice
 * @typedef {{ paused:boolean, gameOver:boolean, invincible:boolean, playerCanControl:boolean }} FlowStateSlice
 * @typedef {{ touchActive:boolean, touchFiring:boolean, currentZone:string, jumpChargeAmount:number }} InputStateSlice
 * @typedef {{ player: PlayerStateSlice, combat: CombatStateSlice, flow: FlowStateSlice, input: InputStateSlice }} MainSceneStateSlices
 */

export function initializeMainSceneStateSlices() {
  /** @type {MainSceneStateSlices} */
  this.stateSlices = {
    player: {
      lane: 2,
      moving: false,
      dashing: false,
      jumping: false,
      crouching: false,
      charging: false,
      stretching: false
    },
    combat: {
      score: 0,
      combo: 1,
      beats: 0,
      rapidFire: false,
      rapidFireTimer: 0,
      offScreenTimer: 0
    },
    flow: {
      paused: false,
      gameOver: false,
      invincible: false,
      playerCanControl: true
    },
    input: {
      touchActive: false,
      touchFiring: false,
      currentZone: 'center',
      jumpChargeAmount: 0
    }
  };
}
