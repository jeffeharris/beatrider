/**
 * @typedef {'move_left'|'move_right'|'dash_left'|'dash_right'|'jump'|'super_jump'|'fire'|'resume'} MainSceneActionType
 * @typedef {'keyboard'|'touch'|'unknown'} MainSceneActionSource
 * @typedef {{ source?: MainSceneActionSource, chargePercent?: number }} MainSceneActionPayload
 */

/** @type {{ MOVE_LEFT: MainSceneActionType, MOVE_RIGHT: MainSceneActionType, DASH_LEFT: MainSceneActionType, DASH_RIGHT: MainSceneActionType, JUMP: MainSceneActionType, SUPER_JUMP: MainSceneActionType, FIRE: MainSceneActionType, RESUME: MainSceneActionType }} */
export const MAIN_SCENE_ACTIONS = {
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  DASH_LEFT: 'dash_left',
  DASH_RIGHT: 'dash_right',
  JUMP: 'jump',
  SUPER_JUMP: 'super_jump',
  FIRE: 'fire',
  RESUME: 'resume'
};

/**
 * @param {MainSceneActionType} action
 * @param {MainSceneActionPayload} [payload]
 */
export function dispatchMainSceneAction(action, payload = {}) {
  this.lastActionType = action;
  this.lastActionSource = payload.source || 'unknown';
  this.lastActionAt = this.time.now;

  switch (action) {
    case MAIN_SCENE_ACTIONS.MOVE_LEFT:
      this.moveLeft();
      break;
    case MAIN_SCENE_ACTIONS.MOVE_RIGHT:
      this.moveRight();
      break;
    case MAIN_SCENE_ACTIONS.DASH_LEFT:
      this.dashLeft();
      break;
    case MAIN_SCENE_ACTIONS.DASH_RIGHT:
      this.dashRight();
      break;
    case MAIN_SCENE_ACTIONS.JUMP:
      this.jump();
      break;
    case MAIN_SCENE_ACTIONS.SUPER_JUMP:
      this.superJump(payload.chargePercent ?? 1.0);
      break;
    case MAIN_SCENE_ACTIONS.FIRE:
      this._fire();
      break;
    case MAIN_SCENE_ACTIONS.RESUME:
      this.resumeGame();
      break;
    default:
      break;
  }
}
