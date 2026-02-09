import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, isMobile } from '../config.js';
import { unlockIOSAudio } from '../audio/ios-unlock.js';

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

    // Register resize handler with proper binding
    this.scale.on('resize', this.resize, this);


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

    this.title = this.add.text(WIDTH/2, HEIGHT/3, 'BEATRIDER', titleStyle);
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
    this.subtitle = this.add.text(WIDTH/2, HEIGHT/3 + 80, '', {
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
      const instruction = this.add.text(WIDTH/2, HEIGHT/2 + 40 + index * 30, text, {
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
    const startY = (WIDTH > HEIGHT) ? HEIGHT - 100 : HEIGHT - 150;
    this.startText = this.add.text(WIDTH/2, startY, startMessage, {
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

    // Tutorial button - place it above the start text, not below
    const tutorialY = startY - 50;
    const tutorialMessage = tutorialCompleted ? '[REPLAY TUTORIAL]' : '[TUTORIAL MODE]';
    this.tutorialText = this.add.text(WIDTH/2, tutorialY, tutorialMessage, {
      font: '18px monospace',
      fill: '#00ff00',
      stroke: '#00ff00',
      strokeThickness: 1
    });
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

    this.bootTexts = [];
    const bootY = 60;
    bootLines.forEach((line, index) => {
      this.time.delayedCall(index * 300, () => {
        const bootText = this.add.text(40, bootY + index * 20, '> ' + line, {
          font: '14px monospace',
          fill: '#0f0'
        });

        bootText.setAlpha(0);
        this.bootTexts.push(bootText);
        this.tweens.add({
          targets: bootText,
          alpha: 1,
          duration: 200
        });

        if(index === bootLines.length - 1) {
          const cursor = this.add.text(bootText.x + bootText.width + 5, bootText.y, '_', {
            font: '14px monospace',
            fill: '#0f0'
          });
          this.tweens.add({
            targets: cursor,
            alpha: 0,
            duration: 400,
            yoyo: true,
            repeat: -1
          });
        }
      });
    });

    // About link - upper right corner
    const aboutText = this.add.text(WIDTH - 30, 30, 'ABOUT', {
      font: '14px monospace',
      fill: '#00ff00'
    });
    aboutText.setOrigin(1, 0);
    aboutText.setInteractive({ useHandCursor: true });
    aboutText.setAlpha(0.6);

    aboutText.on('pointerover', () => {
      aboutText.setAlpha(1);
    });

    aboutText.on('pointerout', () => {
      aboutText.setAlpha(0.6);
    });

    aboutText.on('pointerdown', () => {
      window.open('../', '_blank');
    });

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

    // Start handler function
    const startGame = async (tutorialMode = false) => {
      // iOS audio unlock - critical for iPhone/iPad
      await unlockIOSAudio();

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

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('Error starting audio:', error);
        try {
          await Tone.context.resume();
        } catch (resumeError) {
          console.error('Could not resume audio context:', resumeError);
        }
      }

      // Transition to game with optional tutorial mode
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('Main', { tutorialMode: tutorialMode });
      });
    };

    // Start normal game handler
    const startNormalGame = async () => {
      await startGame(false);
    };

    // Tutorial button handler - always starts tutorial
    this.tutorialText.on('pointerdown', async (pointer) => {
      pointer.event.stopPropagation();
      await startGame(true);
    });

    // Listen for space key to start normal game
    this.input.keyboard.once('keydown-SPACE', startNormalGame);

    // Touch/click handler that checks if tutorial was clicked
    const handleStartClick = async (pointer) => {
      const bounds = this.tutorialText.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        return;
      }
      await startNormalGame();
    };

    // Touch/click to start
    this.input.on('pointerdown', handleStartClick);
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

      if (this.title) {
        this.title.x = WIDTH / 2;
        this.title.y = HEIGHT / 3;
      }

      if (this.subtitle) {
        this.subtitle.x = WIDTH / 2;
        this.subtitle.y = HEIGHT / 3 + 80;
      }

      if (this.instructions) {
        this.instructions.forEach((instruction, index) => {
          instruction.x = WIDTH / 2;
          instruction.y = HEIGHT / 2 + 40 + index * 30;
        });
      }

      if (this.startText) {
        this.startText.x = WIDTH / 2;
        const startY = (WIDTH > HEIGHT) ? HEIGHT - 50 : HEIGHT - 100;
        this.startText.y = startY;
      }

      if (this.invisibleButton) {
        this.invisibleButton.x = WIDTH / 2;
        this.invisibleButton.y = HEIGHT / 2;
        this.invisibleButton.width = WIDTH;
        this.invisibleButton.height = HEIGHT;
      }

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
