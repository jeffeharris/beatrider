import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { saveGameData, sessionHighScore, setSessionHighScore } from '../../storage.js';
import { currentGenre } from '../../audio/music-engine.js';
import { currentDifficulty } from '../../audio/music-ui.js';
import { gameSounds } from '../../audio/game-sounds.js';
import { applyGameOverTransition, applyGameResetTransition } from './state-transitions.js';
import {
  appendRecentDeath,
  buildSurvivalStats,
  getScoreBucket,
  shouldEnableAdaptiveAssist
} from './game-over-state.js';

function updateRecentDeathsAndAdaptiveAssist(scene, score) {
  scene.recentDeaths = appendRecentDeath(scene.recentDeaths || [], score, 3);

  if (shouldEnableAdaptiveAssist(scene.recentDeaths)) {
    scene.adaptiveState.isAssisting = true;
    scene.adaptiveState.assistStartTime = scene.time.now;
    scene.adaptiveState.currentSpawnMultiplier = 0.7;
    scene.adaptiveState.currentSpeedMultiplier = 0.85;
  }
}

function trackGameOverAnalytics(scene, combat, scoreBucket) {
  const sessionTime = scene.sessionStartTime
    ? Math.floor((Date.now() - scene.sessionStartTime) / 1000)
    : 0;

  window.trackEvent('game_over', {
    score: combat.score,
    score_bucket: scoreBucket,
    high_score: sessionHighScore,
    new_high_score: combat.score > sessionHighScore,
    combo_max: scene.maxComboReached || scene.comboCount,
    beats_survived: combat.beats,
    session_time: sessionTime,
    control_type: window.controlType,
    difficulty: currentDifficulty?.name || 'normal',
    genre: currentGenre || 'techno',
    grid_enabled: gameState.gridEnabled
  });

  if (combat.score > 100) {
    window.trackEvent('achievement_unlocked', {
      achievement: 'score_over_100',
      score: combat.score
    });
  }
}

function updateHighScoreIfNeeded(scene, score) {
  const beatHighScore = score > sessionHighScore;
  if (!beatHighScore) return false;

  const previousHigh = sessionHighScore;
  setSessionHighScore(score);
  saveGameData({ highScore: sessionHighScore });

  window.trackEvent('new_high_score', {
    score,
    previous_high: previousHigh,
    improvement: score - previousHigh
  });

  return true;
}

function createGameOverUi(scene, { score, beatHighScore, survivalStats }) {
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.7);
  overlay.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
  overlay.setAlpha(0);
  overlay.setDepth(20000);

  const screenRef = Math.min(gameState.WIDTH, gameState.HEIGHT);
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const mobileMult = isMobile ? 1.2 : 1.0;

  const bigFontSize = `${Math.floor(screenRef * 0.09 * mobileMult)}px`;
  const medFontSize = `${Math.floor(screenRef * 0.05 * mobileMult)}px`;
  const smallFontSize = `${Math.floor(screenRef * 0.03 * mobileMult)}px`;
  const tinyFontSize = `${Math.floor(screenRef * 0.025 * mobileMult)}px`;

  const scoreLabel = scene.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 - screenRef * 0.08, 'SCORE', {
    font: `${medFontSize} monospace`,
    fill: '#0f0'
  });
  scoreLabel.setOrigin(0.5);
  scoreLabel.setAlpha(0);
  scoreLabel.setDepth(20001);

  const scoreText = scene.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2, score.toString(), {
    font: `${bigFontSize} monospace`,
    fill: beatHighScore ? '#ffff00' : '#00ffcc'
  });
  scoreText.setOrigin(0.5);
  scoreText.setAlpha(0);
  scoreText.setShadow(0, 0, beatHighScore ? '#ffff00' : '#00ffcc', 20);
  scoreText.setDepth(20001);

  let congratsText = null;
  let highScoreText = null;

  if (beatHighScore) {
    congratsText = scene.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 + screenRef * 0.1, 'NEW HIGH SCORE!', {
      font: `${medFontSize} monospace`,
      fill: '#ff00ff'
    });
    congratsText.setOrigin(0.5);
    congratsText.setAlpha(0);
    congratsText.setShadow(0, 0, '#ff00ff', 15);
    congratsText.setDepth(20001);

    scene.tweens.add({
      targets: congratsText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  } else {
    highScoreText = scene.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 + screenRef * 0.1, `HIGH SCORE: ${sessionHighScore}`, {
      font: `${smallFontSize} monospace`,
      fill: '#ff0'
    });
    highScoreText.setOrigin(0.5);
    highScoreText.setAlpha(0);
    highScoreText.setDepth(20001);

    scene.tweens.add({
      targets: highScoreText,
      alpha: 0.8,
      duration: 600,
      delay: 800
    });
  }

  const statsY = beatHighScore
    ? gameState.HEIGHT / 2 + screenRef * 0.15
    : gameState.HEIGHT / 2 + screenRef * 0.13;

  const survivalStatsText = scene.add.text(
    gameState.WIDTH / 2,
    statsY,
    `Survived: ${survivalStats.survivalTimeString}  •  ${survivalStats.pointsPerSecond} pts/sec`,
    {
      font: `${tinyFontSize} monospace`,
      fill: '#00ffcc'
    }
  );
  survivalStatsText.setOrigin(0.5);
  survivalStatsText.setAlpha(0);
  survivalStatsText.setDepth(20001);

  scene.tweens.add({
    targets: survivalStatsText,
    alpha: 0.9,
    duration: 600,
    delay: 1000
  });

  const restartText = scene.add.text(gameState.WIDTH / 2, statsY + screenRef * 0.06, 'RESTARTING IN 3...', {
    font: `${smallFontSize} monospace`,
    fill: '#00ffcc'
  });
  restartText.setOrigin(0.5);
  restartText.setAlpha(0);
  restartText.setDepth(20001);

  return {
    overlay,
    scoreLabel,
    scoreText,
    congratsText,
    highScoreText,
    survivalStatsText,
    restartText
  };
}

