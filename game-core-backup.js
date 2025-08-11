// Game Core - Phaser scenes and game logic
import { CONFIG, getMobileValue } from './config.js';
import eventBus, { EVENTS } from './event-bus.js';
import gameSounds from './game-sounds.js';

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                 ('ontouchstart' in window);

// Calculate dimensions
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const LANES = CONFIG.game.lanes;
const LANE_W = WIDTH / LANES;
const PLAYER_Y = HEIGHT - getMobileValue(
  CONFIG.game.player.yPosition.desktop,
  CONFIG.game.player.yPosition.mobile
);

// Game state
let sessionHighScore = 0;
let gridEnabled = true;

// Get difficulty multipliers from main
function getDifficulty() {
  return window.getDifficultyMultipliers ? window.getDifficultyMultipliers() : {
    speedMult: 1.0,
    fireMult: 1.0,
    spawnMult: 1.0
  };
}

export class StartupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartupScene' });
  }
  
  create() {
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    
    // Title with retro effect
    const title = this.add.text(centerX, centerY - 100, 'BEAT RIDER', {
      fontFamily: 'monospace',
      fontSize: isMobile ? '48px' : '64px',
      color: '#ffff00',
      stroke: '#ff00ff',
      strokeThickness: 4
    });
    title.setOrigin(0.5);
    title.setShadow(4, 4, '#00ffff', 10, true, true);
    
    // Animate title
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Subtitle
    const subtitle = this.add.text(centerX, centerY - 30, 'MELODIC TECHNO SHOOTER', {
      fontFamily: 'monospace',
      fontSize: isMobile ? '20px' : '24px',
      color: '#00ff00'
    });
    subtitle.setOrigin(0.5);
    
    // Instructions based on platform
    const instructions = isMobile ? 
      'TAP TO START\n\nSWIPE: Move lanes\nTAP RIGHT: Shoot\nTAP UP: Jump' :
      'PRESS SPACE TO START\n\nARROWS/A/D: Move lanes\nSPACE: Shoot\nW/UP: Jump';
    
    const instructionText = this.add.text(centerX, centerY + 50, instructions, {
      fontFamily: 'monospace',
      fontSize: isMobile ? '18px' : '20px',
      color: '#00ffff',
      align: 'center'
    });
    instructionText.setOrigin(0.5);
    
    // Animated flash for "PRESS SPACE TO START"
    this.tweens.add({
      targets: instructionText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    
    // Retro computer boot sequence text
    const bootLines = [
      'INITIALIZING BEAT DETECTION SYSTEM...',
      'LOADING MELODIC ALGORITHMS...',
      'CALIBRATING PERSPECTIVE MATRIX...',
      'SYNTHESIZERS ONLINE',
      'SYSTEM READY'
    ];
    
    const bootY = 60;
    bootLines.forEach((line, index) => {
      this.time.delayedCall(index * 300, () => {
        const bootText = this.add.text(40, bootY + index * 20, '> ' + line, {
          font: '14px monospace',
          fill: '#0f0'
        });
        
        bootText.setAlpha(0);
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
    
    // Floating particles in background
    for(let i = 0; i < 30; i++) {
      const particle = this.add.circle(
        Math.random() * WIDTH,
        Math.random() * HEIGHT,
        Math.random() * 2 + 1,
        0x00ff00,
        Math.random() * 0.3 + 0.1
      );
      
      this.tweens.add({
        targets: particle,
        y: particle.y - HEIGHT - 100,
        duration: Math.random() * 10000 + 10000,
        repeat: -1,
        delay: Math.random() * 5000
      });
    }
    
    // Start handler
    const startGame = async () => {
      if (typeof Tone !== 'undefined') {
        await Tone.start();
      }
      
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('Main');
      });
    };
    
    // Input handlers
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.on('pointerdown', startGame);
    this.input.on('pointerup', startGame);
    
    const invisibleButton = this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, 0x000000, 0);
    invisibleButton.setInteractive();
    invisibleButton.once('pointerdown', startGame);
  }
}

// Main game scene - this is huge so I'll add it piece by piece
export class Main extends Phaser.Scene {
  constructor() {
    super({ key: 'Main' });
    
    // Initialize all properties
    this.player = null;
    this.bullets = null;
    this.enemies = null;
    this.obstacles = null;
    this.powerups = null;
    this.particles = null;
    this.grid = null;
    this.starGraphics = null;
    this.stars = [];
    
    this.currentLane = 2;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.lastKillTime = 0;
    this.isJumping = false;
    this.canShoot = true;
    this.powerupActive = null;
    this.powerupEndTime = 0;
    this.beatCount = 0;
    
    this.cursors = null;
    this.spaceKey = null;
    this.wKey = null;
    this.aKey = null;
    this.dKey = null;
  }
  
  updateSoundDisplay() {
    const soundNames = ['Triangle', 'Acid', 'Chord', 'Sub', 'Pluck', 'Pew Pew'];
    const display = document.getElementById('soundDisplay');
    if (display) {
      display.textContent = soundNames[gameSounds.currentLaserSound];
    }
  }
  
  // I'll continue adding the rest of the Main scene methods in the next message
  // This is a placeholder to ensure the module structure is correct
  
  create() {
    // Will add full create method
  }
  
  update(time, dt) {
    // Will add full update method
  }
}

// Export for Phaser game creation
export function createGame() {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'gameContainer',
    scene: [StartupScene, Main]
  });
}