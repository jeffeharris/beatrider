import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { sessionHighScore } from '../../storage.js';

export function pauseGameSystem() {
  const { flow, combat } = this.stateSlices;
  if (flow.paused) return;

  flow.paused = true;

  this.pauseStartTime = this.time.now;

  this.tweens.pauseAll();

  this.cameras.main.setPostPipeline('Blur');

  this.pauseOverlay = this.add.graphics();
  this.pauseOverlay.fillStyle(0x000000, 0.5);
  this.pauseOverlay.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
  this.pauseOverlay.setDepth(10000);

  const baseFontSize = Math.min(gameState.WIDTH, gameState.HEIGHT) * 0.08;
  const smallFontSize = Math.min(gameState.WIDTH, gameState.HEIGHT) * 0.04;

  this.pauseText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 - 60, 'PAUSED', {
    font: `${baseFontSize}px monospace`,
    fill: '#ffffff'
  });
  this.pauseText.setOrigin(0.5);
  this.pauseText.setDepth(10001);

  this.pauseHighScoreText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2, `High Score: ${sessionHighScore}`, {
    font: `${smallFontSize}px monospace`,
    fill: '#ff0'
  });
  this.pauseHighScoreText.setOrigin(0.5, 0.5);
  this.pauseHighScoreText.setDepth(10001);

  this.pauseScoreText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 + 40, `Score: ${combat.score}`, {
    font: `${smallFontSize}px monospace`,
    fill: '#0f0'
  });
  this.pauseScoreText.setOrigin(0.5, 0.5);
  this.pauseScoreText.setDepth(10001);

  this.pauseInstructionText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2 + 80, 'Press SPACE or tap to continue', {
    font: `${smallFontSize * 0.7}px monospace`,
    fill: '#888888'
  });
  this.pauseInstructionText.setOrigin(0.5);
  this.pauseInstructionText.setDepth(10001);

  const feedbackContainer = this.add.container(gameState.WIDTH - 100, 100);
  feedbackContainer.setDepth(10002);
  this.pauseFeedbackContainer = feedbackContainer;

  const feedbackQuestion = this.add.text(0, 0, 'Having fun?', {
    font: `${smallFontSize * 0.5}px monospace`,
    fill: '#888'
  });
  feedbackQuestion.setOrigin(0.5);
  feedbackContainer.add(feedbackQuestion);

  const thumbsUp = this.add.text(-25, 25, '👍', {
    font: `${smallFontSize * 0.8}px monospace`,
    fill: '#fff'
  });
  thumbsUp.setOrigin(0.5);
  thumbsUp.setInteractive({ useHandCursor: true });
  thumbsUp.setAlpha(0.6);
  feedbackContainer.add(thumbsUp);

  const thumbsDown = this.add.text(25, 25, '👎', {
    font: `${smallFontSize * 0.8}px monospace`,
    fill: '#fff'
  });
  thumbsDown.setOrigin(0.5);
  thumbsDown.setInteractive({ useHandCursor: true });
  thumbsDown.setAlpha(0.6);
  feedbackContainer.add(thumbsDown);

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

  const handleFeedback = (feedbackType) => {
    this.isHandlingFeedback = true;

    this.time.delayedCall(500, () => {
      this.isHandlingFeedback = false;
    });

    window.trackEvent('pause_feedback_given', {
      type: feedbackType,
      score: combat.score,
      survival_time: Math.floor((this.time.now - this.gameStartTime) / 1000)
    });

    feedbackQuestion.setVisible(false);
    thumbsUp.setVisible(false);
    thumbsDown.setVisible(false);

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
      this.isHandlingFeedback = true;

      window.trackEvent('feedback_form_opened_from_pause', {
        initial_feedback: feedbackType,
        score: combat.score
      });

      window.open('https://docs.google.com/forms/d/e/1FAIpQLSeHzYiQAqJ_1VR6PAXgsBdJxkYte-UcwBlC1w83dJ0gopqBNQ/viewform', '_blank');

      shareLink.setText('[Form opened]');
      shareLink.setStyle({ fill: '#0f0' });

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

  if (Tone.Transport.state === 'started') {
    Tone.Transport.pause();
  }

  const btn = document.getElementById('playPauseBtn');
  if (btn) {
    btn.textContent = '▶';
    btn.title = 'Resume';
  }
}

export function resumeGameSystem() {
  const { flow } = this.stateSlices;
  if (!flow.paused) return;

  flow.paused = false;
  this.isHandlingFeedback = false;

  if (this.pauseStartTime) {
    const pauseDuration = this.time.now - this.pauseStartTime;
    this.gameStartTime += pauseDuration;

    if (this.adaptiveState.isAssisting && this.adaptiveState.assistStartTime) {
      this.adaptiveState.assistStartTime += pauseDuration;
    }
  }

  this.tweens.resumeAll();

  this.cameras.main.resetPostPipeline();

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

  if (Tone.Transport.state === 'paused') {
    Tone.Transport.start();
  }

  const btn = document.getElementById('playPauseBtn');
  if (btn) {
    btn.textContent = '||';
    btn.title = 'Pause';
  }
}
