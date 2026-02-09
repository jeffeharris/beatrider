import { initCreateSceneState, setupVisibilityAndShutdownHandlers } from './create-setup-state.js';
import { setupSceneVisualBaseAndTutorialUI, startMusicAndWatchdog } from './create-setup-audio-tutorial.js';
import { initializeSceneWorldAndHUD } from './create-setup-world.js';
import { setupSceneGameApi } from './create-setup-gameapi.js';

export function createMainSceneSystem(data) {
  initCreateSceneState.call(this, data);
  setupVisibilityAndShutdownHandlers.call(this);
  setupSceneVisualBaseAndTutorialUI.call(this);
  startMusicAndWatchdog.call(this);
  initializeSceneWorldAndHUD.call(this);
  setupSceneGameApi.call(this);
}
