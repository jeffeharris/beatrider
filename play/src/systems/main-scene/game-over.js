import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { saveGameData, sessionHighScore, setSessionHighScore } from '../../storage.js';
import { currentGenre } from '../../audio/music-engine.js';
import { currentDifficulty } from '../../audio/music-ui.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function showGameOverScreenSystem() {
  const { player, flow, combat, input } = this.stateSlices;
  flow.gameOver = true;
  flow.playerCanControl = false;

  this.recentDeaths.push({
    score: combat.score,
    timestamp: Date.now()
  });

  if (this.recentDeaths.length > 3) {
    this.recentDeaths.shift();
  }

  if (this.recentDeaths.length === 3 && this.recentDeaths.every(death => death.score < 1000)) {
    this.adaptiveState.isAssisting = true;
    this.adaptiveState.assistStartTime = this.time.now;
    this.adaptiveState.currentSpawnMultiplier = 0.7;
    this.adaptiveState.currentSpeedMultiplier = 0.85;
  }

  const survivalTimeMs = this.time.now - this.gameStartTime;
  const survivalSeconds = Math.floor(survivalTimeMs / 1000);
  const survivalMinutes = Math.floor(survivalSeconds / 60);
  const survivalSecondsRemainder = survivalSeconds % 60;
  const survivalTimeString = `${survivalMinutes}:${survivalSecondsRemainder.toString().padStart(2, '0')}`;

  const pointsPerSecond = survivalSeconds > 0 ? (combat.score / survivalSeconds).toFixed(1) : '0.0';

  const scoreBucket = combat.score < 100
    ? '0-99'
    : combat.score < 500
      ? '100-499'
      : combat.score < 1000
        ? '500-999'
        : combat.score < 2500
          ? '1000-2499'
          : combat.score < 5000
            ? '2500-4999'
            : '5000+';

  const sessionTime = this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;

  window.trackEvent('game_over', {
    score: combat.score,
    score_bucket: scoreBucket,
    high_score: sessionHighScore,
    new_high_score: combat.score > sessionHighScore,
    combo_max: this.maxComboReached || this.comboCount,
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

  const overlay = this.add.graphics();
  overlay.fillStyle(0x000000, 0.7);
  overlay.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
  overlay.setAlpha(0);
  overlay.setDepth(20000);

  const beatHighScore = combat.score > sessionHighScore;
  if (beatHighScore) {
    setSessionHighScore(combat.score);
    saveGameData({ highScore: sessionHighScore });

    window.trackEvent('new_high_score', {
      score: combat.score,
      previous_high: this.sessionHighScore || 0,
      improvement: combat.score - (this.sessionHighScore || 0)
    });
  }

  const screenRef = Math.min(gameState.WIDTH, gameState.HEIGHT);
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const mobileMult = isMobile ? 1.2 : 1.0;
  const bigFontSize = `${Math.floor(screenRef * 0.09 * mobileMult)}px`;
  const medFontSize = `${Math.floor(screenRef * 0.05 * mobileMult)}px`;
  const smallFontSize = `${Math.floor(screenRef * 0.03 * mobileMult)}px`;
  const tinyFontSize = `${Math.floor(screenRef * 0.025 * mobileMult)}px`;

  const scoreLabel = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 - screenRef * 0.08, 'SCORE', {
    font: `${medFontSize} monospace`,
    fill: '#0f0'
  });
  scoreLabel.setOrigin(0.5);
  scoreLabel.setAlpha(0);
  scoreLabel.setDepth(20001);

  const scoreText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2, combat.score.toString(), {
    font: `${bigFontSize} monospace`,
    fill: beatHighScore ? '#ffff00' : '#00ffcc'
  });
  scoreText.setOrigin(0.5);
  scoreText.setAlpha(0);
  scoreText.setShadow(0, 0, beatHighScore ? '#ffff00' : '#00ffcc', 20);
  scoreText.setDepth(20001);

  let congratsText = null;
  if (beatHighScore) {
    congratsText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 + screenRef * 0.1, 'NEW HIGH SCORE!', {
      font: `${medFontSize} monospace`,
      fill: '#ff00ff'
    });
    congratsText.setOrigin(0.5);
    congratsText.setAlpha(0);
    congratsText.setShadow(0, 0, '#ff00ff', 15);
    congratsText.setDepth(20001);

    this.tweens.add({
      targets: congratsText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  } else {
    const highScoreText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 + screenRef * 0.1, `HIGH SCORE: ${sessionHighScore}`, {
      font: `${smallFontSize} monospace`,
      fill: '#ff0'
    });
    highScoreText.setOrigin(0.5);
    highScoreText.setAlpha(0);
    highScoreText.setData('isHighScoreText', true);

    this.tweens.add({
      targets: highScoreText,
      alpha: 0.8,
      duration: 600,
      delay: 800
    });
  }

  const statsY = beatHighScore ? gameState.HEIGHT / 2 + screenRef * 0.15 : gameState.HEIGHT / 2 + screenRef * 0.13;
  const survivalStatsText = this.add.text(gameState.WIDTH / 2, statsY, `Survived: ${survivalTimeString}  •  ${pointsPerSecond} pts/sec`, {
    font: `${tinyFontSize} monospace`,
    fill: '#00ffcc'
  });
  survivalStatsText.setOrigin(0.5);
  survivalStatsText.setAlpha(0);
  survivalStatsText.setDepth(20001);
  survivalStatsText.setData('isSurvivalStats', true);

  this.tweens.add({
    targets: survivalStatsText,
    alpha: 0.9,
    duration: 600,
    delay: 1000
  });

  const restartY = statsY + screenRef * 0.06;
  const restartText = this.add.text(gameState.WIDTH / 2, restartY, 'RESTARTING IN 3...', {
    font: `${smallFontSize} monospace`,
    fill: '#00ffcc'
  });
  restartText.setOrigin(0.5);
  restartText.setAlpha(0);
  restartText.setDepth(20001);

  let countdown = 3;
  const countdownTimer = this.time.addEvent({
    delay: 1000,
    callback: () => {
      countdown--;
      if (countdown > 0) {
        restartText.setText(`RESTARTING IN ${countdown}...`);
      } else {
        restartText.setText('RESTARTING NOW!');
      }
      this.tweens.add({
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

  this.tweens.add({
    targets: overlay,
    alpha: 1,
    duration: 300
  });

  this.tweens.add({
    targets: scoreLabel,
    alpha: 1,
    duration: 400,
    delay: 200
  });

  this.tweens.add({
    targets: scoreText,
    alpha: 1,
    scaleX: { from: 0.5, to: 1 },
    scaleY: { from: 0.5, to: 1 },
    duration: 600,
    delay: 400,
    ease: 'Back.out'
  });

  if (congratsText) {
    this.tweens.add({
      targets: congratsText,
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

  this.tweens.add({
    targets: restartText,
    alpha: 1,
    duration: 400,
    delay: 1200
  });

  this.time.delayedCall(4300, () => {
    const highScoreElement = this.children.list.find(child => child && child.getData && child.getData('isHighScoreText'));
    const survivalStatsElement = this.children.list.find(child => child && child.getData && child.getData('isSurvivalStats'));

    this.tweens.add({
      targets: [overlay, scoreLabel, scoreText, restartText, congratsText, highScoreElement, survivalStatsText].filter(Boolean),
      alpha: 0,
      duration: 300,
      onComplete: () => {
        overlay.destroy();
        scoreLabel.destroy();
        scoreText.destroy();
        restartText.destroy();
        if (congratsText) congratsText.destroy();
        if (highScoreElement) highScoreElement.destroy();
        if (survivalStatsText) survivalStatsText.destroy();

        combat.score = 0;
        this.scoreText.setText('0');
        combat.combo = 1;
        this.comboText.setAlpha(0);

        combat.beats = 0;

        this.gameStartTime = this.time.now;

        combat.rapidFire = false;
        combat.rapidFireTimer = 0;
        this.player.clearTint();

        player.lane = 2;
        this.player.x = this._laneX(2);
        this.player.setVisible(true);
        this.player.setDepth(500);

        player.jumping = false;
        player.crouching = false;
        player.stretching = false;
        player.dashing = false;
        player.moving = false;
        player.charging = false;
        input.touchFiring = false;
        this.crouchTimer = 0;
        if (this.chargeGlow) this.chargeGlow.setVisible(false);

        flow.gameOver = false;
        flow.playerCanControl = true;

        if (this.invincibilityTween) {
          this.invincibilityTween.stop();
          this.invincibilityTween = null;
        }

        this.invincibilityTween = this.tweens.add({
          targets: this.player,
          alpha: { from: 0.3, to: 1 },
          duration: 100,
          yoyo: true,
          repeat: -1
        });

        this.time.delayedCall(2000, () => {
          flow.invincible = false;
          if (this.invincibilityTween) {
            this.invincibilityTween.stop();
            this.invincibilityTween = null;
            this.player.setAlpha(1);
          }
        });
      }
    });
  });
}
