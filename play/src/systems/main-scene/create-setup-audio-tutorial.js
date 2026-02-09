import * as Tone from 'tone';
import { gameState } from '../../config.js';
import {
  setCurrentBar,
  setCurrentChordIndex,
  setLastSection,
  updatePatterns,
  ensureTransportScheduled,
  getMusicWatchdogStatus,
  recoverMusicLoops
} from '../../audio/music-engine.js';
import { uiState, updatePlayPauseButton } from '../../audio/music-ui.js';

export function setupSceneVisualBaseAndTutorialUI() {
  this.cameras.main.setBackgroundColor('#000');

  this.createStarfield();

  if (!this.isTutorial) return;

  Tone.Transport.bpm.value = 90;

  this.tutorialText = this.add.text(gameState.WIDTH / 2, 100, '', {
    font: 'bold 24px monospace',
    fill: '#ffff00',
    stroke: '#000000',
    strokeThickness: 4,
    align: 'center'
  }).setOrigin(0.5).setDepth(1000);

  this.tutorialProgressText = this.add.text(gameState.WIDTH / 2, 140, '', {
    font: '18px monospace',
    fill: '#00ff00',
    stroke: '#000000',
    strokeThickness: 3,
    align: 'center'
  }).setOrigin(0.5).setDepth(1000);

  this.skipTutorialButton = this.add.text(gameState.WIDTH - 20, 20, '[SKIP >>]', {
    font: '20px monospace',
    fill: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3,
    align: 'right'
  }).setOrigin(1, 0).setDepth(1001);

  this.skipTutorialButton.setInteractive({ useHandCursor: true });

  this.skipTutorialButton.on('pointerover', () => {
    this.skipTutorialButton.setScale(1.1);
    this.skipTutorialButton.setFill('#ffff00');
  });

  this.skipTutorialButton.on('pointerout', () => {
    this.skipTutorialButton.setScale(1.0);
    this.skipTutorialButton.setFill('#ffffff');
  });

  this.skipTutorialButton.on('pointerdown', () => {
    this.skipTutorial();
  });
}

export function startMusicAndWatchdog() {
  const { flow } = this.stateSlices;
  if (typeof Tone !== 'undefined' && Tone.Transport.state !== 'started') {
    const startMusic = async () => {
      try {
        if (Tone.context.state === 'suspended') {
          await Tone.context.resume();
        }

        setCurrentBar(0);
        window.currentBar = 0;
        setCurrentChordIndex(0);
        setLastSection('');
        updatePatterns();
        ensureTransportScheduled();

        await new Promise(resolve => setTimeout(resolve, 50));

        Tone.Transport.start('+0.1');

        if (document.getElementById('status')) {
          document.getElementById('status').textContent = 'PLAYING';
        }
      } catch (error) {
        console.error('Error starting music:', error);
        Tone.Transport.start();
      }
    };

    startMusic();
    uiState.isPlaying = true;
    updatePlayPauseButton();
  }

  this.lastWatchdogRecoveryAt = 0;
  this.musicWatchdog = this.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
      if (flow.paused || flow.gameOver) return;
      if (Tone.Transport.state !== 'started') return;

      const status = getMusicWatchdogStatus(Tone.now());
      if (status.secondsSinceSequenceCallback < 3) return;
      if (this.time.now - this.lastWatchdogRecoveryAt < 5000) return;

      this.lastWatchdogRecoveryAt = this.time.now;
      if (recoverMusicLoops(Tone.now())) {
        console.warn('Music watchdog recovered stalled music loops');
      }
    }
  });
}
