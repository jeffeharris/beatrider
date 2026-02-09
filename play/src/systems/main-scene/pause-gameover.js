import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { saveGameData, sessionHighScore, setSessionHighScore } from '../../storage.js';
import { currentGenre } from '../../audio/music-engine.js';
import { currentDifficulty } from '../../audio/music-ui.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function pauseGameSystem() {
  if (this.isPaused) return;
  
  this.isPaused = true;
  
  // Track pause time for accurate game timer
  this.pauseStartTime = this.time.now;
  
  // Pause all tweens
  this.tweens.pauseAll();
  
  // Apply blur effect
  this.cameras.main.setPostPipeline('Blur');
  
  // Create pause overlay
  this.pauseOverlay = this.add.graphics();
  this.pauseOverlay.fillStyle(0x000000, 0.5);
  this.pauseOverlay.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
  this.pauseOverlay.setDepth(10000);
  
  // Calculate responsive font sizes
  const baseFontSize = Math.min(gameState.WIDTH, gameState.HEIGHT) * 0.08;
  const smallFontSize = Math.min(gameState.WIDTH, gameState.HEIGHT) * 0.04;
  
  // Add PAUSED text
  this.pauseText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2 - 60, 'PAUSED', {
    font: `${baseFontSize}px monospace`,
    fill: '#ffffff'
  });
  this.pauseText.setOrigin(0.5);
  this.pauseText.setDepth(10001);
  
  // Add high score display (on top) - centered with proper spacing
  this.pauseHighScoreText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2, `High Score: ${sessionHighScore}`, {
    font: `${smallFontSize}px monospace`,
    fill: '#ff0'
  });
  this.pauseHighScoreText.setOrigin(0.5, 0.5);
  this.pauseHighScoreText.setDepth(10001);
  
  // Add current score display (below) - centered with proper spacing
  this.pauseScoreText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2 + 40, `Score: ${this.score}`, {
    font: `${smallFontSize}px monospace`,
    fill: '#0f0'
  });
  this.pauseScoreText.setOrigin(0.5, 0.5);
  this.pauseScoreText.setDepth(10001);
  
  // Add instruction text
  this.pauseInstructionText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2 + 80, 'Press SPACE or tap to continue', {
    font: `${smallFontSize * 0.7}px monospace`,
    fill: '#888888'
  });
  this.pauseInstructionText.setOrigin(0.5);
  this.pauseInstructionText.setDepth(10001);
  
  // Add feedback UI in upper right corner (moved down to avoid SKIP button)
  const feedbackContainer = this.add.container(gameState.WIDTH - 100, 100);
  feedbackContainer.setDepth(10002);
  this.pauseFeedbackContainer = feedbackContainer; // Store for cleanup
  
  // "Having fun?" text
  const feedbackQuestion = this.add.text(0, 0, 'Having fun?', {
    font: `${smallFontSize * 0.5}px monospace`,
    fill: '#888'
  });
  feedbackQuestion.setOrigin(0.5);
  feedbackContainer.add(feedbackQuestion);
  
  // Thumbs up button
  const thumbsUp = this.add.text(-25, 25, '👍', {
    font: `${smallFontSize * 0.8}px monospace`,
    fill: '#fff'
  });
  thumbsUp.setOrigin(0.5);
  thumbsUp.setInteractive({ useHandCursor: true });
  thumbsUp.setAlpha(0.6);
  feedbackContainer.add(thumbsUp);
  
  // Thumbs down button
  const thumbsDown = this.add.text(25, 25, '👎', {
    font: `${smallFontSize * 0.8}px monospace`,
    fill: '#fff'
  });
  thumbsDown.setOrigin(0.5);
  thumbsDown.setInteractive({ useHandCursor: true });
  thumbsDown.setAlpha(0.6);
  feedbackContainer.add(thumbsDown);
  
  // Hover effects
  thumbsUp.on('pointerover', () => {
    thumbsUp.setAlpha(1);
    thumbsUp.setScale(1.1);
  });
  thumbsUp.on('pointerout', () => {
    thumbsUp.setAlpha(0.6);
    thumbsUp.setScale(1);
  });
  
  thumbsDown.on('pointerover', () => {
    thumbsDown.setAlpha(1);
    thumbsDown.setScale(1.1);
  });
  thumbsDown.on('pointerout', () => {
    thumbsDown.setAlpha(0.6);
    thumbsDown.setScale(1);
  });
  
  // Handle feedback clicks - both lead to same result
  const handleFeedback = (feedbackType) => {
    // Prevent resume while handling feedback
    this.isHandlingFeedback = true;
    
    // Clear flag after a short delay to allow normal resume later
    this.time.delayedCall(500, () => {
      this.isHandlingFeedback = false;
    });
    
    // Track feedback
    window.trackEvent('pause_feedback_given', {
      type: feedbackType,
      score: this.score,
      survival_time: Math.floor((this.time.now - this.gameStartTime) / 1000)
    });
    
    // Hide thumbs and question
    feedbackQuestion.setVisible(false);
    thumbsUp.setVisible(false);
    thumbsDown.setVisible(false);
    
    // Show thanks and link (moved down a bit more for spacing)
    const thanksText = this.add.text(0, 0, feedbackType === 'positive' ? 'Thanks! 💜' : 'Thanks!', {
      font: `${smallFontSize * 0.5}px monospace`,
      fill: feedbackType === 'positive' ? '#0f0' : '#0ff'
    });
    thanksText.setOrigin(0.5);
    feedbackContainer.add(thanksText);
    
    const shareLink = this.add.text(0, 25, '[Share more]', {
      font: `${smallFontSize * 0.6}px monospace`,
      fill: '#0ff'
    });
    shareLink.setOrigin(0.5);
    shareLink.setInteractive({ useHandCursor: true });
    feedbackContainer.add(shareLink);
    
    shareLink.on('pointerover', () => {
      shareLink.setStyle({ fill: '#fff' });
    });
    shareLink.on('pointerout', () => {
      shareLink.setStyle({ fill: '#666' });
    });
    
    shareLink.on('pointerdown', (pointer) => {
      this.isHandlingFeedback = true; // Also set flag here
      
      window.trackEvent('feedback_form_opened_from_pause', {
        initial_feedback: feedbackType,
        score: this.score
      });
      
      // Open Google Form in new tab
      window.open('https://docs.google.com/forms/d/e/1FAIpQLSeHzYiQAqJ_1VR6PAXgsBdJxkYte-UcwBlC1w83dJ0gopqBNQ/viewform', '_blank');
      
      shareLink.setText('[Form opened]');
      shareLink.setStyle({ fill: '#0f0' });
      
      // Clear flag after a short delay
      this.time.delayedCall(500, () => {
        this.isHandlingFeedback = false;
      });
      
      if (pointer && pointer.event) {
        pointer.event.stopPropagation();
      }
    });
  };
  
  thumbsUp.on('pointerdown', (pointer) => {
    handleFeedback('positive');
    pointer.event.stopPropagation();
  });
  thumbsDown.on('pointerdown', (pointer) => {
    handleFeedback('negative');
    pointer.event.stopPropagation();
  });
  
  // Pause music
  if (Tone.Transport.state === 'started') {
    Tone.Transport.pause();
  }
  
  // Update play/pause button to show play icon
  const btn = document.getElementById('playPauseBtn');
  if (btn) {
    btn.textContent = '▶';
    btn.title = 'Resume';
  }
}

