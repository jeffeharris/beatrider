import Phaser from 'phaser';
import { saveGameData } from '../../storage.js';

export function updateTutorialAndAdaptiveState(dt) {
  const { flow } = this.stateSlices;
  if (this.isTutorial) {
    this.updateTutorialProgress();
  }

  if (this.adaptiveState.isAssisting && !flow.paused && !flow.gameOver) {
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

// Pause/resume (ESC, SPACE, taps) is handled by ui/menus.js: the scene's keyboard is
// switched off while a menu is open. Returns false while gameplay is frozen.
export function handlePauseAndGridInput() {
  const { flow } = this.stateSlices;

  if (Phaser.Input.Keyboard.JustDown(this.keys.G)) {
    window.GameAPI?.toggleGrid();
  }

  if (Phaser.Input.Keyboard.JustDown(this.keys.C) && typeof this.setPlayerCharacter === 'function') {
    const nextCharacter = this.playerCharacter === 'unicorn' ? 'classic' : 'unicorn';
    const appliedCharacter = this.setPlayerCharacter(nextCharacter);
    saveGameData({ settings: { character: appliedCharacter } });
  }

  return !flow.paused;
}
