import Phaser from 'phaser';
import { gameState } from '../../config.js';
import { saveGameData } from '../../storage.js';
import { uiState, updateGridButton } from '../../audio/music-ui.js';
import { MAIN_SCENE_ACTIONS, dispatchMainSceneAction } from './action-dispatch.js';

export function updateTutorialAndAdaptiveState(dt) {
  const flow = this.stateSlices?.flow;
  if (this.isTutorial) {
    this.updateTutorialProgress();
  }

  if (this.adaptiveState.isAssisting && !(flow?.paused ?? this.isPaused) && !(flow?.gameOver ?? this.isShowingGameOver)) {
    const assistDuration = (this.time.now - this.adaptiveState.assistStartTime) / 1000;

    if (assistDuration > 90) {
      this.adaptiveState.isAssisting = false;
      this.adaptiveState.currentSpawnMultiplier = 1.0;
      this.adaptiveState.currentSpeedMultiplier = 1.0;
    } else if (assistDuration > 60) {
      this.adaptiveState.currentSpawnMultiplier = 0.9;
      this.adaptiveState.currentSpeedMultiplier = 0.95;
    } else if (assistDuration > 30) {
      this.adaptiveState.currentSpawnMultiplier = 0.8;
      this.adaptiveState.currentSpeedMultiplier = 0.9;
    }
  }
}

export function handlePauseAndGridInput() {
  const flow = this.stateSlices?.flow;
  const input = this.stateSlices?.input;

  if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
    if (flow?.gameOver ?? this.isShowingGameOver) return true;
    if (!(flow?.paused ?? this.isPaused)) {
      this.pauseGame();
    } else {
      this.resumeGame();
    }
  }

  if (Phaser.Input.Keyboard.JustDown(this.keys.G)) {
    this.gridVisible = !this.gridVisible;
    gameState.gridEnabled = this.gridVisible;
    saveGameData({ settings: { gridEnabled: gameState.gridEnabled } });

    if (!this.gridVisible && this.gridGraphics) {
      this.gridGraphics.clear();
    } else if (this.gridVisible && (flow?.paused ?? this.isPaused)) {
      this._drawPerspectiveGrid();
    }

    uiState.gridVisible = this.gridVisible;
    updateGridButton();
  }

  if (flow?.paused ?? this.isPaused) {
    if ((this.keys.SPACE.isDown || (input?.touchFiring ?? this.isTouchFiring)) && !this.isHandlingFeedback) {
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.RESUME, {
        source: this.keys.SPACE.isDown ? 'keyboard' : 'touch'
      });
      this.fireBlockTime = this.time.now + 100;
    }
    return false;
  }

  return true;
}