export function resumeGameSystem() {
  if (!this.isPaused) return;
  
  this.isPaused = false;
  this.isHandlingFeedback = false; // Reset feedback flag
  
  // Adjust game start time to account for pause duration
  if (this.pauseStartTime) {
    const pauseDuration = this.time.now - this.pauseStartTime;
    this.gameStartTime += pauseDuration;
    
    // Also adjust adaptive difficulty timer if assisting
    if (this.adaptiveState.isAssisting && this.adaptiveState.assistStartTime) {
      this.adaptiveState.assistStartTime += pauseDuration;
    }
  }
  
  // Resume all tweens
  this.tweens.resumeAll();
  
  // Remove blur effect
  this.cameras.main.resetPostPipeline();
  
  // Clean up pause overlay
  if (this.pauseOverlay) {
    this.pauseOverlay.destroy();
    this.pauseOverlay = null;
  }
  if (this.pauseText) {
    this.pauseText.destroy();
    this.pauseText = null;
  }
  if (this.pauseScoreText) {
    this.pauseScoreText.destroy();
    this.pauseScoreText = null;
  }
  if (this.pauseHighScoreText) {
    this.pauseHighScoreText.destroy();
    this.pauseHighScoreText = null;
  }
  if (this.pauseInstructionText) {
    this.pauseInstructionText.destroy();
    this.pauseInstructionText = null;
  }
  if (this.pauseFeedbackContainer) {
    this.pauseFeedbackContainer.destroy();
    this.pauseFeedbackContainer = null;
  }
  
  // Resume music if it was playing
  if (Tone.Transport.state === 'paused') {
    Tone.Transport.start();
  }
  
  // Update play/pause button to show pause icon
  const btn = document.getElementById('playPauseBtn');
  if (btn) {
    btn.textContent = '||';
    btn.title = 'Pause';
  }
}

