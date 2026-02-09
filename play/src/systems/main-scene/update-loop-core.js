import { updateTutorialAndAdaptiveState, handlePauseAndGridInput } from './update-loop-core-state.js';
import { updateIdleWobble, updateTimeBasedTouchCharge, updateComboMeter, updatePulseAndGrid } from './update-loop-core-visuals.js';
import { handleMovementInputAndOffscreen, handleCrouchChargeAndJump, handleFiringInput } from './update-loop-core-player-actions.js';
import { assertMainSceneStateDev, monitorAndHealPlayerLaneDesync, updateDebugHudSystem } from './debug-tools.js';

export function runUpdateLoopCore(dt) {
  assertMainSceneStateDev.call(this);

  updateTutorialAndAdaptiveState.call(this, dt);

  if (!handlePauseAndGridInput.call(this)) {
    updateDebugHudSystem.call(this);
    return null;
  }

  updateIdleWobble.call(this, dt);
  updateTimeBasedTouchCharge.call(this, dt);
  updateComboMeter.call(this);

  this.updateStarfield(dt);
  this.updateTrails(dt);

  const shifts = updatePulseAndGrid.call(this, dt);

  handleMovementInputAndOffscreen.call(this, dt);
  handleCrouchChargeAndJump.call(this, dt);
  handleFiringInput.call(this);
  monitorAndHealPlayerLaneDesync.call(this);
  updateDebugHudSystem.call(this);

  return shifts;
}