function startCountdown(scene, restartText) {
  let countdown = 3;
  scene.time.addEvent({
    delay: 1000,
    callback: () => {
      countdown--;
      if (countdown > 0) {
        restartText.setText(`RESTARTING IN ${countdown}...`);
      } else {
        restartText.setText('RESTARTING NOW!');
      }
      scene.tweens.add({
        targets: restartText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    },
    repeat: 2
  });
}

function animateGameOverIntro(scene, ui, beatHighScore) {
  scene.tweens.add({
    targets: ui.overlay,
    alpha: 1,
    duration: 300
  });

  scene.tweens.add({
    targets: ui.scoreLabel,
    alpha: 1,
    duration: 400,
    delay: 200
  });

  scene.tweens.add({
    targets: ui.scoreText,
    alpha: 1,
    scaleX: { from: 0.5, to: 1 },
    scaleY: { from: 0.5, to: 1 },
    duration: 600,
    delay: 400,
    ease: 'Back.out'
  });

  if (beatHighScore && ui.congratsText) {
    scene.tweens.add({
      targets: ui.congratsText,
      alpha: 1,
      duration: 600,
      delay: 800
    });

    try {
      const now = Tone.now();
      gameSounds.powerUp.triggerAttackRelease('C4', '16n', now);
      gameSounds.powerUp.triggerAttackRelease('E4', '16n', now + 0.1);
      gameSounds.powerUp.triggerAttackRelease('G4', '16n', now + 0.2);
      gameSounds.powerUp.triggerAttackRelease('C5', '8n', now + 0.3);
    } catch (e) {}
  }

  scene.tweens.add({
    targets: ui.restartText,
    alpha: 1,
    duration: 400,
    delay: 1200
  });
}

function resetRoundState(scene, slices) {
  const { player, combat, flow, input } = slices;

  applyGameResetTransition({ player, combat, flow, input });
  scene.scoreText.setText('0');
  scene.comboText.setAlpha(0);

  scene.gameStartTime = scene.time.now;
  scene.player.clearTint();
  scene.player.x = scene._laneX(2);
  scene.player.setVisible(true);
  scene.player.setDepth(500);
  scene.crouchTimer = 0;
  if (scene.chargeGlow) scene.chargeGlow.setVisible(false);

  if (scene.invincibilityTween) {
    scene.invincibilityTween.stop();
    scene.invincibilityTween = null;
  }

  scene.invincibilityTween = scene.tweens.add({
    targets: scene.player,
    alpha: { from: 0.3, to: 1 },
    duration: 100,
    yoyo: true,
    repeat: -1
  });

  scene.time.delayedCall(2000, () => {
    flow.invincible = false;
    if (scene.invincibilityTween) {
      scene.invincibilityTween.stop();
      scene.invincibilityTween = null;
      scene.player.setAlpha(1);
    }
  });
}

function scheduleRoundRestart(scene, ui, slices) {
  scene.time.delayedCall(4300, () => {
    scene.tweens.add({
      targets: [
        ui.overlay,
        ui.scoreLabel,
        ui.scoreText,
        ui.restartText,
        ui.congratsText,
        ui.highScoreText,
        ui.survivalStatsText
      ].filter(Boolean),
      alpha: 0,
      duration: 300,
      onComplete: () => {
        ui.overlay.destroy();
        ui.scoreLabel.destroy();
        ui.scoreText.destroy();
        ui.restartText.destroy();
        if (ui.congratsText) ui.congratsText.destroy();
        if (ui.highScoreText) ui.highScoreText.destroy();
        if (ui.survivalStatsText) ui.survivalStatsText.destroy();

        resetRoundState(scene, slices);
      }
    });
  });
}

export function showGameOverScreenSystem() {
  const slices = this.stateSlices;
  const { player, flow, combat, input } = slices;

  applyGameOverTransition(flow);

  updateRecentDeathsAndAdaptiveAssist(this, combat.score);

  const survivalStats = buildSurvivalStats({
    nowMs: this.time.now,
    gameStartTimeMs: this.gameStartTime,
    score: combat.score
  });

  const scoreBucket = getScoreBucket(combat.score);
  trackGameOverAnalytics(this, combat, scoreBucket);

  const beatHighScore = updateHighScoreIfNeeded(this, combat.score);
  const ui = createGameOverUi(this, {
    score: combat.score,
    beatHighScore,
    survivalStats
  });

  startCountdown(this, ui.restartText);
  animateGameOverIntro(this, ui, beatHighScore);
  scheduleRoundRestart(this, ui, { player, combat, flow, input });
}