export function showGameOverScreenSystem() {
  // Set flag to block pause and controls
  this.isShowingGameOver = true;
  this.playerCanControl = false;
  
  // Track this death for adaptive difficulty
  this.recentDeaths.push({
    score: this.score,
    timestamp: Date.now()
  });
  
  // Keep only last 3 deaths
  if (this.recentDeaths.length > 3) {
    this.recentDeaths.shift();
  }
  
  // Check if player is struggling (all 3 recent deaths < 1000 points)
  if (this.recentDeaths.length === 3 && 
      this.recentDeaths.every(death => death.score < 1000)) {
    // Enable adaptive assistance
    this.adaptiveState.isAssisting = true;
    this.adaptiveState.assistStartTime = this.time.now;
    this.adaptiveState.currentSpawnMultiplier = 0.7;  // 70% spawn rate
    this.adaptiveState.currentSpeedMultiplier = 0.85; // 85% speed
  }
  
  // Calculate survival time
  const survivalTimeMs = this.time.now - this.gameStartTime;
  const survivalSeconds = Math.floor(survivalTimeMs / 1000);
  const survivalMinutes = Math.floor(survivalSeconds / 60);
  const survivalSecondsRemainder = survivalSeconds % 60;
  const survivalTimeString = `${survivalMinutes}:${survivalSecondsRemainder.toString().padStart(2, '0')}`;
  
  // Calculate points per second
  const pointsPerSecond = survivalSeconds > 0 ? (this.score / survivalSeconds).toFixed(1) : '0.0';
  
  // Track game over event with detailed metrics
  const scoreBucket = this.score < 100 ? '0-99' : 
                     this.score < 500 ? '100-499' :
                     this.score < 1000 ? '500-999' :
                     this.score < 2500 ? '1000-2499' :
                     this.score < 5000 ? '2500-4999' : '5000+';
  
  const sessionTime = this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;
  
  window.trackEvent('game_over', {
    score: this.score,
    score_bucket: scoreBucket,
    high_score: sessionHighScore,
    new_high_score: this.score > sessionHighScore,
    combo_max: this.maxComboReached || this.comboCount,
    beats_survived: this.beats,
    session_time: sessionTime,
    control_type: window.controlType,
    difficulty: currentDifficulty?.name || 'normal',
    genre: currentGenre || 'techno',
    grid_enabled: gameState.gridEnabled
  });
  
  // Track specific achievement for scores > 100
  if (this.score > 100) {
    window.trackEvent('achievement_unlocked', {
      achievement: 'score_over_100',
      score: this.score
    });
  }
  
  // Darken the screen - very high depth to be above everything
  const overlay = this.add.graphics();
  overlay.fillStyle(0x000000, 0.7);
  overlay.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
  overlay.setAlpha(0);
  overlay.setDepth(20000); // Above everything else
  
  // Check if new high score (before resetting)
  const beatHighScore = this.score > sessionHighScore;
  if(beatHighScore) {
    setSessionHighScore(this.score);
    saveGameData({ highScore: sessionHighScore });
    
    // Track new high score separately
    window.trackEvent('new_high_score', {
      score: this.score,
      previous_high: this.sessionHighScore || 0,
      improvement: this.score - (this.sessionHighScore || 0)
    });
  }
  
  // Calculate responsive text sizes based on screen dimensions
  const screenRef = Math.min(gameState.WIDTH, gameState.HEIGHT);
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Scale based on screen size with mobile boost
  const mobileMult = isMobile ? 1.2 : 1.0;
  const bigFontSize = `${Math.floor(screenRef * 0.09 * mobileMult)}px`;
  const medFontSize = `${Math.floor(screenRef * 0.05 * mobileMult)}px`;
  const smallFontSize = `${Math.floor(screenRef * 0.03 * mobileMult)}px`;
  const tinyFontSize = `${Math.floor(screenRef * 0.025 * mobileMult)}px`;
  
  // Score display
  const scoreLabel = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2 - screenRef * 0.08, 'SCORE', {
    font: `${medFontSize} monospace`,
    fill: '#0f0'
  });
  scoreLabel.setOrigin(0.5);
  scoreLabel.setAlpha(0);
  scoreLabel.setDepth(20001); // Above overlay
  
  const scoreText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2, this.score.toString(), {
    font: `${bigFontSize} monospace`,
    fill: beatHighScore ? '#ffff00' : '#00ffcc'
  });
  scoreText.setOrigin(0.5);
  scoreText.setAlpha(0);
  scoreText.setShadow(0, 0, beatHighScore ? '#ffff00' : '#00ffcc', 20);
  scoreText.setDepth(20001); // Above overlay
  
  // High score message
  let congratsText = null;
  if(beatHighScore) {
    congratsText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2 + screenRef * 0.1, 'NEW HIGH SCORE!', {
      font: `${medFontSize} monospace`,
      fill: '#ff00ff'
    });
    congratsText.setOrigin(0.5);
    congratsText.setAlpha(0);
    congratsText.setShadow(0, 0, '#ff00ff', 15);
    congratsText.setDepth(20001); // Above overlay
    
    // Pulse animation for new high score
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
    const highScoreText = this.add.text(gameState.WIDTH/2, gameState.HEIGHT/2 + screenRef * 0.1, `HIGH SCORE: ${sessionHighScore}`, {
      font: `${smallFontSize} monospace`,
      fill: '#ff0'
    });
    highScoreText.setOrigin(0.5);
    highScoreText.setAlpha(0);
    highScoreText.setData('isHighScoreText', true); // Mark for later cleanup
    
    this.tweens.add({
      targets: highScoreText,
      alpha: 0.8,
      duration: 600,
      delay: 800
    });
  }
  
  // Survival stats - time and points/second
  const statsY = beatHighScore ? gameState.HEIGHT/2 + screenRef * 0.15 : gameState.HEIGHT/2 + screenRef * 0.13;
  const survivalStatsText = this.add.text(gameState.WIDTH/2, statsY, 
    `Survived: ${survivalTimeString}  •  ${pointsPerSecond} pts/sec`, {
    font: `${tinyFontSize} monospace`,
    fill: '#00ffcc'
  });
  survivalStatsText.setOrigin(0.5);
  survivalStatsText.setAlpha(0);
  survivalStatsText.setDepth(20001);
  survivalStatsText.setData('isSurvivalStats', true); // Mark for cleanup
  
  this.tweens.add({
    targets: survivalStatsText,
    alpha: 0.9,
    duration: 600,
    delay: 1000
  });
  
  
  // Restart instruction with countdown
  const restartY = statsY + screenRef * 0.06;
  const restartText = this.add.text(gameState.WIDTH/2, restartY, 'RESTARTING IN 3...', {
    font: `${smallFontSize} monospace`,
    fill: '#00ffcc'  // Brighter cyan color for visibility
  });
  restartText.setOrigin(0.5);
  restartText.setAlpha(0);
  restartText.setDepth(20001); // Above overlay
  
  // Countdown timer
  let countdown = 3;
  const countdownTimer = this.time.addEvent({
    delay: 1000,
    callback: () => {
      countdown--;
      if (countdown > 0) {
        restartText.setText(`RESTARTING IN ${countdown}...`);
      } else {
        restartText.setText(`RESTARTING NOW!`);
      }
      // Pulse effect on each countdown
      this.tweens.add({
        targets: restartText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    },
    repeat: 2  // Run 2 more times after initial (3, 2, 1/NOW)
  });
  
  // Fade in overlay
  this.tweens.add({
    targets: overlay,
    alpha: 1,
    duration: 300
  });
  
  // Fade in score label
  this.tweens.add({
    targets: scoreLabel,
    alpha: 1,
    duration: 400,
    delay: 200
  });
  
  // Fade in and scale score number
  this.tweens.add({
    targets: scoreText,
    alpha: 1,
    scaleX: { from: 0.5, to: 1 },
    scaleY: { from: 0.5, to: 1 },
    duration: 600,
    delay: 400,
    ease: 'Back.out'
  });
  
  // Fade in congrats/high score text
  if(congratsText) {
    this.tweens.add({
      targets: congratsText,
      alpha: 1,
      duration: 600,
      delay: 800
    });
    
    // Celebratory sound for new high score
    try {
      const now = Tone.now();
      // Victory fanfare
      gameSounds.powerUp.triggerAttackRelease("C4", "16n", now);
      gameSounds.powerUp.triggerAttackRelease("E4", "16n", now + 0.1);
      gameSounds.powerUp.triggerAttackRelease("G4", "16n", now + 0.2);
      gameSounds.powerUp.triggerAttackRelease("C5", "8n", now + 0.3);
    } catch(e) {}
  }
  
  // Fade in restart text - full opacity for visibility
  this.tweens.add({
    targets: restartText,
    alpha: 1,  // Full opacity instead of 0.5
    duration: 400,
    delay: 1200
  });
  
  // Respawn right after countdown completes (1.2s delay + 3s countdown)
  this.time.delayedCall(4300, () => {
    // Fade out game over screen elements
    const highScoreElement = this.children.list.find(child => child && child.getData && child.getData('isHighScoreText'));
    const survivalStatsElement = this.children.list.find(child => child && child.getData && child.getData('isSurvivalStats'));
    
    this.tweens.add({
      targets: [overlay, scoreLabel, scoreText, restartText, congratsText, highScoreElement, 
               survivalStatsText].filter(Boolean),
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // Clean up game over screen elements
        overlay.destroy();
        scoreLabel.destroy();
        scoreText.destroy();
        restartText.destroy();
        if(congratsText) congratsText.destroy();
        if(highScoreElement) highScoreElement.destroy();
        if(survivalStatsText) survivalStatsText.destroy();
        
        // Reset score and combo for new round
        this.score = 0;
        this.scoreText.setText('0');
        this.combo = 1;
        this.comboText.setAlpha(0);
        
        // Reset difficulty progression
        this.beats = 0;
        
        // Reset game timer for new round
        this.gameStartTime = this.time.now;
        
        // Clear any power-ups
        this.rapidFire = false;
        this.rapidFireTimer = 0;
        this.player.clearTint();
        
        // Reset player to center lane with invincibility
        this.playerLane = 2;
        this.player.x = this._laneX(2);
        this.player.setVisible(true);
        this.player.setDepth(500); // Ensure player stays on top after respawn
        
        // Reset player states
        this.isJumping = false;
        this.isCrouching = false;
        this.isStretching = false;
        this.isDashing = false;
        this.isMoving = false;
        this.isTouchFiring = false;
        this.crouchTimer = 0;
        if(this.chargeGlow) this.chargeGlow.setVisible(false);
        
        // Re-enable controls and continue invincibility
        this.isShowingGameOver = false;
        this.playerCanControl = true;
        
        // Stop any existing invincibility tween
        if(this.invincibilityTween) {
          this.invincibilityTween.stop();
          this.invincibilityTween = null;
        }
        
        // Create flashing effect for invincibility
        this.invincibilityTween = this.tweens.add({
          targets: this.player,
          alpha: { from: 0.3, to: 1 },
          duration: 100,
          yoyo: true,
          repeat: -1
        });
        
        // End invincibility after 2 seconds (from when screen fades)
        this.time.delayedCall(2000, () => {
          this.isInvincible = false;
          if(this.invincibilityTween) {
            this.invincibilityTween.stop();
            this.invincibilityTween = null;
            this.player.setAlpha(1);
          }
        });
      }
    });
  });
}

