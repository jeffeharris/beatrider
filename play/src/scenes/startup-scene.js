import Phaser from 'phaser';
import { gameState, isMobile } from '../config.js';
import { unlockIOSAudio } from '../audio/ios-unlock.js';
import {
  consumeHighScoreClick,
  createHighScoresButtonSystem,
  isHighScorePanelOpen,
  repositionHighScoreUiSystem,
  toggleHighScorePanelSystem
} from '../systems/startup-scene/leaderboard-panel.js';
import { isTestMode } from '../testing/test-mode.js';
import { isMenuOpen, openStartScreenSettings } from '../ui/menus.js';

export default class StartupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartupScene' });
  }

  create() {
    // Use global WIDTH and HEIGHT which are updated on resize
    // Ensure they're current
    gameState.WIDTH = this.cameras.main.width;
    gameState.HEIGHT = this.cameras.main.height;
    const WIDTH = gameState.WIDTH;
    const HEIGHT = gameState.HEIGHT;

    // The scene instance is reused when a run quits back to the title, so unhook on shutdown.
    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.resize, this));

    // Black background
    this.cameras.main.setBackgroundColor('#000');

    // Create grid effect in background
    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    // Animated scan line effect
    this.scanline = this.add.rectangle(0, 0, WIDTH, 3, 0x00ff00, 0.5);
    this.scanlineTween = this.tweens.add({
      targets: this.scanline,
      y: HEIGHT,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    });

    // Title with glow effect
    const titleStyle = {
      font: 'bold 72px monospace',
      fill: '#00ffcc',
      stroke: '#00ffcc',
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#00ffcc',
        blur: 20,
        fill: true
      }
    };

    this.title = this.add.text(0, 0, 'BEATRIDER', titleStyle);
    this.title.setOrigin(0.5);

    // Pulsing glow animation for title
    this.tweens.add({
      targets: this.title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Subtitle with typewriter effect
    const subtitleText = 'ENDLESS BEAT SURVIVOR';
    this.subtitle = this.add.text(0, 0, '', {
      font: '24px monospace',
      fill: '#ff00ff',
      stroke: '#ff00ff',
      strokeThickness: 1
    });
    this.subtitle.setOrigin(0.5);

    // Typewriter effect
    let charIndex = 0;
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if(charIndex < subtitleText.length) {
          this.subtitle.text += subtitleText[charIndex];
          charIndex++;
        }
      },
      repeat: subtitleText.length - 1
    });

    // Instructions - different for mobile vs desktop
    const instructions = isMobile ? [
      'DRAG LEFT/RIGHT - MOVE',
      'DRAG UP - JUMP',
      'DRAG DOWN THEN RELEASE - SUPER JUMP',
      'HOLD SCREEN - AUTO FIRE'
    ] : [
      'ARROWS/A/D - MOVE',
      'W/UP - JUMP',
      'SPACE - FIRE',
      'G - TOGGLE GRID'
    ];

    this.instructions = [];
    instructions.forEach((text, index) => {
      const instruction = this.add.text(0, 0, text, {
        font: '18px monospace',
        fill: '#00ff00'
      });
      instruction.setOrigin(0.5);
      instruction.setAlpha(0);
      this.instructions.push(instruction);

      // Fade in with delay
      this.tweens.add({
        targets: instruction,
        alpha: 1,
        delay: 1500 + index * 200,
        duration: 500
      });
    });

    // Check if tutorial has been completed
    const tutorialCompleted = localStorage.getItem('beatrider_tutorial_completed') === 'true';

    // Press start message - different for mobile
    const startMessage = isMobile ? 'TAP TO START' : 'PRESS SPACE TO START';
    this.startText = this.add.text(0, 0, startMessage, {
      font: 'bold 28px monospace',
      fill: '#ffff00',
      stroke: '#ffff00',
      strokeThickness: 1
    });
    this.startText.setOrigin(0.5);

    // Blinking effect
    this.tweens.add({
      targets: this.startText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Tutorial button, laid out between the instructions and the start prompt
    const tutorialMessage = tutorialCompleted ? '[REPLAY TUTORIAL]' : '[TUTORIAL MODE]';
    this.tutorialText = this.add.text(0, 0, tutorialMessage, {
      font: '18px monospace',
      fill: '#00ff00',
      stroke: '#00ff00',
      strokeThickness: 1
    });
    this.tutorialText.setPadding(12, 8);
    this.tutorialText.setOrigin(0.5);
    this.tutorialText.setInteractive({ useHandCursor: true });
    this.tutorialText.setDepth(1000);

    // Hover effect for tutorial button
    this.tutorialText.on('pointerover', () => {
      this.tutorialText.setScale(1.1);
      this.tutorialText.setFill('#ffffff');
    });

    this.tutorialText.on('pointerout', () => {
      this.tutorialText.setScale(1.0);
      this.tutorialText.setFill('#00ff00');
    });

    // Subtle pulsing for tutorial button if not completed
    if (!tutorialCompleted) {
      this.tweens.add({
        targets: this.tutorialText,
        alpha: 0.6,
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }

    // Retro computer boot sequence text
    const bootLines = [
      'INITIALIZING BEAT DETECTION SYSTEM...',
      'LOADING MELODIC ALGORITHMS...',
      'CALIBRATING PERSPECTIVE MATRIX...',
      'SYNTHESIZERS ONLINE',
      'SYSTEM READY'
    ];

    this.bootTexts = bootLines.map(line => {
      const bootText = this.add.text(0, 0, '> ' + line, {
        font: '14px monospace',
        fill: '#0f0'
      });
      bootText.setAlpha(0);
      return bootText;
    });
    this.bootCursor = this.add.text(0, 0, '_', {
      font: '14px monospace',
      fill: '#0f0'
    });
    this.bootCursor.setAlpha(0);

    this.bootTexts.forEach((bootText, index) => {
      this.tweens.add({
        targets: bootText,
        alpha: 1,
        delay: index * 300,
        duration: 200
      });
    });
    this.tweens.add({
      targets: this.bootCursor,
      alpha: { from: 1, to: 0 },
      delay: bootLines.length * 300,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    // About link - upper right corner
    const aboutText = this.aboutText = this.add.text(0, 0, 'ABOUT', {
      font: '14px monospace',
      fill: '#00ff00'
    });
    aboutText.setOrigin(1, 0);
    aboutText.setPadding(12, 8);
    aboutText.setInteractive({ useHandCursor: true });
    aboutText.setAlpha(0.6);

    aboutText.on('pointerover', () => {
      aboutText.setAlpha(1);
    });

    aboutText.on('pointerout', () => {
      aboutText.setAlpha(0.6);
    });

    aboutText.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      window.open('../', '_blank');
    });

    createHighScoresButtonSystem.call(this);

    // Settings - bottom-left, mirroring high scores. Opens the same DOM settings menu
    // used in game; its controls need the music modules, loaded on this tap.
    this.settingsButton = this.add.text(0, 0, '[SETTINGS]', {
      font: '14px monospace',
      fill: '#00ff00'
    });
    this.settingsButton.setOrigin(0, 1);
    this.settingsButton.setPadding(12, 8);
    this.settingsButton.setAlpha(0.6);
    this.settingsButton.setDepth(1000);
    this.settingsButton.setInteractive({ useHandCursor: true });
    this.settingsButton.on('pointerover', () => this.settingsButton.setAlpha(1));
    this.settingsButton.on('pointerout', () => this.settingsButton.setAlpha(0.6));
    this.settingsButton.on('pointerdown', async () => {
      if (isHighScorePanelOpen.call(this)) return;
      const musicUI = await import('../audio/music-ui.js');
      musicUI.setupMusicUI();
      // SPACE would start the game from under the menu otherwise.
      this.input.keyboard.enabled = false;
      openStartScreenSettings(() => {
        this.input.keyboard.enabled = true;
      });
    });

    this.layoutStartScreen();

    // Floating particles in background
    this.particles = [];
    for(let i = 0; i < 30; i++) {
      const particle = this.add.circle(
        Math.random() * WIDTH,
        Math.random() * HEIGHT,
        Math.random() * 2 + 1,
        0x00ff00,
        Math.random() * 0.3 + 0.1
      );

      this.particles.push(particle);

      this.tweens.add({
        targets: particle,
        y: particle.y - HEIGHT - 100,
        duration: Math.random() * 10000 + 10000,
        repeat: -1,
        delay: Math.random() * 5000
      });
    }

    // Dynamically load Tone.js and initialize audio context.
    // Called inside user gesture so AudioContext is allowed by browsers.
    const initializeAudio = async (Tone) => {
      // iOS audio unlock - pass Tone so it can call Tone.start()/context.resume()
      await unlockIOSAudio(Tone);

      // Start Tone.js from user gesture with Mac-specific handling
      try {
        if (!Tone.getContext()) {
          Tone.setContext(new AudioContext());
        }

        await Tone.start();

        if (Tone.context.state === 'suspended') {
          await Tone.context.resume();
        }

        // Extra check for Canvas mode
        const isCanvasMode = this.game.renderer.type === Phaser.CANVAS;
        if (isCanvasMode) {
          for (let i = 0; i < 3; i++) {
            if (Tone.context.state !== 'running') {
              await new Promise(resolve => setTimeout(resolve, 50));
              await Tone.context.resume();
            } else {
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error starting audio:', error);
        try {
          await Tone.context.resume();
        } catch (resumeError) {
          console.error('Could not resume audio context:', resumeError);
        }
      }
    };

    let gameStarting = false;

    const startGame = async (tutorialMode = false) => {
      if (gameStarting) return;
      gameStarting = true;

      try {
        if (this.startText) this.startText.setText('LOADING...');

        // Dynamically import Tone, MainScene, and music UI in parallel.
        // This defers all AudioContext creation until this user gesture.
        const testMode = isTestMode();
        const [Tone, { default: MainScene }, musicUI] = await Promise.all([
          testMode ? Promise.resolve(null) : import('tone'),
          import('./main-scene.js'),
          testMode ? Promise.resolve(null) : import('../audio/music-ui.js')
        ]);

        // Fire-and-forget audio init (don't block game start on audio)
        if (!testMode) {
          initializeAudio(Tone).catch((error) => {
            console.error('Audio init failed:', error);
          });
        }

        // Register the dynamically-loaded Main scene and wire up music UI
        if (!this.scene.get('Main')) this.scene.add('Main', MainScene, false);
        musicUI?.setupMusicUI();

        // Transition to game
        if (testMode) {
          this.scene.start('Main', { tutorialMode });
        } else {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            this.scene.start('Main', { tutorialMode });
          });
        }
      } catch (error) {
        console.error('Failed to load game modules:', error);
        gameStarting = false;
        if (this.startText) this.startText.setText('LOAD ERROR - TAP TO RETRY');
      }
    };

    // While the high scores panel is up, the start inputs dismiss it instead of playing.
    const dismissHighScoresIfOpen = () => {
      if (!isHighScorePanelOpen.call(this)) return false;
      toggleHighScorePanelSystem.call(this, false);
      return true;
    };

    // Start normal game handler
    const startNormalGame = async () => {
      if (dismissHighScoresIfOpen()) return;
      await startGame(false);
    };

    // Tutorial button handler - always starts tutorial
    this.tutorialText.on('pointerdown', async (pointer) => {
      pointer.event.stopPropagation();
      if (dismissHighScoresIfOpen()) return;
      await startGame(true);
    });

    // Listen for space key to start normal game. Bound with on() rather than once() so a
    // press that only dismisses the high scores panel doesn't consume the handler;
    // startGame's own gameStarting guard still prevents a double start.
    this.input.keyboard.on('keydown-SPACE', startNormalGame);
    this.input.keyboard.on('keydown-ESC', dismissHighScoresIfOpen);

    // Touch/click handler that ignores taps landing on the screen's own buttons.
    // The scene-wide handler fires even when a button handled the tap, so each
    // interactive element needs excluding by bounds.
    const handleStartClick = async (pointer) => {
      // The high scores button and its backdrop deal with their own taps.
      if (consumeHighScoreClick.call(this)) return;
      if (dismissHighScoresIfOpen()) return;

      if (isMenuOpen()) return;
      const buttons = [this.tutorialText, aboutText, this.highScoresButton, this.settingsButton];
      if (buttons.some(button => button?.getBounds().contains(pointer.x, pointer.y))) {
        return;
      }

      await startNormalGame();
    };

    // Touch/click to start
    this.input.on('pointerdown', handleStartClick);

    if (isTestMode()) {
      void startNormalGame();
    }
  }

  drawGrid() {
    const WIDTH = gameState.WIDTH;
    const HEIGHT = gameState.HEIGHT;
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x00ff00, 0.1);

    for(let x = 0; x < WIDTH; x += 40) {
      this.gridGraphics.lineBetween(x, 0, x, HEIGHT);
    }
    for(let y = 0; y < HEIGHT; y += 40) {
      this.gridGraphics.lineBetween(0, y, WIDTH, y);
    }
  }

  // One layout for create and resize: a centred column that shrinks as a whole to fit
  // between the boot log and the corner buttons, so nothing overlaps at any size.
  layoutStartScreen() {
    const W = gameState.WIDTH;
    const H = gameState.HEIGHT;
    const margin = 16;
    // Corner buttons carry 12x8 padding for a bigger tap target; offset by it.
    const cornerInset = 6;

    this.aboutText.setPosition(W - cornerInset, cornerInset);
    this.settingsButton.setPosition(cornerInset, H - cornerInset);
    repositionHighScoreUiSystem.call(this);

    // The boot log is decoration; short screens (phones held sideways) skip it.
    const showBoot = H >= 560;
    const bootFont = Math.max(10, Math.min(14, Math.floor((W - 48) / 24)));
    const bootLine = Math.round(bootFont * 1.45);
    const bootTop = 52; // below the ABOUT link, which shares the top edge on narrow screens
    this.bootTexts.forEach((bootText, index) => {
      bootText.setFontSize(bootFont);
      bootText.setPosition(24, bootTop + index * bootLine);
      bootText.setVisible(showBoot);
    });
    const lastBoot = this.bootTexts[this.bootTexts.length - 1];
    this.bootCursor.setFontSize(bootFont);
    this.bootCursor.setPosition(lastBoot.x + lastBoot.width + 4, lastBoot.y);
    this.bootCursor.setVisible(showBoot);

    const top = showBoot ? bootTop + this.bootTexts.length * bootLine + 12 : 52;
    const bottom = H - 52;

    // Column at full scale: [object, font px, gap after px].
    const column = [
      [this.title, 72, 20],
      [this.subtitle, 24, 36],
      ...this.instructions.map((line, index) => [line, 18, index === this.instructions.length - 1 ? 32 : 12]),
      [this.tutorialText, 18, 20],
      [this.startText, 28, 0]
    ];
    const lineHeight = 1.2;
    const fullHeight = column.reduce((sum, [, size, gap]) => sum + size * lineHeight + gap, 0);

    // Widest line at full scale. The subtitle types itself in, so it is not measured;
    // it is narrower than the title at every size anyway.
    const fullWidth = Math.max(...column
      .filter(([obj]) => obj !== this.subtitle)
      .map(([obj, size]) => {
        obj.setFontSize(size);
        return obj.width;
      }));

    const scale = Math.max(0.4, Math.min(1, (bottom - top) / fullHeight, (W - margin * 2) / fullWidth));

    let y = top + Math.max(0, (bottom - top - fullHeight * scale) / 2);
    for (const [obj, size, gap] of column) {
      const px = Math.round(size * scale);
      obj.setFontSize(px);
      obj.setPosition(W / 2, y + px * lineHeight / 2);
      y += px * lineHeight + gap * scale;
    }
  }

  resize(gameSize, baseSize, displaySize, resolution) {
    if (!this.cameras || !this.cameras.main) {
      return;
    }

    gameState.WIDTH = this.cameras.main.width;
    gameState.HEIGHT = this.cameras.main.height;
    const WIDTH = gameState.WIDTH;
    const HEIGHT = gameState.HEIGHT;

    if (this.scene.isActive()) {
      if (this.gridGraphics) {
        this.drawGrid();
      }

      if (this.scanline) {
        this.scanline.width = WIDTH;
        if (this.scanlineTween) {
          this.scanlineTween.remove();
        }
        this.scanlineTween = this.tweens.add({
          targets: this.scanline,
          y: HEIGHT,
          duration: 3000,
          repeat: -1,
          ease: 'Linear'
        });
      }

      this.layoutStartScreen();

      if (this.particles) {
        this.particles.forEach(particle => {
          this.tweens.killTweensOf(particle);
          particle.x = Math.random() * WIDTH;
          particle.y = Math.random() * HEIGHT;

          this.tweens.add({
            targets: particle,
            y: particle.y - HEIGHT - 100,
            duration: Math.random() * 10000 + 10000,
            repeat: -1,
            delay: Math.random() * 5000
          });
        });
      }
    }
  }
}
