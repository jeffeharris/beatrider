import { updateTutorialAndAdaptiveState, handlePauseAndGridInput } from './update-loop-core-state.js';
import { updateIdleWobble, updateTimeBasedTouchCharge, updateComboMeter, updatePulseAndGrid, updatePerspectiveZoom } from './update-loop-core-visuals.js';
import { updateResourceBarSystem } from './resource-bar.js';
import { handleMovementInputAndOffscreen, handleCrouchChargeAndJump, handleFiringInput } from './update-loop-core-player-actions.js';
import { assertMainSceneStateDev, monitorAndHealPlayerLaneDesync, updateDebugHudSystem } from './debug-tools.js';
import { currentGenre } from '../../audio/music-engine.js';
import { recordGenreSwitch } from '../../leaderboard/genre-attribution.js';

export function runUpdateLoopCore(dt) {
  assertMainSceneStateDev.call(this);

  updateTutorialAndAdaptiveState.call(this, dt);

  if (!handlePauseAndGridInput.call(this)) {
    updateDebugHudSystem.call(this);
    return null;
  }

  // Sample the live genre each frame. switchGenre() is driven by DOM buttons in the
  // settings drawer and exposes no scene-facing event, so polling keeps the music UI
  // decoupled from the scene; recordGenreSwitch is a no-op while the genre is unchanged.
  // Sits after the pause gate, and uses elapsed play time, so paused time is excluded.
  if (this.genreAttribution) {
    this.genreAttribution = recordGenreSwitch(this.genreAttribution, {
      genre: currentGenre,
      elapsedMs: this.time.now - this.gameStartTime
    });
  }

  updateIdleWobble.call(this, dt);
  updateTimeBasedTouchCharge.call(this, dt);
  updateComboMeter.call(this);
  updateResourceBarSystem.call(this);

  // Must precede every consumer of the perspective curve this frame.
  updatePerspectiveZoom.call(this, dt);

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
