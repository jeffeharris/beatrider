import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, isMobile, LANES, ENEMY_SPEED_BASE, BULLET_SPEED, FIRE_COOLDOWN, HORIZONTAL_SHOOTING, ARC_SHOT_BASE_SAFE_DISTANCE, ARC_SHOT_HEIGHT_BONUS, ARC_SHOT_MAX_JUMP_HEIGHT, PLAYER_CONFIG, pulsePatternPool, sectionPatternMap } from '../../config.js';
import { savedData, saveGameData, sessionHighScore } from '../../storage.js';
import { currentBar, setCurrentBar, currentChordIndex, setCurrentChordIndex, lastSection, setLastSection, currentGenre, updatePatterns, getSection, ensureTransportScheduled, getMusicWatchdogStatus, recoverMusicLoops } from '../../audio/music-engine.js';
import { currentDifficulty, DIFFICULTY_PRESETS, uiState, updateGridButton, updatePlayPauseButton } from '../../audio/music-ui.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function createMainSceneSystem(data){
  // Check if we're in tutorial mode
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
  
  // Initialize vanishing point
  this.vanishX = gameState.WIDTH / 2;
  this.vanishY = gameState.HEIGHT * 0.15;
  
  // Track session start time and metrics
  this.sessionStartTime = Date.now();
  this.maxComboReached = 0;
  
  // Initialize game timer for survival tracking
  this.gameStartTime = this.time.now;
  
  // Initialize adaptive difficulty system
  this.recentDeaths = [];
  this.adaptiveState = {
    isAssisting: false,
    assistStartTime: null,
    currentSpawnMultiplier: 1.0,
    currentSpeedMultiplier: 1.0
  };
  
  // Track game start
  window.trackEvent('game_start', {
    difficulty: currentDifficulty?.name || 'normal',
    genre: currentGenre || 'techno',
    grid_enabled: gameState.gridEnabled,
    high_score: sessionHighScore,
    tutorial_mode: this.isTutorial
  });
  
  // Initialize pause state
  this.isPaused = false;
  this.pauseOverlay = null;
  this.pauseText = null;
  this.wasAutoPaused = false; // Track if pause was triggered by visibility change
  this.pauseScoreText = null;
  this.pauseHighScoreText = null;
  
  // Initialize death/invincibility state
  this.isShowingGameOver = false;
  this.isInvincible = false;
  this.playerCanControl = true;
  
  // Store reference for external access
  window.gameScene = this;
  window.currentGameScene = this; // For touch sensitivity settings
  
  // Set up visibility change listener for auto-pause when tab/app goes to background
  if (!this.visibilityHandler) {
    this.visibilityHandler = () => {
      // Check if document is hidden (tab switched or app went to background)
      if (document.hidden) {
        // Auto-pause if game is active and not already paused
        if (!this.isPaused && !this.isShowingGameOver) {
          this.pauseGame();
          this.wasAutoPaused = true; // Track that this was an auto-pause
        }
      } else {
        // When coming back to foreground, don't auto-resume
        // The user will see the pause screen and can resume manually
        if (this.wasAutoPaused) {
          this.wasAutoPaused = false;
          // Ensure pause screen is visible
          if (this.isPaused && this.pauseOverlay) {
            this.pauseOverlay.setVisible(true);
            this.pauseText.setVisible(true);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
    
    // Clean up the event listener when scene shuts down
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
  
  // Scene is already created, no need to wait for ready event
  
  this.cameras.main.setBackgroundColor('#000');
  
  // Create starfield background FIRST
  this.createStarfield();
  
  // Tutorial mode setup
  if (this.isTutorial) {
    // Slow down the tempo for tutorial
    Tone.Transport.bpm.value = 90; // 75% of normal 120 BPM
    
    // Create tutorial text overlay
    this.tutorialText = this.add.text(gameState.WIDTH/2, 100, '', {
      font: 'bold 24px monospace',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(1000);
    
    // Tutorial progress text
    this.tutorialProgressText = this.add.text(gameState.WIDTH/2, 140, '', {
      font: '18px monospace',
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(1000);
    
    // Skip tutorial button in upper right
    this.skipTutorialButton = this.add.text(gameState.WIDTH - 20, 20, '[SKIP >>]', {
      font: '20px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'right'
    }).setOrigin(1, 0).setDepth(1001);
    
    // Make skip button interactive
    this.skipTutorialButton.setInteractive({ useHandCursor: true });
    
    // Hover effects
    this.skipTutorialButton.on('pointerover', () => {
      this.skipTutorialButton.setScale(1.1);
      this.skipTutorialButton.setFill('#ffff00');
    });
    
    this.skipTutorialButton.on('pointerout', () => {
      this.skipTutorialButton.setScale(1.0);
      this.skipTutorialButton.setFill('#ffffff');
    });
    
    // Click to skip tutorial
    this.skipTutorialButton.on('pointerdown', () => {
      this.skipTutorial();
    });
  }
  
  // Start the music automatically when game starts
  if (typeof Tone !== 'undefined' && Tone.Transport.state !== 'started') {
    // Ensure audio context is running before starting transport
    const startMusic = async () => {
      try {
        // Make sure context is running
        if (Tone.context.state === 'suspended') {
          await Tone.context.resume();
        }

        // Reset music state
        setCurrentBar(0);
        window.currentBar = 0;
        setCurrentChordIndex(0);
        setLastSection('');
        updatePatterns();
        ensureTransportScheduled();

        // Add a small delay before starting transport for Mac
        await new Promise(resolve => setTimeout(resolve, 50));

        // Start transport with immediate time to avoid scheduling issues
        Tone.Transport.start('+0.1');

        if (document.getElementById('status')) {
          document.getElementById('status').textContent = 'PLAYING';
        }
      } catch (error) {
        console.error('Error starting music:', error);
        // Fallback: try to start anyway
        Tone.Transport.start();
      }
    };

    startMusic();
    uiState.isPlaying = true;
    updatePlayPauseButton();
  }

  // If music callbacks stall while gameplay is active (seen on iOS Safari),
  // recover loop scheduling automatically.
  this.lastWatchdogRecoveryAt = 0;
  this.musicWatchdog = this.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
      if (this.isPaused || this.isShowingGameOver) return;
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
  
  // Initialize trail system
  this.trails = [];
  this.trailGraphics = this.add.graphics();
  
  const gfx=this.make.graphics({x:0,y:0,add:false});
  
  // Calculate sizes based on screen dimensions
  // Use smaller dimension as reference for consistent scaling
  const screenReference = Math.min(gameState.WIDTH, gameState.HEIGHT);
  const screenScale = screenReference / 800; // 800px as reference size
  
  // Base sizes scale with screen, with mobile getting a slight boost
  const mobileBoost = isMobile ? 1.2 : 1.0;
  const basePlayerSize = Math.floor(36 * screenScale * mobileBoost);
  const baseEnemySize = Math.floor(32 * screenScale * mobileBoost);
  const baseBulletW = Math.floor(8 * screenScale * mobileBoost);
  const baseBulletH = Math.floor(16 * screenScale * mobileBoost);
  const baseObstacleW = Math.floor(80 * screenScale * mobileBoost);
  const baseObstacleH = Math.floor(22 * screenScale * mobileBoost);
  const basePowerUpSize = Math.floor(28 * screenScale * mobileBoost);
  
  const playerSize = Math.floor(basePlayerSize * gameState.MOBILE_SCALE);
  const enemySize = Math.floor(baseEnemySize * gameState.MOBILE_SCALE);
  const bulletW = Math.floor(baseBulletW * gameState.MOBILE_SCALE);
  const bulletH = Math.floor(baseBulletH * gameState.MOBILE_SCALE);
  const obstacleW = Math.floor(baseObstacleW * gameState.MOBILE_SCALE);
  const obstacleH = Math.floor(baseObstacleH * gameState.MOBILE_SCALE);
  const powerUpSize = Math.floor(basePowerUpSize * gameState.MOBILE_SCALE);
  
  // Store sizes for use in spawn functions
  this.enemyBaseSize = enemySize;
  this.fastEnemyBaseSize = Math.floor(enemySize * 1.25); // Fast enemies 25% larger
  
  gfx.fillStyle(0x00ffcc,1).fillRect(0,0,playerSize,playerSize).generateTexture('playerTex',playerSize,playerSize).clear();
  gfx.fillStyle(0xff3366,1).fillRect(0,0,enemySize,enemySize).generateTexture('enemyTex',enemySize,enemySize).clear();
  gfx.fillStyle(0xffff00,1).fillTriangle(enemySize/2,0,0,enemySize,enemySize,enemySize).generateTexture('fastEnemyTex',enemySize,enemySize).clear();
  gfx.fillStyle(0xffffff,1).fillRect(0,0,bulletW,bulletH).generateTexture('bulletTex',bulletW,bulletH).clear();
  // Energy shield with poles - all in one texture
  const poleWidth = Math.floor(obstacleW * 0.15); // Poles are 15% of total width
  const shieldGap = 2; // Small gap between pole and shield
  
  // Dark purple poles on the sides
  gfx.fillStyle(0xbf40ff, 1); // Solid dark purple
  gfx.fillRect(0, 0, poleWidth, obstacleH); // Left pole
  gfx.fillRect(obstacleW - poleWidth, 0, poleWidth, obstacleH); // Right pole
  
  // Energy shield barrier in between - lighter and translucent
  const shieldX = poleWidth + shieldGap;
  const shieldWidth = obstacleW - (poleWidth * 2) - (shieldGap * 2);
  
  // Multi-layer shield effect for depth
  gfx.fillStyle(0xff99ff, 0.15); // Outermost glow
  gfx.fillRect(shieldX - 2, 0, shieldWidth + 4, obstacleH);
  
  gfx.fillStyle(0xffccff, 0.25); // Middle layer
  gfx.fillRect(shieldX, 2, shieldWidth, obstacleH - 4);
  
  gfx.fillStyle(0xffd4ff, 0.4); // Inner bright core
  gfx.fillRect(shieldX + 2, 4, shieldWidth - 4, obstacleH - 8);
  
  // Add some vertical energy lines for texture
  gfx.lineStyle(1, 0xffffff, 0.2);
  for(let i = 0; i < 3; i++) {
    const lineX = shieldX + shieldGap + (shieldWidth / 4) * (i + 1);
    gfx.lineBetween(lineX, 2, lineX, obstacleH - 2);
  }
  
  gfx.generateTexture('obstacleTex',obstacleW,obstacleH).clear();
  gfx.fillStyle(0x00ff00,1).fillCircle(powerUpSize/2,powerUpSize/2,powerUpSize/2).generateTexture('powerUpTex',powerUpSize,powerUpSize).clear(); // Green power-up
  
  // Create star texture for break section collectibles
  const starSize = Math.floor(40 * gameState.MOBILE_SCALE);
  const spikes = 5;
  const outerRadius = starSize / 2;
  const innerRadius = outerRadius * 0.4;
  
  gfx.fillStyle(0xffdd00, 1); // Golden yellow
  gfx.beginPath();
  
  for(let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI * 2 * i) / (spikes * 2) - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = starSize/2 + Math.cos(angle) * radius;
    const y = starSize/2 + Math.sin(angle) * radius;
    
    if(i === 0) {
      gfx.moveTo(x, y);
    } else {
      gfx.lineTo(x, y);
    }
  }
  
  gfx.closePath();
  gfx.fillPath();
  gfx.generateTexture('starTex', starSize, starSize).clear();
  // Create diamond-shaped drifter
  const halfSize = enemySize / 2;
  gfx.fillStyle(0xff00ff, 1);
  gfx.beginPath();
  gfx.moveTo(halfSize, 2); // Top point
  gfx.lineTo(enemySize - 2, halfSize); // Right point
  gfx.lineTo(halfSize, enemySize - 2); // Bottom point
  gfx.lineTo(2, halfSize); // Left point
  gfx.closePath();
  gfx.fillPath();
  gfx.generateTexture('drifterTex',enemySize,enemySize).destroy(); // Diamond drifter

  this.playerLane=2; 
  this.player=this.add.image(this._laneX(this.playerLane), gameState.PLAYER_Y, 'playerTex');
  this.player.w = playerSize; // Add collision dimensions (scaled)
  this.player.h = playerSize;
  this.player.setDepth(500); // Much higher depth to ensure on top
  
  // Create charge glow effect
  this.chargeGlow = this.add.graphics();
  this.chargeGlow.setDepth(-1); // Behind player
  this.chargeGlow.setVisible(false);
  this.enemies=[]; 
  this.bullets=[]; 
  this.obstacles = [];
  this.powerUps = [];
  this.lastShotAt=0;
  this.rapidFire = false;
  this.rapidFireTimer = 0;
  this.offScreenTimer = 0; // Timer for rubber band effect
  this.offScreenShotCount = 0; // Track shots fired while off-screen
  this.offScreenTurnDelay = 0; // Delay before can fire when off-screen
  this.isMoving = false; // Prevent shooting while transitioning
  this.isStretching = false; // Track stretch phase for collision immunity
  this.isJumping = false; // Track jump state
  this.isCrouching = false; // Track crouch state for super jump
  this.crouchTimer = 0; // Timer for crouch charge
  this.maxChargeTime = 1000; // Max charge time in ms for full power
  this.releaseGraceTime = 150; // Grace period after releasing down to still trigger super jump
  this.queuedSuperJumpCharge = 0; // Queue super jump charge when jumping
  this.keyboardJumpQueuedWhileAirborne = false; // Track if keyboard jump queued while airborne
  this.queuedCrouchOnLanding = false; // Track if crouch was queued while airborne
  this.usingTimeBasedCharge = false; // Whether using time-based charge (for queued touch)
  this.touchChargeStartTime = 0; // When time-based charge started
  
  // Jello physics for idle animation
  this.idleWobblePhase = 0; // For idle breathing animation
  this.wobbleVelocity = { x: 0, y: 0 }; // For reactive wobble
  this.wobbleDamping = 0.92; // How quickly wobble settles
  
  // Dash mechanics
  this.isDashing = false;
  this.lastLeftPress = 0;
  this.lastRightPress = 0;
  this.doubleTapWindow = PLAYER_CONFIG.dash.doubleTapWindow; // ms window for double-tap
  this.keys=this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,G,ONE,TWO,THREE,FOUR,FIVE,SIX,ESC');
  this.score=0; 
  this.beats=0;
  // Combo system variables
  this.combo = 1;
  this.comboTimer = 0;
  this.lastKillTime = 0;
  this.maxCombo = 8; // Maximum combo multiplier
  this.comboWindow = 2000; // 2 seconds to maintain combo
  
  const scoreFontSize = isMobile ? '24px' : '16px';
  const gridFontSize = isMobile ? '18px' : '12px';
  const scoreY = isMobile ? gameState.HEIGHT-36 : gameState.HEIGHT-24;
  const highScoreY = isMobile ? gameState.HEIGHT-72 : gameState.HEIGHT-48;
  const comboY = isMobile ? gameState.HEIGHT-108 : gameState.HEIGHT-72;
  
  // Create score labels and values separately for alignment
  const labelOffset = 10;
  const valueOffset = 80; // Position for right-aligned numbers - reduced to prevent overlap
  
  // High score (on top)
  this.highScoreLabel = this.add.text(labelOffset, highScoreY, 'high', {font:`${scoreFontSize} monospace`, fill:'#ff0'});
  this.highScoreText = this.add.text(valueOffset, highScoreY, sessionHighScore.toString(), {font:`${scoreFontSize} monospace`, fill:'#ff0'});
  this.highScoreText.setOrigin(0, 0); // Left align the number after the label
  
  // Current score (below)
  this.scoreLabel = this.add.text(labelOffset, scoreY, 'score', {font:`${scoreFontSize} monospace`, fill:'#0f0'});
  this.scoreText = this.add.text(valueOffset, scoreY, '0', {font:`${scoreFontSize} monospace`, fill:'#0f0'});
  this.scoreText.setOrigin(0, 0); // Left align the number after the label
  // Combo display
  this.comboText=this.add.text(10, comboY, '', {font:`${scoreFontSize} monospace`, fill:'#ff00ff'});
  this.comboText.setAlpha(0);
  
  // Combo meter bar
  const meterY = comboY + 30;
  this.comboMeterBg = this.add.graphics();
  this.comboMeterBg.fillStyle(0x333333, 0.5);
  this.comboMeterBg.fillRect(10, meterY, 200, 8);
  this.comboMeterBg.setVisible(false);
  
  this.comboMeter = this.add.graphics();
  this.comboMeterY = meterY;
  
  this.gridVisible = gameState.gridEnabled; // Use persistent grid setting
  
  // Sync initial grid UI state
  uiState.gridVisible = gameState.gridEnabled;
  updateGridButton();

  // Mobile controls setup
  this.setupMobileControls();

  // GameAPI is triggered by our drums
  window.GameAPI = {
    onBeat: ()=>{ 
      this.beats++;
      
      // Tutorial mode custom spawning
      if (this.isTutorial) {
        this.handleTutorialSpawn();
        // For wave 7 (full game), also continue with normal spawning
        if (this.tutorialWave < 7) {
          return;
        }
      }
      
      // Apply adaptive difficulty spawn chance
      if (this.adaptiveState.isAssisting) {
        if (Math.random() > this.adaptiveState.currentSpawnMultiplier) {
          // Skip this spawn due to adaptive assistance
          return;
        }
      }
      
      // Apply adaptive difficulty speed multiplier
      const baseSpeed = (ENEMY_SPEED_BASE + Math.floor(this.beats/16)*30) * currentDifficulty.speedMult;
      const speed = baseSpeed * this.adaptiveState.currentSpeedMultiplier;
      
      // Always spawn on kick (if not skipped by adaptive difficulty)
      const lane = Phaser.Math.Between(0,LANES-1);
      this._spawnEnemy(lane, speed, 'enemyTex'); 
      
      // Pulse all existing red enemies
      for(let enemy of this.enemies) {
        if(enemy.enemyType === 'enemyTex') {
          enemy.pulseTime = this.time.now;
        }
      }
    },
    onSnare: ()=>{ 
      // Skip all tutorial waves except final practice (wave 7)
      if (this.isTutorial && this.tutorialWave < 7) return;
      
      // Apply adaptive difficulty spawn chance
      if (this.adaptiveState.isAssisting) {
        if (Math.random() > this.adaptiveState.currentSpawnMultiplier) {
          // Skip this spawn due to adaptive assistance
          return;
        }
      }
      
      // Fast yellow enemies on snare hits - apply adaptive speed
      const baseSpeed = (ENEMY_SPEED_BASE * 1.5 + Math.floor(this.beats/16)*30) * currentDifficulty.speedMult;
      const speed = baseSpeed * this.adaptiveState.currentSpeedMultiplier;
      const lane = Phaser.Math.Between(0,LANES-1);
      this._spawnEnemy(lane, speed, 'fastEnemyTex'); 
      
      // Pulse all existing yellow enemies
      for(let enemy of this.enemies) {
        if(enemy.enemyType === 'fastEnemyTex') {
          enemy.pulseTime = this.time.now;
        }
      }
    },
    onHihat: ()=>{
      // Skip all tutorial waves except final practice (wave 7)
      if (this.isTutorial && this.tutorialWave < 7) return;
      
      // Apply adaptive difficulty spawn chance for obstacles (lower reduction)
      if (this.adaptiveState.isAssisting) {
        // Obstacles get 70% of their normal reduction (so 20% * 0.7 = 14% chance)
        if (Math.random() > this.adaptiveState.currentSpawnMultiplier) {
          // Skip this spawn due to adaptive assistance
          return;
        }
      }
      
      // Spawn obstacles that block shots
      const lane = Phaser.Math.Between(0,LANES-1);
      this._spawnObstacle(lane);
      
      // Pulse all existing obstacles with electric effect
      for(let obstacle of this.obstacles) {
        obstacle.pulseTime = this.time.now;
      }
    },
    onAcid: ()=>{
      // Skip during tutorial
      if (this.isTutorial && this.tutorialWave < 5) return;
      
      // Spawn power-up for rapid fire
      const lane = Phaser.Math.Between(0,LANES-1);
      this._spawnPowerUp(lane);
    },
    onStab: ()=>{
      // Skip during tutorial
      if (this.isTutorial) return;
      
      // Spawn lane-changing enemy
      const lane = Phaser.Math.Between(0,LANES-1);
      this._spawnDrifter(lane);
      
      // Pulse all existing purple drifting enemies
      for(let enemy of this.enemies) {
        if(enemy.isDrifter) {
          enemy.pulseTime = this.time.now;
        }
      }
    },
    onSub: ()=>{
      // Always pulse the grid for visual effect
      this._pulseGrid();
      
      // Skip break section logic during tutorial
      if (this.isTutorial) return;
      
      // Track if we're in break section for star spawning
      const section = getSection(window.currentBar || 0);
      this.isBreakSection = (section === 'BREAK');
    },
    toggleGrid: ()=>{ 
      // Toggle grid from external button - match G key behavior
      this.gridVisible = !this.gridVisible;
      gameState.gridEnabled = this.gridVisible;
      saveGameData({ settings: { gridEnabled: gameState.gridEnabled } });
      
      // Track grid toggle
      window.trackEvent('settings_change', {
        setting_type: 'grid',
        grid_enabled: gameState.gridEnabled
      });
      
      if (this.gridText) {
        const gridTextContent = isMobile ? 'GRID: ' + (this.gridVisible ? 'ON' : 'OFF') : 'GRID: ' + (this.gridVisible ? 'ON' : 'OFF') + ' [G]';
        this.gridText.setText(gridTextContent);
      }
      // Immediately clear graphics when hiding, just like G key does
      if(!this.gridVisible && this.gridGraphics) {
        this.gridGraphics.clear();
      } else if(this.gridVisible && this.isPaused) {
        // When paused and turning grid on, we need to draw it manually
        this._drawPerspectiveGrid();
      }
      // Update button visual state
      uiState.gridVisible = this.gridVisible;
      updateGridButton();
    },
    reset: ()=>{ this.scene.restart(); }
  };
}
