import { gameState } from '../../config.js';
import { sessionHighScore } from '../../storage.js';
import { currentGenre } from '../../audio/music-engine.js';
import { currentDifficulty } from '../../audio/music-ui.js';

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

  this.vanishX = gameState.WIDTH / 2;
  this.vanishY = gameState.HEIGHT * 0.15;

  this.sessionStartTime = Date.now();
  this.maxComboReached = 0;

  this.gameStartTime = this.time.now;

  this.recentDeaths = [];
  this.adaptiveState = {
    isAssisting: false,
    assistStartTime: null,
    currentSpawnMultiplier: 1.0,
    currentSpeedMultiplier: 1.0
  };

  window.trackEvent('game_start', {
    difficulty: currentDifficulty?.name || 'normal',
    genre: currentGenre || 'techno',
    grid_enabled: gameState.gridEnabled,
    high_score: sessionHighScore,
    tutorial_mode: this.isTutorial
  });

  this.isPaused = false;
  this.pauseOverlay = null;
  this.pauseText = null;
  this.wasAutoPaused = false;
  this.pauseScoreText = null;
  this.pauseHighScoreText = null;

  this.isShowingGameOver = false;
  this.isInvincible = false;
  this.playerCanControl = true;

  window.gameScene = this;
  window.currentGameScene = this;
}

export function setupVisibilityAndShutdownHandlers() {
  if (this.visibilityHandler) return;

  this.visibilityHandler = () => {
    const flow = this.stateSlices?.flow;
    if (document.hidden) {
      if (!(flow?.paused ?? this.isPaused) && !(flow?.gameOver ?? this.isShowingGameOver)) {
        this.pauseGame();
        this.wasAutoPaused = true;
      }
    } else if (this.wasAutoPaused) {
      this.wasAutoPaused = false;
      if ((flow?.paused ?? this.isPaused) && this.pauseOverlay) {
        this.pauseOverlay.setVisible(true);
        this.pauseText.setVisible(true);
      }
    }
  };

  document.addEventListener('visibilitychange', this.visibilityHandler);

  this.events.once('shutdown', () => {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.musicWatchdog) {
      this.musicWatchdog.remove(false);
      this.musicWatchdog = null;
    }
  });
}
