import { gameState } from '../../config.js';
import { sessionHighScore } from '../../storage.js';
import { currentGenre } from '../../audio/music-engine.js';
import { currentDifficulty } from '../../audio/music-ui.js';
import { initializeMainSceneStateSlices } from './state-slices.js';
import { createGenreAttributionState } from '../../leaderboard/genre-attribution.js';
import { setHudVisible } from '../../ui/menus.js';

export function initCreateSceneState(data) {
  this.isTutorial = data?.tutorialMode || false;
  this.tutorialWave = 0;
  this.tutorialText = null;
  this.tutorialProgress = {
    shotsHit: 0,
    movementsMade: 0,
    jumpsMade: 0,
    dashesMade: 0,
    starsCollected: 0
  };
  this.tutorialWaveStarted = false;

  this.sessionStartTime = Date.now();
  this.maxComboReached = 0;

  this.gameStartTime = this.time.now;

  // Snapshot the high score as it stood before this run. sessionHighScore is bumped
  // live during play, so it is the only reliable baseline for "did this run beat it".
  this.runStartHighScore = sessionHighScore;
  this.genreAttribution = createGenreAttributionState(currentGenre);

  this.recentDeaths = [];
  this.adaptiveState = {
    isAssisting: false,
    assistStartTime: null,
    currentSpawnMultiplier: 1.0,
    currentSpeedMultiplier: 1.0
  };

  window.trackEvent('game_start', {
    difficulty: currentDifficulty?.key || 'normal',
    genre: currentGenre || 'techno',
    grid_enabled: gameState.gridEnabled,
    high_score: sessionHighScore,
    tutorial_mode: this.isTutorial
  });

  initializeMainSceneStateSlices.call(this);

  window.gameScene = this;
  window.currentGameScene = this;
}

export function setupVisibilityAndShutdownHandlers() {
  if (this.visibilityHandler) return;

  // Leaving the app mid-run (or mid-settings, with music playing) lands on the pause menu.
  this.visibilityHandler = () => {
    if (document.hidden) this.pauseGame();
  };

  document.addEventListener('visibilitychange', this.visibilityHandler);
  setHudVisible(true);

  this.events.once('shutdown', () => {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      // Cleared so a restarted scene registers its handler again.
      this.visibilityHandler = null;
    }
    setHudVisible(false);
    if (this.musicWatchdog) {
      this.musicWatchdog.remove(false);
      this.musicWatchdog = null;
    }
  });
}
