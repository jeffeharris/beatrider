import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, isMobile, LANES, ENEMY_SPEED_BASE, BULLET_SPEED, FIRE_COOLDOWN, HORIZONTAL_SHOOTING, ARC_SHOT_BASE_SAFE_DISTANCE, ARC_SHOT_HEIGHT_BONUS, ARC_SHOT_MAX_JUMP_HEIGHT, PLAYER_CONFIG, pulsePatternPool, sectionPatternMap, updateDimensions } from '../config.js';
import { savedData, saveGameData, sessionHighScore, setSessionHighScore } from '../storage.js';
import { currentBar, setCurrentBar, currentChordIndex, setCurrentChordIndex, lastSection, setLastSection, currentGenre, updatePatterns, getSection, ensureTransportScheduled, getMusicWatchdogStatus, recoverMusicLoops } from '../audio/music-engine.js';
import { currentDifficulty, DIFFICULTY_PRESETS, uiState, updateGridButton, updatePlayPauseButton } from '../audio/music-ui.js';
import { gameSounds, getGameNote } from '../audio/game-sounds.js';
import { createStarfieldSystem, updateStarfieldSystem } from '../systems/main-scene/starfield.js';
import { handleTutorialSpawnSystem, updateTutorialProgressSystem, advanceTutorialSystem, skipTutorialSystem, completeTutorialSystem } from '../systems/main-scene/tutorial.js';
import { updateTrailsSystem } from '../systems/main-scene/trails.js';
import { updateZoneVisualsSystem, setupMobileControlsSystem } from '../systems/main-scene/mobile-controls.js';

export default class Main extends Phaser.Scene {
  constructor() {
    super({ key: 'Main' });
    
    // Break section state
    this.isBreakSection = false;
    this.floatingStars = [];
  }
  updateSoundDisplay() {
    const soundNames = ['Triangle', 'Acid', 'Chord', 'Sub', 'Pluck', 'Pew Pew'];
    const display = document.getElementById('soundDisplay');
    if (display) {
      display.textContent = soundNames[gameSounds.currentLaserSound];
    }
  }
  
  createStarfield() {
    return createStarfieldSystem.call(this);
  }
  
  updateStarfield(dt) {
    return updateStarfieldSystem.call(this, dt);
  }
  
  create(data){
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

  updateZoneVisuals() {
    return updateZoneVisualsSystem.call(this);
  }

  setupMobileControls() {
    return setupMobileControlsSystem.call(this);
  }

  moveLeft() {
    if(this.isMoving) return;
    // Block movement if already off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES) return;
    const previousLane = this.playerLane;
    this.playerLane=Math.max(-1,this.playerLane-1); // Can go to -1 (off-screen left)
    const targetX = this._laneX(this.playerLane);
    
    // Play womp sound when entering off-screen
    if(this.playerLane === -1 && previousLane === 0) {
      try {
        gameSounds.offScreenWomp.triggerAttackRelease("C2", "4n");
      } catch(e) {}
    }
    
    // Check if we're jumping for special animation
    if(this.isJumping) {
      // Mid-air twirl animation
      this.isMoving = true;
      this.tweens.add({
        targets: this.player,
        x: targetX,
        duration: PLAYER_CONFIG.movement.air.duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.isMoving = false;
        }
      });
      
      // Add horizontal spin (barrel roll to the left)
      this.tweens.add({
        targets: this.player,
        angle: `-=${PLAYER_CONFIG.movement.air.barrelRoll.angle}`, // Spin counterclockwise
        duration: PLAYER_CONFIG.movement.air.barrelRoll.duration,
        ease: 'Cubic.easeOut'
      });
      
      // Add extra flair with scale pulse
      this.tweens.add({
        targets: this.player,
        scaleX: PLAYER_CONFIG.movement.air.scalePulse.x,
        scaleY: PLAYER_CONFIG.movement.air.scalePulse.y,
        duration: PLAYER_CONFIG.movement.air.scalePulse.duration,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    } else {
      // Ground movement - jello stretchy animation
      this.isMoving = true;
      this.isStretching = true; // Only immune during stretch phase
      const cfg = PLAYER_CONFIG.movement.ground;
      
      // Add reactive wobble force
      this.wobbleVelocity.x = -cfg.wobble.reactiveForce; // Push wobble opposite to movement
      
      // First stretch towards the left with anticipation
      this.tweens.add({
        targets: this.player,
        scaleX: cfg.stretch.scaleX,
        scaleY: cfg.stretch.scaleY,
        duration: cfg.stretch.duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.isStretching = false; // Stretch phase complete, no longer immune
          // Slingshot to position with overshoot
          this.tweens.add({
            targets: this.player,
            x: targetX - cfg.slingshot.overshoot, // Overshoot past target
            scaleX: cfg.slingshot.scaleX,
            scaleY: cfg.slingshot.scaleY,
            duration: cfg.slingshot.duration,
            ease: 'Power2',
            onComplete: () => {
              // Skip bounce if dash is starting or in progress
              if (this.isDashStarting || this.isDashing) {
                this.isMoving = false;
                return;
              }
              // Bounce back with secondary wobble
              this.tweens.add({
                targets: this.player,
                x: targetX + cfg.bounce.offset, // Bounce back
                scaleX: cfg.bounce.scaleX,
                scaleY: cfg.bounce.scaleY,
                duration: cfg.bounce.duration,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  this.isMoving = false; // Can shoot after bounce completes
                  // Final settle with jello wobbles (purely visual)
                  this.tweens.add({
                    targets: this.player,
                    x: targetX,
                    scaleX: 1,
                    scaleY: 1,
                    duration: cfg.settle.duration,
                    ease: 'Elastic.easeOut',
                    easeParams: cfg.settle.elasticity
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // Reset rubber band timer when moving off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES){
      this.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
      this.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);
      // Reset off-screen shooting counters when entering off-screen
      if(previousLane >= 0 && previousLane < LANES) {
        this.offScreenShotCount = 0;
        // Normal move: 800ms total, leave 220ms for firing
        this.offScreenTurnDelay = 580; // 800ms - 220ms
      }
    } else {
      this.player.setAlpha(1);
    }
    // Play movement sound
    try {
      const note = getGameNote(Math.max(0, Math.min(4, this.playerLane))) + "5";
      gameSounds.move.triggerAttackRelease(note, "32n");
    } catch(e) {}
  }

  moveRight() {
    if(this.isMoving) return;
    // Block movement if already off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES) return;
    const previousLane = this.playerLane;
    this.playerLane=Math.min(LANES,this.playerLane+1); // Can go to 5 (off-screen right)
    const targetX = this._laneX(this.playerLane);
    
    // Play womp sound when entering off-screen
    if(this.playerLane === LANES && previousLane === LANES - 1) {
      try {
        gameSounds.offScreenWomp.triggerAttackRelease("C2", "4n");
      } catch(e) {}
    }
    
    // Check if we're jumping for special animation
    if(this.isJumping) {
      // Mid-air twirl animation
      this.isMoving = true;
      this.tweens.add({
        targets: this.player,
        x: targetX,
        duration: PLAYER_CONFIG.movement.air.duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.isMoving = false;
        }
      });
      
      // Add horizontal spin (barrel roll to the right)
      this.tweens.add({
        targets: this.player,
        angle: `+=${PLAYER_CONFIG.movement.air.barrelRoll.angle}`, // Spin clockwise
        duration: PLAYER_CONFIG.movement.air.barrelRoll.duration,
        ease: 'Cubic.easeOut'
      });
      
      // Add extra flair with scale pulse
      this.tweens.add({
        targets: this.player,
        scaleX: PLAYER_CONFIG.movement.air.scalePulse.x,
        scaleY: PLAYER_CONFIG.movement.air.scalePulse.y,
        duration: PLAYER_CONFIG.movement.air.scalePulse.duration,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    } else {
      // Ground movement - jello stretchy animation
      this.isMoving = true;
      this.isStretching = true; // Only immune during stretch phase
      const cfg = PLAYER_CONFIG.movement.ground;
      
      // Add reactive wobble force
      this.wobbleVelocity.x = cfg.wobble.reactiveForce; // Push wobble opposite to movement
      
      // First stretch towards the right with anticipation
      this.tweens.add({
        targets: this.player,
        scaleX: cfg.stretch.scaleX,
        scaleY: cfg.stretch.scaleY,
        duration: cfg.stretch.duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.isStretching = false; // Stretch phase complete, no longer immune
          // Slingshot to position with overshoot
          this.tweens.add({
            targets: this.player,
            x: targetX + cfg.slingshot.overshoot, // Overshoot past target
            scaleX: cfg.slingshot.scaleX,
            scaleY: cfg.slingshot.scaleY,
            duration: cfg.slingshot.duration,
            ease: 'Power2',
            onComplete: () => {
              // Skip bounce if dash is starting or in progress
              if (this.isDashStarting || this.isDashing) {
                this.isMoving = false;
                return;
              }
              // Bounce back with secondary wobble
              this.tweens.add({
                targets: this.player,
                x: targetX - cfg.bounce.offset, // Bounce back
                scaleX: cfg.bounce.scaleX,
                scaleY: cfg.bounce.scaleY,
                duration: cfg.bounce.duration,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  this.isMoving = false; // Can shoot after bounce completes
                  // Final settle with jello wobbles (purely visual)
                  this.tweens.add({
                    targets: this.player,
                    x: targetX,
                    scaleX: 1,
                    scaleY: 1,
                    duration: cfg.settle.duration,
                    ease: 'Elastic.easeOut',
                    easeParams: cfg.settle.elasticity
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // Reset rubber band timer when moving off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES){
      this.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
      this.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);
      // Reset off-screen shooting counters when entering off-screen
      if(previousLane >= 0 && previousLane < LANES) {
        this.offScreenShotCount = 0;
        // Normal move: 800ms total, leave 220ms for firing
        this.offScreenTurnDelay = 580; // 800ms - 220ms
      }
    } else {
      this.player.setAlpha(1);
    }
    // Play movement sound
    try {
      const note = getGameNote(Math.max(0, Math.min(4, this.playerLane))) + "5";
      gameSounds.move.triggerAttackRelease(note, "32n");
    } catch(e) {}
  }

  jump() {
    if(this.isJumping) return;
    this.isJumping = true;
    
    // Jump animation - higher jump to clear obstacles better
    this.tweens.add({
      targets: this.player,
      y: gameState.PLAYER_Y - 120, // Higher jump
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      ease: 'Quad.easeOut',
      yoyo: true,
      onYoyo: () => {
        // Player has reached apex and is starting to fall - allow jumping again
      },
      onComplete: () => {
        this.isJumping = false;
        this.player.y = gameState.PLAYER_Y;
        // Animate rotation back to 0 if needed
        if(Math.abs(this.player.angle % 360) > 1) {
          this.tweens.add({
            targets: this.player,
            angle: 0,
            duration: 200,
            ease: 'Cubic.easeOut'
          });
        } else {
          this.player.angle = 0;
        }
        
        // Check if we should start charging based on queued crouch
        if (this.queuedCrouchOnLanding && this.currentZone === 'crouch') {
          this.isChargingJump = true;
          this.chargeGlow.setVisible(true);
          this.queuedCrouchOnLanding = false;
          
          // Start time-based charging like keyboard
          this.touchChargeStartTime = this.time.now;
          this.usingTimeBasedCharge = true;
          this.jumpChargeAmount = 0;
          this.maxPullDistance = 0;
          // Start charge sound
          try {
            gameSounds.jumpCharge.triggerAttack("C2");
          } catch(e) {}
          
          // Reset touch reference point
          const activePointer = this.input.activePointer;
          if (activePointer && activePointer.isDown) {
            const edgePadding = this.zoneRadius * 0.7;
            this.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
            this.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);
          }
          
          // Start charge sound
          try {
            gameSounds.jumpCharge.triggerAttack("C2");
          } catch(e) {}
          
          // Squash animation when starting crouch
          this.tweens.add({
            targets: this.player,
            scaleX: 1.4,
            scaleY: 0.6,
            duration: 100,
            ease: 'Power2'
          });
        }
        
        // Check for queued super jump (old system, keeping for compatibility)
        if (this.queuedSuperJumpCharge > 0) {
          const charge = this.queuedSuperJumpCharge;
          this.queuedSuperJumpCharge = 0;
          this.time.delayedCall(50, () => {
            this.superJump(charge);
          });
        }
      }
    });
    
    // Only do a simple forward flip if no directional input
    // Mid-air directional moves will override this
    this.jumpSpinTween = this.tweens.add({
      targets: this.player,
      angle: 360,
      duration: 500, // Match total jump time (250 * 2)
      ease: 'Linear'
    });
    
    // Jump sound effect
    try {
      const now = Tone.now();
      gameSounds.move.triggerAttackRelease("C6", "16n", now);
      gameSounds.move.triggerAttackRelease("G6", "16n", now + 0.05);
    } catch(e) {}
  }

  dashLeft() {
    if(this.isDashing) return;  // Only check isDashing, not isMoving
    // Block dashing if already off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES) return;
    
    const startLane = this.playerLane;
    const targetLane = Math.max(-1, this.playerLane - 2);  // Dash 2 lanes total
    // Can't dash if already at leftmost position  
    if(startLane <= -1) return;  // Allow dashing from lane 0
    
    this.isDashing = true;
    this.isMoving = true;
    
    // Set a flag to prevent move animations from creating bounce tweens
    this.isDashStarting = true;
    
    // Store jump state before killing tweens
    const wasJumping = this.isJumping;
    const jumpY = this.player.y;
    
    // Kill ALL existing tweens to prevent move animations from continuing
    this.tweens.killTweensOf(this.player);
    
    // Restore jump if we were jumping
    if (wasJumping) {
      // Continue the jump animation
      this.tweens.add({
        targets: this.player,
        y: gameState.PLAYER_Y,
        duration: 250,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.isJumping = false;
          this.player.y = gameState.PLAYER_Y;
          // Animate rotation back to 0 if needed
          if(Math.abs(this.player.angle % 360) > 1) {
            this.tweens.add({
              targets: this.player,
              angle: 0,
              duration: 200,
              ease: 'Cubic.easeOut'
            });
          } else {
            this.player.angle = 0;
          }
        }
      });
    }
    
    // Always update X to start lane position before dashing
    const startX = this._laneX(startLane);
    if (!this.isJumping) {
      this.player.x = startX;
    }
    this.player.setScale(1, 1);  // Reset scale
    this.player.angle = 0;  // Reset rotation
    
    // Create dash trail effect at start position
    const trail1 = this.add.image(startX, this.player.y, 'playerTex');
    trail1.setAlpha(0.5);
    trail1.setTint(0x00ffff);
    
    const trail2 = this.add.image(startX, this.player.y, 'playerTex');
    trail2.setAlpha(0.3);
    trail2.setTint(0x00ffff);
    
    // Dash sound effect
    try {
      const now = Tone.now();
      gameSounds.move.triggerAttackRelease("C4", "32n", now);
      gameSounds.move.triggerAttackRelease("G3", "32n", now + 0.02);
      // Whoosh effect using filter sweep
      gameSounds.offScreenWomp.triggerAttackRelease("C3", "32n", now);
    } catch(e) {}
    
    // Update lane immediately so firing is in sync
    this.playerLane = targetLane;
    
    // Reset rubber band timer when dashing off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES){
      // Give extra time when dashing from edge lanes (0 or 4) to off-screen
      const isDashingFromEdge = (startLane === 0 && this.playerLane < 0) || 
                                (startLane === LANES - 1 && this.playerLane >= LANES);
      this.offScreenTimer = isDashingFromEdge ? 
        PLAYER_CONFIG.offScreen.gracePeriod + 400 : // Extra 400ms for edge dash
        PLAYER_CONFIG.offScreen.gracePeriod;
      this.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);
      
      // Set turn delay based on dash type and rapid fire status
      if(isDashingFromEdge) {
        // Outer lane dash: 1200ms total
        if(this.rapidFire) {
          // Rapid fire: leave 290ms for firing (~7-8 shots)
          this.offScreenTurnDelay = 910; // 1200ms - 290ms
        } else {
          // Normal: leave 330ms for firing (~3 shots)
          this.offScreenTurnDelay = 870; // 1200ms - 330ms
        }
      } else {
        // Inner lane dash: 800ms total, same as normal move
        // Leave 220ms for firing (~2 shots normal, ~5-6 rapid)
        this.offScreenTurnDelay = 580; // 800ms - 220ms
      }
      this.offScreenShotCount = 0; // Reset shot counter
    } else {
      this.player.setAlpha(1);
    }
    
    const targetX = this._laneX(targetLane);
    
    // Check collision in the starting lane (we're passing through it during dash)
    this.checkDashCollision();
    
    // Set player to start position explicitly
    this.player.x = startX;
    
    // Log what we're about to animate
    // Fast dash animation to the target
    this.tweens.add({
      targets: [this.player, trail1, trail2],
      x: targetX,  // Just animate to target, don't use from/to syntax
      duration: PLAYER_CONFIG.dash.duration,  // 60ms - same as stretch phase
      ease: 'Power2',
      onComplete: () => {
        this.isMoving = false;
        this.isDashing = false;
        // Clear the dash starting flag after dash completes
        this.isDashStarting = false;
        // Ensure visual position matches logical lane
        const expectedX = this._laneX(this.playerLane);
        this.player.x = expectedX;
        
        // Log position again after a frame to see if something changes it
        this.time.delayedCall(16, () => {
        });
        
        // Store the expected position and check if anything modifies it
        const correctX = expectedX;
        let checkCount = 0;
        const positionChecker = this.time.addEvent({
          delay: 1,
          repeat: 200,
          callback: () => {
            if (Math.abs(this.player.x - correctX) > 1) {
              // Log all active tweens
              const activeTweens = this.tweens.getTweensOf(this.player);
              if (activeTweens.length > 0) {
              }
              positionChecker.remove();
            }
            checkCount++;
          }
        });
        // Check collision at endpoint
        this.checkDashCollision();
        
        // Add jiggle animation after dash
        this.tweens.add({
          targets: this.player,
          scaleX: [0.7, 1.2, 1],
          scaleY: [1.3, 0.9, 1],
          duration: 120,
          ease: 'Sine.easeInOut'
        });
      }
    });
    
    // Fade out trails
    this.tweens.add({
      targets: trail1,
      alpha: 0,
      duration: 200,
      delay: 50,
      onComplete: () => trail1.destroy()
    });
    
    this.tweens.add({
      targets: trail2,
      alpha: 0,
      duration: 200,
      delay: 100,
      onComplete: () => trail2.destroy()
    });
  }
  
  dashRight() {
    if(this.isDashing) return;  // Only check isDashing, not isMoving
    // Block dashing if already off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES) return;
    
    const startLane = this.playerLane;
    const targetLane = Math.min(LANES, this.playerLane + 2);  // Dash 2 lanes total
    // Can't dash if already at rightmost position
    if(startLane >= LANES) return;  // Allow dashing from lane 4 to off-screen
    
    this.isDashing = true;
    this.isMoving = true;
    
    // Set a flag to prevent move animations from creating bounce tweens
    this.isDashStarting = true;
    
    // Store jump state before killing tweens
    const wasJumping = this.isJumping;
    const jumpY = this.player.y;
    
    // Kill ALL existing tweens to prevent move animations from continuing
    this.tweens.killTweensOf(this.player);
    
    // Restore jump if we were jumping
    if (wasJumping) {
      // Continue the jump animation
      this.tweens.add({
        targets: this.player,
        y: gameState.PLAYER_Y,
        duration: 250,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.isJumping = false;
          this.player.y = gameState.PLAYER_Y;
          // Animate rotation back to 0 if needed
          if(Math.abs(this.player.angle % 360) > 1) {
            this.tweens.add({
              targets: this.player,
              angle: 0,
              duration: 200,
              ease: 'Cubic.easeOut'
            });
          } else {
            this.player.angle = 0;
          }
        }
      });
    }
    
    // Always update X to start lane position before dashing
    const startX = this._laneX(startLane);
    if (!this.isJumping) {
      this.player.x = startX;
    }
    this.player.setScale(1, 1);  // Reset scale
    this.player.angle = 0;  // Reset rotation
    
    // Create dash trail effect at start position
    const trail1 = this.add.image(startX, this.player.y, 'playerTex');
    trail1.setAlpha(0.5);
    trail1.setTint(0x00ffff);
    
    const trail2 = this.add.image(startX, this.player.y, 'playerTex');
    trail2.setAlpha(0.3);
    trail2.setTint(0x00ffff);
    
    // Dash sound effect
    try {
      const now = Tone.now();
      gameSounds.move.triggerAttackRelease("C4", "32n", now);
      gameSounds.move.triggerAttackRelease("G3", "32n", now + 0.02);
      // Whoosh effect using filter sweep
      gameSounds.offScreenWomp.triggerAttackRelease("C3", "32n", now);
    } catch(e) {}
    
    // Update lane immediately so firing is in sync
    this.playerLane = targetLane;
    
    // Reset rubber band timer when dashing off-screen
    if(this.playerLane < 0 || this.playerLane >= LANES){
      // Give extra time when dashing from edge lanes (0 or 4) to off-screen
      const isDashingFromEdge = (startLane === 0 && this.playerLane < 0) || 
                                (startLane === LANES - 1 && this.playerLane >= LANES);
      this.offScreenTimer = isDashingFromEdge ? 
        PLAYER_CONFIG.offScreen.gracePeriod + 400 : // Extra 400ms for edge dash
        PLAYER_CONFIG.offScreen.gracePeriod;
      this.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);
      
      // Set turn delay based on dash type and rapid fire status
      if(isDashingFromEdge) {
        // Outer lane dash: 1200ms total
        if(this.rapidFire) {
          // Rapid fire: leave 290ms for firing (~7-8 shots)
          this.offScreenTurnDelay = 910; // 1200ms - 290ms
        } else {
          // Normal: leave 330ms for firing (~3 shots)
          this.offScreenTurnDelay = 870; // 1200ms - 330ms
        }
      } else {
        // Inner lane dash: 800ms total, same as normal move
        // Leave 220ms for firing (~2 shots normal, ~5-6 rapid)
        this.offScreenTurnDelay = 580; // 800ms - 220ms
      }
      this.offScreenShotCount = 0; // Reset shot counter
    } else {
      this.player.setAlpha(1);
    }
    
    const targetX = this._laneX(targetLane);
    
    // Check collision in the starting lane (we're passing through it during dash)
    this.checkDashCollision();
    
    // Set player to start position explicitly
    this.player.x = startX;
    
    // Log what we're about to animate
    // Fast dash animation to the target
    this.tweens.add({
      targets: [this.player, trail1, trail2],
      x: targetX,  // Just animate to target, don't use from/to syntax
      duration: PLAYER_CONFIG.dash.duration,  // 60ms - same as stretch phase
      ease: 'Power2',
      onComplete: () => {
        this.isMoving = false;
        this.isDashing = false;
        // Clear the dash starting flag after dash completes
        this.isDashStarting = false;
        // Ensure visual position matches logical lane
        const expectedX = this._laneX(this.playerLane);
        this.player.x = expectedX;
        
        // Log position again after a frame to see if something changes it
        this.time.delayedCall(16, () => {
        });
        
        // Store the expected position and check if anything modifies it
        const correctX = expectedX;
        let checkCount = 0;
        const positionChecker = this.time.addEvent({
          delay: 1,
          repeat: 200,
          callback: () => {
            if (Math.abs(this.player.x - correctX) > 1) {
              // Log all active tweens
              const activeTweens = this.tweens.getTweensOf(this.player);
              if (activeTweens.length > 0) {
              }
              positionChecker.remove();
            }
            checkCount++;
          }
        });
        // Check collision at endpoint
        this.checkDashCollision();
        
        // Add jiggle animation after dash
        this.tweens.add({
          targets: this.player,
          scaleX: [0.7, 1.2, 1],
          scaleY: [1.3, 0.9, 1],
          duration: 120,
          ease: 'Sine.easeInOut'
        });
      }
    });
    
    // Fade out trails
    this.tweens.add({
      targets: trail1,
      alpha: 0,
      duration: 200,
      delay: 50,
      onComplete: () => trail1.destroy()
    });
    
    this.tweens.add({
      targets: trail2,
      alpha: 0,
      duration: 200,
      delay: 100,
      onComplete: () => trail2.destroy()
    });
  }
  
  checkDashCollision() {
    // Check collision with obstacles during dash - using progress-based 3D collision
    for(let o of this.obstacles) {
      if(o.progress > 0.94 && o.progress < 0.97 && o.lane === this.playerLane && !this.isJumping && !this.isInvincible) {
        // Set invincible immediately to prevent multiple deaths
        this.isInvincible = true;
        
        // Hit obstacle during dash - game over
        this.cameras.main.shake(500, 0.03);
        this.player.setTint(0xff0000);
        
        // Player death sound - same as regular collision
        try {
          const now = Tone.now();
          gameSounds.obstacleHit.triggerAttackRelease("G2", "16n", now);
          gameSounds.obstacleHit.triggerAttackRelease("D2", "16n", now + 0.05);
          gameSounds.obstacleHit.triggerAttackRelease("G1", "16n", now + 0.1);
          gameSounds.explosion.triggerAttackRelease("8n", now + 0.02);
        } catch(e) {}
        
        // Show game over screen
        this.showGameOverScreen();
        break;
      }
    }
  }
  
  superJump(chargePercent = 1.0) {
    if(this.isJumping) return;
    this.isJumping = true;
    
    // Track super jumps for tutorial (only count if charged enough)
    if (this.isTutorial && this.tutorialWave === 5 && chargePercent > 0.3) {
      this.tutorialSuperJumps = (this.tutorialSuperJumps || 0) + 1;
    }
    
    // Calculate jump height: from 1x (120) to 3x (360) based on charge for more distinction
    const minHeight = 120;
    const maxHeight = 360;
    const jumpHeight = minHeight + (maxHeight - minHeight) * chargePercent;
    
    // Scale the stretch effect based on charge
    const stretchX = 0.6 + (1.0 - chargePercent) * 0.3; // More dramatic stretch
    const stretchY = 1.3 + chargePercent * 0.8; // More stretch for higher charge
    
    // Create launch particles effect for charged jumps
    if(chargePercent > 0.3) {
      // Create burst effect at player position
      const particleCount = Math.floor(5 + chargePercent * 15);
      for(let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 100 + chargePercent * 250;
        const particle = this.add.graphics();
        particle.x = this.player.x;
        particle.y = this.player.y;
        
        // Draw small glowing particle
        const particleColor = chargePercent > 0.7 ? 0xff00ff : 0x00ffcc;
        particle.fillStyle(particleColor, 1);
        particle.fillCircle(0, 0, 4);
        
        // Animate particle outward and fade
        this.tweens.add({
          targets: particle,
          x: particle.x + Math.cos(angle) * speed,
          y: particle.y + Math.sin(angle) * speed / 2,
          alpha: 0,
          duration: 600,
          ease: 'Power2',
          onComplete: () => {
            particle.destroy();
          }
        });
      }
      
      // Screen shake for powerful jumps
      if(chargePercent > 0.7) {
        this.cameras.main.shake(200, 0.008 + chargePercent * 0.01);
      }
    }
    
    // First squash down as launch preparation with jello wobble
    this.player.setScale(1.6, 0.3);
    
    // Pre-launch wobble build-up
    this.wobbleVelocity.y = -20 * (1 + chargePercent);
    
    // Then stretch up and launch with elastic
    this.tweens.add({
      targets: this.player,
      scaleX: stretchX * 0.7,
      scaleY: stretchY * 1.3,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Launch up with variable height
        const jumpDuration = 300 + chargePercent * 200;
        
        // Main jump tween with wobble
        this.tweens.add({
          targets: this.player,
          y: gameState.PLAYER_Y - jumpHeight,
          duration: jumpDuration,
          ease: 'Cubic.easeOut',
          onUpdate: (tween) => {
            // Add wobble during flight
            const progress = tween.progress;
            const wobbleAmount = (1 - progress) * 0.15; // Less wobble as we reach apex
            this.player.scaleX = 1 + Math.sin(progress * Math.PI * 4) * wobbleAmount;
            this.player.scaleY = 1 + Math.cos(progress * Math.PI * 4) * wobbleAmount;
          },
          yoyo: true,
          onYoyo: () => {
            // At apex, add a little squish
            this.player.setScale(1.2, 0.8);
            this.tweens.add({
              targets: this.player,
              scaleX: 1,
              scaleY: 1,
              duration: 100,
              ease: 'Sine.easeInOut'
            });
          },
          onComplete: () => {
            // Landing with multiple bounces
            this.player.setScale(2, 0.3); // Extreme squash on landing
            this.wobbleVelocity.y = 15;
            
            // First bounce up
            this.tweens.add({
              targets: this.player,
              scaleX: 0.7,
              scaleY: 1.5,
              y: gameState.PLAYER_Y - 20,
              duration: 100,
              ease: 'Quad.easeOut',
              onComplete: () => {
                // Mini landing
                this.tweens.add({
                  targets: this.player,
                  scaleX: 1.3,
                  scaleY: 0.7,
                  y: gameState.PLAYER_Y,
                  duration: 80,
                  ease: 'Quad.easeIn',
                  onComplete: () => {
                    // Allow jumping after first bounce
                    this.isJumping = false;
                    this.player.y = gameState.PLAYER_Y;
                    
                    // Handle rotation reset and queued actions here
                    if(Math.abs(this.player.angle % 360) > 1) {
                      this.tweens.add({
                        targets: this.player,
                        angle: 0,
                        duration: 200,
                        ease: 'Cubic.easeOut'
                      });
                    } else {
                      this.player.angle = 0;
                    }
                    
                    // Check if we should start charging based on queued crouch
                    if (this.queuedCrouchOnLanding && this.currentZone === 'crouch') {
                      this.isChargingJump = true;
                      this.chargeGlow.setVisible(true);
                      this.queuedCrouchOnLanding = false;
                      
                      // Start time-based charging like keyboard
                      this.touchChargeStartTime = this.time.now;
                      this.usingTimeBasedCharge = true;
                      this.jumpChargeAmount = 0;
                      this.maxPullDistance = 0;
                      // Start charge sound
                      try {
                        gameSounds.jumpCharge.triggerAttack("C2");
                      } catch(e) {}
                      
                      // Reset touch reference point
                      const activePointer = this.input.activePointer;
                      if (activePointer && activePointer.isDown) {
                        const edgePadding = this.zoneRadius * 0.7;
                        this.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
                        this.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);
                      }
                      
                      // Squash animation when starting crouch
                      this.tweens.add({
                        targets: this.player,
                        scaleX: 1.4,
                        scaleY: 0.6,
                        duration: 100,
                        ease: 'Power2'
                      });
                    }
                    
                    // Check for queued super jump
                    if (this.queuedSuperJumpCharge > 0) {
                      const charge = this.queuedSuperJumpCharge;
                      this.queuedSuperJumpCharge = 0;
                      this.time.delayedCall(50, () => {
                        this.superJump(charge);
                      });
                    }
                    
                    // Final jello settle
                    this.tweens.add({
                      targets: this.player,
                      scaleX: 1,
                      scaleY: 1,
                      duration: 400,
                      ease: 'Elastic.easeOut',
                      easeParams: [0.2, 0.15],
                      onComplete: () => {
                        // Final settle complete - everything was handled after first bounce
                      }
                    });
                  }
                });
              }
            });
          }
        });
        
        // Spin based on charge with wobble
        const spinAngle = 360 + chargePercent * 360;
        this.tweens.add({
          targets: this.player,
          angle: spinAngle,
          duration: jumpDuration * 2,
          ease: 'Cubic.easeInOut'
        });
      }
    });
    
    // Enhanced super jump sound that scales with charge
    try {
      const now = Tone.now();
      
      // Base launch sound - deeper and more powerful than regular jump
      gameSounds.powerUp.triggerAttackRelease("C3", "8n", now);
      
      if(chargePercent > 0.3) {
        // Add harmonic layer
        gameSounds.powerUp.triggerAttackRelease("G3", "8n", now + 0.02);
        gameSounds.move.triggerAttackRelease("C6", "16n", now);
      }
      if(chargePercent > 0.5) {
        // Add rising arpeggio
        gameSounds.powerUp.triggerAttackRelease("E4", "16n", now + 0.05);
        gameSounds.move.triggerAttackRelease("G6", "16n", now + 0.08);
      }
      if(chargePercent > 0.7) {
        // Add high sparkle for max charge
        gameSounds.powerUp.triggerAttackRelease("C5", "32n", now + 0.1);
        gameSounds.move.triggerAttackRelease("E7", "32n", now + 0.12);
        // Extra bass thump for maximum power
        gameSounds.offScreenWomp.triggerAttackRelease("C1", "16n", now);
      }
    } catch(e) {}
  }

  _laneX(lane, progress = 1){ 
    // Interpolate X position between vanishing point and lane position based on progress
    // Use the same vanishing point as the grid
    const vanishX = this.vanishX || gameState.WIDTH / 2;
    // Clamp off-screen lanes to be partially visible
    let clampedLane = lane;
    if(lane < 0) {
      clampedLane = -0.7; // Show 30% of ship on left edge
    } else if(lane >= LANES) {
      clampedLane = LANES - 0.3; // Show 30% of ship on right edge
    }
    const bottomLaneX = clampedLane * gameState.LANE_W + gameState.LANE_W / 2;
    return vanishX + (bottomLaneX - vanishX) * progress;
  }
  _spawnEnemy(lane, speed, texture='enemyTex'){ 
    const vanishY = gameState.HEIGHT * 0.15; // Same horizon as grid
    const e=this.add.image(this._laneX(lane, 0), vanishY, texture); // Start at vanishing point
    e.lane = lane;
    e.progress = 0; // 0 = at horizon, 1 = at player
    e.vy=speed; 
    e.baseSize = texture === 'fastEnemyTex' ? this.fastEnemyBaseSize : this.enemyBaseSize;
    e.w=e.baseSize; e.h=e.baseSize; 
    e.enemyType = texture; // Track enemy type
    e.setScale(0.1); // Start tiny at horizon
    e.setDepth(100); // Between shield (10) and poles (200)
    e.trailPoints = []; // Store trail history
    this.enemies.push(e); 
  }
  
  _createSplatEffect(x, y) {
    // Create a splat/squish effect for hitting walls
    const splatColor = 0x00ffcc;
    
    // Main splat circle that expands and fades
    const splat = this.add.circle(x, y, 30, splatColor, 1); // Much bigger initial size
    splat.setDepth(1000); // Make sure it's on top
    this.tweens.add({
      targets: splat,
      scaleX: 6, // Bigger expansion
      scaleY: 0.8, // Less squish
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => splat.destroy()
    });
    
    // Splatter particles that spray outward
    for(let i = 0; i < 12; i++) {
      const particle = this.add.rectangle(x, y, 16, 16, splatColor); // Bigger particles
      particle.setDepth(1000); // Make sure particles are on top
      const angle = (Math.PI * 2 / 12) * i;
      const speed = 150 + Math.random() * 100;
      
      // Particles spray more horizontally than vertically
      const xVel = Math.cos(angle) * speed * 1.5;
      const yVel = Math.sin(angle) * speed * 0.5;
      
      this.tweens.add({
        targets: particle,
        x: x + xVel,
        y: y + yVel,
        scaleX: 0.2,
        scaleY: 2, // Stretch vertically as they fall
        alpha: 0,
        rotation: Math.random() * Math.PI,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Screen flash
    this.cameras.main.flash(200, 0, 255, 204, true);
  }
  
  pauseGame() {
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
  
  resumeGame() {
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
  
  showGameOverScreen() {
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
  
  _createDeathExplosion(playerX, playerY, enemyX, enemyY, enemyScale = 1.0) {
    // Multi-stage explosion for dramatic effect
    const colors = [0x00ffcc, 0xff3366, 0xffff00, 0xffffff];
    
    // Stage 1: Initial impact
    this._createExplosion(playerX, playerY, 0x00ffcc, 25, 1.0); // Player explosion always full size
    this._createExplosion(enemyX, enemyY, 0xff3366, 15, enemyScale); // Enemy explosion scales
    
    // Stage 2: Shockwave ring
    const ring = this.add.circle(playerX, playerY, 20, 0xffffff, 0);
    ring.setStrokeStyle(4, 0x00ffff, 1);
    this.tweens.add({
      targets: ring,
      scale: 5,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });
    
    // Stage 3: Delayed secondary explosions
    this.time.delayedCall(100, () => {
      for(let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        this._createExplosion(playerX + offsetX, playerY + offsetY, colors[i % colors.length], 10);
      }
    });
    
    // Camera shake and flash
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.flash(300, 255, 0, 0, true);
  }
  
  _createExplosion(x, y, color = 0xff3366, particleCount = 8, scale = 1.0){
    // Create particle explosion effect scaled by distance
    const scaledParticleCount = Math.max(3, Math.floor(particleCount * scale)); // Reduce particles for distant explosions
    const particleSize = 12 * scale; // Scale particle size
    
    for(let i = 0; i < scaledParticleCount; i++){
      const particle = this.add.rectangle(x, y, particleSize, particleSize, color);
      particle.setDepth(1000); // Ensure on top
      const angle = (Math.PI * 2 / scaledParticleCount) * i;
      const speed = (100 + Math.random() * 100) * scale; // Scale spread distance
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.1,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Add a flash effect scaled by distance
    const flash = this.add.circle(x, y, 40 * scale, color, 0.9); // Scale flash size
    flash.setDepth(999); // Just below particles
    this.tweens.add({
      targets: flash,
      scale: 3, // Bigger expansion
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }
  _spawnObstacle(lane){
    const vanishY = gameState.HEIGHT * 0.15;
    const baseX = this._laneX(lane, 0);
    
    // Calculate dimensions
    const obstacleW = Math.floor(80 * (Math.min(gameState.WIDTH, gameState.HEIGHT) / 800) * (isMobile ? 1.2 : 1.0) * gameState.MOBILE_SCALE);
    const obstacleH = Math.floor(22 * (Math.min(gameState.WIDTH, gameState.HEIGHT) / 800) * (isMobile ? 1.2 : 1.0) * gameState.MOBILE_SCALE);
    const poleWidth = Math.floor(obstacleW * 0.15);
    const shieldGap = 2;
    
    // For now, just use the original simple obstacle texture
    // The layering effect doesn't work with containers as I tried
    const o = this.add.image(baseX, vanishY, 'obstacleTex');
    o.lane = lane;
    o.progress = 0;
    o.vy = ENEMY_SPEED_BASE * 0.7;
    o.baseSize = Math.floor(60 * gameState.MOBILE_SCALE);
    o.w = o.baseSize;
    o.h = Math.floor(22 * gameState.MOBILE_SCALE);
    o.setScale(0.1);
    o.setDepth(150); // Put obstacles in front of enemies for now
    o.trailPoints = [];
    o.isObstacle = true;
    
    this.obstacles.push(o);
    
    // If we're in break section, spawn a star above this obstacle
    // During tutorial wave 6, always spawn stars. After tutorial, only in actual break sections
    if(this.isBreakSection) {
      // Always spawn stars during tutorial wave 6, or in normal game breaks
      if ((this.isTutorial && this.tutorialWave === 6) || !this.isTutorial) {
        this._spawnFloatingStar(o);
      }
    }
  }
  
  _spawnFloatingStar(obstacle) {
    const star = this.add.image(obstacle.x, obstacle.y - 25, 'starTex');
    star.attachedObstacle = obstacle;
    star.setScale(1.0); // Start at normal size, let update handle perspective scaling
    star.setDepth(160); // Above obstacles
    star.collected = false;
    star.rotationSpeed = 0.05; // Spinning speed
    star.floatOffset = 0;
    star.floatSpeed = 0.003;
    
    this.floatingStars.push(star);
  }
  
  _spawnPowerUp(lane){
    const vanishY = gameState.HEIGHT * 0.15;
    const p = this.add.image(this._laneX(lane, 0), vanishY, 'powerUpTex');
    p.lane = lane;
    p.progress = 0;
    p.vy = ENEMY_SPEED_BASE * 1.2;
    p.baseSize = Math.floor(20 * gameState.MOBILE_SCALE);
    p.setScale(0.1);
    p.setDepth(100); // Same depth as enemies - between shield and poles
    this.powerUps.push(p);
  }
  
  handleTutorialSpawn() {
    return handleTutorialSpawnSystem.call(this);
  }
  
  updateTutorialProgress() {
    return updateTutorialProgressSystem.call(this);
  }
  
  advanceTutorial() {
    return advanceTutorialSystem.call(this);
  }
  
  skipTutorial() {
    return skipTutorialSystem.call(this);
  }
  
  completeTutorial() {
    return completeTutorialSystem.call(this);
  }
  
  _spawnDrifter(lane){
    const vanishY = gameState.HEIGHT * 0.15;
    const d = this.add.image(this._laneX(lane, 0), vanishY, 'drifterTex');
    d.lane = lane;
    d.targetLane = lane; // Will change
    d.progress = 0;
    d.vy = ENEMY_SPEED_BASE * 0.8;
    d.baseSize = this.enemyBaseSize; // Use screen-relative size
    // Smaller collision box for diamonds - about 70% of visual size for tighter timing
    d.w = d.baseSize * 0.7; 
    d.h = d.baseSize * 0.7;
    d.enemyType = 'drifterTex';
    d.isDrifter = true;
    d.driftTimer = 0;
    d.setScale(0.1);
    d.setDepth(100); // Between shield (10) and poles (200)
    d.trailPoints = []; // Initialize trail points
    this.enemies.push(d); // Add to enemies array for collision
  }
  
  _pulseGrid(){
    // Set a pulse flag and timer
    this.pulseActive = true;
    this.pulseTimer = 150; // milliseconds
    this.pulsePhase = 0;
    
    // Check if we're in chaos mode - use random
    if (currentDifficulty === DIFFICULTY_PRESETS.chaos) {
      // Random pulse type: 0 = forward, 1 = left, 2 = right
      this.pulseType = Math.floor(Math.random() * 3);
    } else {
      // Use pattern based on current section
      const section = getSection(currentBar);
      const patternType = sectionPatternMap[section] || 'gentle';
      const patterns = pulsePatternPool[patternType];
      
      // Pick a pattern based on the current cycle
      // Use currentBar to ensure consistency within each section
      const patternIndex = Math.floor(currentBar / 8) % patterns.length;
      const pattern = patterns[patternIndex];
      
      // Calculate position within pattern (2 sub hits per bar)
      const hitsPerBar = 2;
      const totalHits = currentBar * hitsPerBar;
      const positionInPattern = totalHits % pattern.length;
      
      // Get direction from pattern (-1 = skip, 0 = forward, 1 = left, 2 = right)
      const direction = pattern[positionInPattern];
      
      if (direction === -1) {
        // Skip this pulse
        this.pulseActive = false;
        return;
      }
      
      // Safety check: prevent more than 2 forward pulses in a row
      if (!this.lastTwoDirections) this.lastTwoDirections = [];
      if (direction === 0 && this.lastTwoDirections.length >= 2 && 
          this.lastTwoDirections[0] === 0 && this.lastTwoDirections[1] === 0) {
        // Force a side movement instead
        this.pulseType = Math.random() > 0.5 ? 1 : 2;
      } else {
        this.pulseType = direction;
      }
      
      // Track last two directions
      this.lastTwoDirections.unshift(this.pulseType);
      if (this.lastTwoDirections.length > 2) {
        this.lastTwoDirections.pop();
      }
    }
  }
  
  _drawPerspectiveGrid(){
    // Clear and redraw the entire grid
    if(!this.gridGraphics){
      this.gridGraphics = this.add.graphics();
      this.gridOffset = 0;
    }
    
    // Always update vanishing point based on current dimensions
    this.vanishX = gameState.WIDTH / 2;
    this.vanishY = gameState.HEIGHT * 0.15;  // Move horizon much higher
    
    // Safety check - recreate if destroyed
    if(!this.gridGraphics.scene) {
      this.gridGraphics = this.add.graphics();
    }
    
    // Safety check before clearing
    if(!this.gridGraphics || !this.gridGraphics.scene) {
      // Grid graphics lost, recreating...
      this.gridGraphics = this.add.graphics();
    }
    
    this.gridGraphics.clear();
    const numLines = 12;
    
    // Draw curved lane lines that match the exponential perspective
    for(let lane = 0; lane <= LANES; lane++){
      const bottomX = lane * gameState.LANE_W;
      this.gridGraphics.lineStyle(1, 0x00ff00, 0.2);
      
      // Draw lane as a series of connected segments following the curve
      let lastX = this.vanishX;
      let lastY = this.vanishY;
      
      for(let t = 0.1; t <= 1; t += 0.1){
        // Use same exponential curve as objects
        const y = this.vanishY + (gameState.HEIGHT - this.vanishY) * Math.pow(t, 2.5);
        // Interpolate X position along the curve
        const x = this.vanishX + (bottomX - this.vanishX) * t;
        
        this.gridGraphics.lineBetween(lastX, lastY, x, y);
        lastX = x;
        lastY = y;
      }
      // Final segment to bottom
      this.gridGraphics.lineBetween(lastX, lastY, bottomX, gameState.HEIGHT);
    }
    
    // Draw horizontal lines with exponential spacing (Beamrider style)
    for(let i = 0; i < numLines; i++){
      // Calculate position with perspective - exponential spacing
      const t = (i + this.gridOffset % 1) / numLines;
      const y = this.vanishY + (gameState.HEIGHT - this.vanishY) * Math.pow(t, 2.5); // Exponential curve for perspective
      
      if(y < this.vanishY || y > gameState.HEIGHT) continue;
      
      // Width increases as lines get closer
      const width = gameState.WIDTH * (0.1 + t * 1.5);
      const alpha = 0.3 - t * 0.2; // Fade in distance
      
      this.gridGraphics.lineStyle(2, 0x00ff00, alpha);
      this.gridGraphics.lineBetween(gameState.WIDTH/2 - width/2, y, gameState.WIDTH/2 + width/2, y);
    }
  }
  _fire(){ 
    // Can't shoot while controls disabled or moving
    if(!this.playerCanControl || this.isMoving) return;
    
    // Check if we're off-screen for horizontal shooting
    const isOffScreen = this.playerLane < 0 || this.playerLane >= LANES;
    if(!HORIZONTAL_SHOOTING && isOffScreen) return; // Original behavior - can't shoot off-screen
    
    // Enforce turn delay when off-screen (timing-based shot limit)
    if(HORIZONTAL_SHOOTING && isOffScreen) {
      if(this.offScreenTurnDelay > 0) return; // Still turning around
      // Shot limit is now controlled by the firing window duration
    }
    
    const now=this.time.now; 
    
    // Block firing if we just resumed from pause
    if(this.fireBlockTime && now < this.fireBlockTime) return;
    
    const cooldown = (this.rapidFire ? FIRE_COOLDOWN/3 : FIRE_COOLDOWN) * currentDifficulty.fireMult;
    if(now-this.lastShotAt<cooldown) return; 
    this.lastShotAt=now;
    
    // Add recoil wobble when shooting
    this.wobbleVelocity.y = 3; // Small upward push
    if(!this.isJumping) {
      // Quick recoil animation for ground shots
      this.tweens.add({
        targets: this.player,
        scaleX: 0.9,
        scaleY: 1.1,
        duration: 50,
        ease: 'Power1',
        yoyo: true
      });
    } 
    // Shoot from player's current position (accounts for jumping)
    const b=this.add.image(this.player.x, this.player.y, 'bulletTex'); 
    b.lane = this.playerLane;
    b.setDepth(50); // Above enemies/obstacles but below player
    
    // Set bullet color based on combo level - smooth progression white->green->cyan->purple
    let bulletColor = 0xffffff; // 1x: Pure white (no combo)
    
    switch(this.combo) {
      case 1: bulletColor = 0xffffff; break;  // Pure white
      case 2: bulletColor = 0xccffcc; break;  // Light green
      case 3: bulletColor = 0x00ff00; break;  // Pure green
      case 4: bulletColor = 0x00ff88; break;  // Green-cyan blend
      case 5: bulletColor = 0x00ffff; break;  // Pure cyan
      case 6: bulletColor = 0x88ccff; break;  // Cyan-purple blend
      case 7: bulletColor = 0xcc88ff; break;  // Light purple
      case 8: 
      default: bulletColor = 0xff00ff; break;  // Neon purple (max combo)
    }
    
    // Modify brightness based on jump height for visual variety
    if(this.isJumping) {
      const jumpHeight = Math.max(0, this.groundY - this.player.y);
      const heightPercent = Math.min(1, jumpHeight / 200);
      // Add subtle brightness boost for jump shots
      if(heightPercent > 0.5) {
        // Brighten the color slightly for high jumps
        const r = Math.min(255, ((bulletColor >> 16) & 0xFF) + 30);
        const g = Math.min(255, ((bulletColor >> 8) & 0xFF) + 30);
        const b = Math.min(255, (bulletColor & 0xFF) + 30);
        bulletColor = (r << 16) | (g << 8) | b;
      }
    }
    
    b.setTint(bulletColor);
    
    // Store initial values for rotation calculation
    b.lastX = this.player.x;
    b.lastY = this.player.y;
    b.rotationSpeed = 0; // For spinning effect at higher combos
    if(this.combo >= 6) {
      b.rotationSpeed = 0.3; // Spin bullets at high combo
    }
    
    // Calculate progress based on player's current Y position
    // When jumping, player.y is higher (smaller), so we need to adjust progress
    const vanishY = gameState.HEIGHT * 0.15;
    const normalizedY = (this.player.y - vanishY) / (gameState.HEIGHT - vanishY);
    // Inverse the exponential curve formula to get progress from Y position
    b.progress = Math.pow(normalizedY, 1/2.5);
    
    // Debug logging for arc shot spawn
    if(this.isJumping) {
    }
    
    if (HORIZONTAL_SHOOTING && isOffScreen) {
      // Horizontal shooting when off-screen - sweep across all lanes
      // Determine direction based on which side we're on
      const direction = this.playerLane < 0 ? 1 : -1; // Shoot right if on left, left if on right
      
      b.vx = direction * BULLET_SPEED * 1.2; // Slightly faster for dramatic effect
      b.vy = 0; // No vertical movement
      b.isHorizontal = true;
      b.startLane = this.playerLane;
      b.currentLane = this.playerLane < 0 ? -0.5 : 4.5; // Start just outside visible area
      b.w = Math.floor(12 * gameState.MOBILE_SCALE); // Wider for horizontal
      b.h = Math.floor(6 * gameState.MOBILE_SCALE); // Shorter for horizontal
      b.setRotation(direction > 0 ? Math.PI/2 : -Math.PI/2); // Rotate 90 degrees for horizontal orientation
    } else {
      // Normal vertical shooting
      b.vy=-BULLET_SPEED; 
      b.isHorizontal = false;
    }
    
    b.w = b.w || Math.floor(6 * gameState.MOBILE_SCALE); 
    b.h = b.h || Math.floor(12 * gameState.MOBILE_SCALE);
    
    // If jumping, give bullet an arc trajectory with safe distance
    if(this.isJumping && !isOffScreen) {
      b.isArcShot = true;
      // Calculate safe distance based on jump height
      const jumpHeight = Math.abs(this.player.y - gameState.PLAYER_Y);
      const jumpPercent = Math.min(jumpHeight / ARC_SHOT_MAX_JUMP_HEIGHT, 1);
      b.safeDistance = ARC_SHOT_BASE_SAFE_DISTANCE + (jumpPercent * ARC_SHOT_HEIGHT_BONUS);
      b.startY = this.player.y; // Launch from jump height
      b.progress = 1.0; // Arc shots always start at bottom progress, regardless of visual height
      b.arcDistance = 0; // Track how far the arc shot has traveled
    } 
    if(this.rapidFire) {
      b.vy *= 1.5; // Faster bullets in rapid fire
      // Only play sound sometimes in rapid fire to avoid timing errors
      if(Math.random() < 0.3){
        try {
          // Use a consistent note in rapid fire instead of random
          const note = getGameNote(this.playerLane) + "6"; // Higher octave but same lane note
          const sound = gameSounds.laserSounds[gameSounds.currentLaserSound];
          if (sound.triggerAttackRelease) {
            sound.triggerAttackRelease(note, "32n", Tone.now() + 0.01);
          } else if (sound.triggerAttack) {
            // For PluckSynth which uses triggerAttack
            sound.triggerAttack(note, Tone.now() + 0.01);
          }
        } catch(e) {}
      }
    } else {
      try {
        const note = getGameNote(this.playerLane) + "5";
        const sound = gameSounds.laserSounds[gameSounds.currentLaserSound];
        
        // Different sounds need different trigger methods
        if (gameSounds.currentLaserSound === 2) {
          // Chord stab - play a mini chord
          const chordNotes = [note, getGameNote(this.playerLane + 2) + "5", getGameNote(this.playerLane + 4) + "5"];
          sound.triggerAttackRelease(chordNotes, "32n", Tone.now() + 0.01);
        } else if (gameSounds.currentLaserSound === 4) {
          // PluckSynth uses triggerAttack
          sound.triggerAttack(note, Tone.now() + 0.01);
        } else if (gameSounds.currentLaserSound === 5) {
          // Pew pew - play high note then quickly sweep down
          const highNote = getGameNote(this.playerLane) + "6";
          const lowNote = getGameNote(this.playerLane) + "3";
          sound.triggerAttackRelease(highNote, "16n", Tone.now());
          // Ramp the frequency down for pew pew effect
          sound.frequency.exponentialRampToValueAtTime(
            Tone.Frequency(lowNote).toFrequency(),
            Tone.now() + 0.15
          );
        } else {
          // Regular MonoSynth sounds
          sound.triggerAttackRelease(note, "32n", Tone.now() + 0.01);
        }
      } catch(e) {}
    }
    this.bullets.push(b); 
  }
  _aabb(a,b){ 
    return Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.y-b.y) < (a.h+b.h)/2; 
  }

  update(_, dt){
    // Update tutorial progress if in tutorial mode
    if (this.isTutorial) {
      this.updateTutorialProgress();
    }
    
    // Update adaptive difficulty recovery
    if (this.adaptiveState.isAssisting && !this.isPaused && !this.isShowingGameOver) {
      const assistDuration = (this.time.now - this.adaptiveState.assistStartTime) / 1000;
      
      if (assistDuration > 90) {
        // After 90 seconds, return to normal
        this.adaptiveState.isAssisting = false;
        this.adaptiveState.currentSpawnMultiplier = 1.0;
        this.adaptiveState.currentSpeedMultiplier = 1.0;
      } else if (assistDuration > 60) {
        // 60-90 seconds: 90% spawn, 95% speed
        this.adaptiveState.currentSpawnMultiplier = 0.9;
        this.adaptiveState.currentSpeedMultiplier = 0.95;
      } else if (assistDuration > 30) {
        // 30-60 seconds: 80% spawn, 90% speed
        this.adaptiveState.currentSpawnMultiplier = 0.8;
        this.adaptiveState.currentSpeedMultiplier = 0.9;
      }
      // 0-30 seconds: stays at 70% spawn, 85% speed
    }
    
    // Handle ESC key for pause (blocked during game over)
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      if (this.isShowingGameOver) return; // Block pause during game over
      if (!this.isPaused) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    }
    
    // Handle grid toggle even when paused
    if(Phaser.Input.Keyboard.JustDown(this.keys.G)){
      this.gridVisible = !this.gridVisible;
      gameState.gridEnabled = this.gridVisible; // Save to persistent setting
      saveGameData({ settings: { gridEnabled: gameState.gridEnabled } });
      if(!this.gridVisible && this.gridGraphics) {
        this.gridGraphics.clear();
      } else if(this.gridVisible && this.isPaused) {
        // When paused and turning grid on, we need to draw it manually
        // since the normal update loop won't run
        this._drawPerspectiveGrid();
      }
      // Sync UI state
      uiState.gridVisible = this.gridVisible;
      updateGridButton();
    }
    
    // Handle resume from pause with SPACE or touch
    if (this.isPaused) {
      if ((this.keys.SPACE.isDown || this.isTouchFiring) && !this.isHandlingFeedback) {
        this.resumeGame();
        // Small delay to prevent immediate firing after resume
        this.fireBlockTime = this.time.now + 100;
      }
      return; // Skip all updates when paused
    }
    
    // Update idle wobble animation when not moving
    if(!this.isMoving && !this.isJumping && !this.isDashing && this.player) {
      // Breathing/idle animation
      this.idleWobblePhase += dt * 0.003;
      const breathScale = 1 + Math.sin(this.idleWobblePhase) * 0.03;
      const squishScale = 1 - Math.cos(this.idleWobblePhase * 2) * 0.02;
      
      // Apply idle animation only if not already being animated
      if(!this.tweens.isTweening(this.player)) {
        this.player.setScale(
          breathScale * (1 + this.wobbleVelocity.x * 0.01),
          squishScale * (1 + this.wobbleVelocity.y * 0.01)
        );
      }
      
      // Update wobble physics
      this.wobbleVelocity.x *= this.wobbleDamping;
      this.wobbleVelocity.y *= this.wobbleDamping;
      
      // Add subtle random wobble impulses
      if(Math.random() < 0.02) {
        this.wobbleVelocity.x += (Math.random() - 0.5) * 2;
        this.wobbleVelocity.y += (Math.random() - 0.5) * 2;
      }
    }
    
    // Handle time-based touch charge (when queued from air)
    if (this.isChargingJump && this.usingTimeBasedCharge) {
      const currentTime = this.time.now;
      const elapsed = currentTime - this.touchChargeStartTime;
      const previousCharge = this.jumpChargeAmount;
      this.jumpChargeAmount = Math.min(elapsed / this.maxChargeTime, 1.0);
      
      // Log every 100ms to avoid spam
      if (Math.floor(elapsed / 100) > Math.floor((elapsed - dt) / 100)) {
      }
      
      // Update the glow effect
      this.chargeGlow.clear();
      this.chargeGlow.setPosition(this.player.x, this.player.y);
      
      const pulseSpeed = 10 + this.jumpChargeAmount * 20;
      const pulse = Math.sin(currentTime * pulseSpeed * 0.001) * 0.2 + 0.8;
      const glowRadius = 30 + this.jumpChargeAmount * 50 * pulse;
      const glowAlpha = 0.3 + this.jumpChargeAmount * 0.5 * pulse;
      
      const glowColor = this.jumpChargeAmount < 0.3 ? 
        { r: 0, g: 136, b: 255 } : // Blue
        this.jumpChargeAmount < 0.7 ? 
        { r: 255, g: 255, b: 0 } : // Yellow
        { r: 255, g: 0, b: 255 };  // Purple
      
      const hexColor = Phaser.Display.Color.GetColor(glowColor.r, glowColor.g, glowColor.b);
      this.chargeGlow.fillStyle(hexColor, glowAlpha);
      this.chargeGlow.fillCircle(0, 0, glowRadius);
      
      // Update pitch of charge sound
      try {
        const pitchShift = 1 + this.jumpChargeAmount * 2;
        gameSounds.jumpCharge.frequency.exponentialRampToValueAtTime(
          Tone.Frequency("C2").toFrequency() * pitchShift,
          Tone.now() + 0.05
        );
      } catch(e) {}
    }
    
    // Update combo timer display
    if(this.combo > 1) {
      const timeSinceKill = this.time.now - this.lastKillTime;
      const timeRemaining = Math.max(0, this.comboWindow - timeSinceKill);
      const meterPercent = timeRemaining / this.comboWindow;
      
      // Show combo meter
      this.comboMeterBg.setVisible(true);
      this.comboMeter.clear();
      
      // Color based on combo level and time remaining
      let meterColor = 0x00ff00; // Green
      if(meterPercent < 0.3) meterColor = 0xff0000; // Red when about to expire
      else if(meterPercent < 0.6) meterColor = 0xffff00; // Yellow warning
      else if(this.combo >= 6) meterColor = 0xff00ff; // Purple for high combos
      else if(this.combo >= 4) meterColor = 0x00ffff; // Cyan for mid combos
      
      this.comboMeter.fillStyle(meterColor, 0.8);
      this.comboMeter.fillRect(10, this.comboMeterY, 200 * meterPercent, 8);
      
      // Reset combo if timer expired
      if(timeRemaining <= 0) {
        this.combo = 1;
        this.comboMeterBg.setVisible(false);
        this.comboMeter.clear();
      }
    } else {
      // Hide meter when no combo
      this.comboMeterBg.setVisible(false);
      this.comboMeter.clear();
    }
    
    // Update starfield background
    this.updateStarfield(dt);
    
    // Update and draw trails
    this.updateTrails(dt);
    
    // Handle pulse effect - shift in different directions
    let pulseShift = 0;
    let pulseXShift = 0;
    // Disable pulse during tutorial to reduce difficulty
    if(this.pulseActive && !this.isTutorial){
      this.pulseTimer -= dt;
      if(this.pulseTimer <= 0){
        this.pulseActive = false;
      } else {
        // Create a pulse curve
        const t = 1 - (this.pulseTimer / 150);
        const amount = Math.sin(t * Math.PI);
        
        if(this.pulseType === 0){
          // Forward pulse - reduced from 0.05 to 0.015 for gentler movement
          pulseShift = amount * 0.015;
        } else if(this.pulseType === 1){
          // Left pulse
          pulseXShift = -amount * 30; // pixels
        } else {
          // Right pulse
          pulseXShift = amount * 30;
        }
      }
    }
    
    // Animate the perspective grid tied to BPM
    if(!this.gridOffset) this.gridOffset = 0;
    // Get current BPM from Tone.Transport or use default
    const currentBPM = (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : 132;
    // Scale grid speed to BPM - higher BPM = faster scrolling
    // Grid toggle moved to top of update() to work when paused
    
    // Switch laser sounds with number keys
    if(Phaser.Input.Keyboard.JustDown(this.keys.ONE)) {
      gameSounds.currentLaserSound = 0;
      this.updateSoundDisplay();
    }
    if(Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
      gameSounds.currentLaserSound = 1;
      this.updateSoundDisplay();
    }
    if(Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
      gameSounds.currentLaserSound = 2;
      this.updateSoundDisplay();
    }
    if(Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) {
      gameSounds.currentLaserSound = 3;
      this.updateSoundDisplay();
    }
    if(Phaser.Input.Keyboard.JustDown(this.keys.FIVE)) {
      gameSounds.currentLaserSound = 4;
      this.updateSoundDisplay();
    }
    if(Phaser.Input.Keyboard.JustDown(this.keys.SIX)) {
      gameSounds.currentLaserSound = 5;
      this.updateSoundDisplay();
    }
    
    // Add pulse shift to grid movement
    this.gridOffset += (dt / 1000) * (currentBPM / 60) + pulseShift * 1; // Reduced multiplier from 2 to 1 for gentler pulse
    if(this.gridVisible) {
      this._drawPerspectiveGrid();
    }
    
    // Apply horizontal shift to grid
    if(this.gridGraphics && pulseXShift !== 0){
      this.gridGraphics.x = pulseXShift;
    } else if(this.gridGraphics){
      this.gridGraphics.x = 0;
    }
    
    // Movement with rubber band effect and smooth transitions
    if(!this.playerCanControl) {
      // Block all movement when controls are disabled
    } else if(Phaser.Input.Keyboard.JustDown(this.keys.LEFT)||Phaser.Input.Keyboard.JustDown(this.keys.A)){ 
      const now = this.time.now;
      // Check for double-tap dash
      if(now - this.lastLeftPress < this.doubleTapWindow) {
        // Cancel the previous move and dash from original position (like touch controls)
        if (this.laneBeforeKeyboardMove !== undefined && this.isMoving) {
          // Kill ALL tweens to prevent move animations from continuing
          this.tweens.killTweensOf(this.player);
          
          // Reset to original lane AND position
          this.playerLane = this.laneBeforeKeyboardMove;
          this.player.x = this._laneX(this.playerLane);
          this.player.setScale(1, 1);
          this.isMoving = false;
        }
        this.dashLeft();
        this.lastLeftPress = 0; // Reset to prevent triple-tap
        this.laneBeforeKeyboardMove = undefined; // Clear the saved lane
      } else {
        this.laneBeforeKeyboardMove = this.playerLane; // Save current lane before move
        this.moveLeft();
        this.lastLeftPress = now;
      }
    }
    else if(Phaser.Input.Keyboard.JustDown(this.keys.RIGHT)||Phaser.Input.Keyboard.JustDown(this.keys.D)){ 
      const now = this.time.now;
      // Check for double-tap dash
      if(now - this.lastRightPress < this.doubleTapWindow) {
        // Cancel the previous move and dash from original position (like touch controls)
        if (this.laneBeforeKeyboardMove !== undefined && this.isMoving) {
          // Kill ALL tweens to prevent move animations from continuing
          this.tweens.killTweensOf(this.player);
          
          // Reset to original lane AND position
          this.playerLane = this.laneBeforeKeyboardMove;
          this.player.x = this._laneX(this.playerLane);
          this.player.setScale(1, 1);
          this.isMoving = false;
        }
        this.dashRight();
        this.lastRightPress = 0; // Reset to prevent triple-tap
        this.laneBeforeKeyboardMove = undefined; // Clear the saved lane
      } else {
        this.laneBeforeKeyboardMove = this.playerLane; // Save current lane before move
        this.moveRight();
        this.lastRightPress = now;
      }
    }
    
    // Rubber band effect - pull player back if off-screen too long
    if(this.playerLane < 0 || this.playerLane >= LANES){
      this.offScreenTimer -= dt;
      if(this.offScreenTurnDelay > 0) {
        this.offScreenTurnDelay -= dt;
      }
      
      // Apply distortion effects when off-screen
      // Screen shake intensity based on how long off-screen
      const shakeIntensity = Math.max(0, 1 - (this.offScreenTimer / 800)) * 4;
      this.cameras.main.shake(100, shakeIntensity * 0.01);
      
      // Continuous audio distortion pulse while off-screen
      if(!this.offScreenPulse) {
        this.offScreenPulse = 0; // Initialize as timer
      }
      this.offScreenPulse += dt;
      
      // Pulse every 200ms with increasing intensity
      if(this.offScreenPulse > 200) {
        this.offScreenPulse = 0;
        try {
          // Low frequency pulse that gets more intense over time
          const intensity = Math.max(0, 1 - (this.offScreenTimer / 800));
          const freq = 50 + intensity * 30; // Lower frequency as timer runs out
          gameSounds.offScreenWomp.triggerAttackRelease(freq, "16n", Tone.now(), 0.2 + intensity * 0.3);
        } catch(e) {}
      }
      
      // Add chromatic aberration effect via camera tint
      if(this.playerLane < 0) {
        // Left side - cyan/red split
        this.cameras.main.setPostPipeline('ChromaticAberration');
      } else {
        // Right side - magenta/green split  
        this.cameras.main.setPostPipeline('ChromaticAberration');
      }
      
      // Visual warning - increase shake as timer runs out
      if(this.offScreenTimer < 300){
        this.cameras.main.shake(100, 0.02);
      }
      // Pull back when timer expires
      if(this.offScreenTimer <= 0){
        // Store the off-screen position for animation
        const fromX = this.player.x;
        
        if(this.playerLane < 0){
          this.playerLane = 0;
        } else if(this.playerLane >= LANES){
          this.playerLane = LANES - 1;
        }
        
        const targetX = this._laneX(this.playerLane);
        
        // Rubber band snap animation - overshoot then settle
        this.tweens.add({
          targets: this.player,
          x: targetX,
          duration: 300,
          ease: 'Back.easeOut', // Elastic overshoot effect
          onStart: () => {
            // Stretch effect during snap
            this.player.setScale(1.5, 0.7); // Stretch horizontally, squash vertically
          },
          onComplete: () => {
            // Bounce settle animation
            this.tweens.add({
              targets: this.player,
              scaleX: 1,
              scaleY: 1,
              duration: 200,
              ease: 'Bounce.easeOut'
            });
          }
        });
        
        // Spin the player during snap-back
        this.tweens.add({
          targets: this.player,
          angle: 360,
          duration: 300,
          ease: 'Power2'
        });
        
        // Restore power-up tint if active
        if(this.rapidFire) {
          this.player.setTint(0x00ff00);
        } else {
          this.player.clearTint();
        }
        this.player.setAlpha(1); // Restore full opacity
        this.offScreenPulse = false; // Reset audio pulse flag
        // Rubber band snap sound
        try {
          gameSounds.move.triggerAttackRelease("C3", "16n");
        } catch(e) {}
      }
    } else {
      // Clear any warning tint and effects when back in bounds
      if(!this.rapidFire) this.player.clearTint();
      this.offScreenPulse = false; // Reset audio pulse flag
      // Reset camera effects
      this.cameras.main.resetPostPipeline();
    }
    
    // Crouch/charge mechanic for super jump - hold DOWN to charge, release to jump
    // Allow charging even while jumping to queue next super jump
    if(this.playerCanControl && (this.keys.DOWN.isDown || this.keys.S.isDown)){
      if(!this.isCrouching) {
        this.isCrouching = true;
        this.crouchTimer = 0;
        this.chargeGlow.setVisible(true);
        
        // Start charge sound with rising pitch
        try {
          gameSounds.jumpCharge.triggerAttack("C2");
          // Create a rising pitch ramp
          gameSounds.jumpCharge.frequency.rampTo(440, this.maxChargeTime / 1000);
        } catch(e) {}
        
        // Squash animation when crouching (only if on ground)
        if (!this.isJumping) {
          this.tweens.add({
            targets: this.player,
            scaleX: 1.4,
            scaleY: 0.6,
            duration: 100,
            ease: 'Power2'
          });
        }
      }
      this.crouchTimer += dt;
      
      // Update charge glow
      const chargePercent = Math.min(this.crouchTimer / this.maxChargeTime, 1.0);
      this.chargeGlow.clear();
      this.chargeGlow.x = this.player.x;
      this.chargeGlow.y = this.player.y;
      
      // Draw growing glow circle - match touch control max size
      const pulse = Math.sin(this.time.now * (10 + chargePercent * 20) * 0.001) * 0.2 + 0.8;
      const glowRadius = 30 + chargePercent * 50 * pulse; // Same as touch: 30-80 range
      const glowAlpha = 0.3 + chargePercent * 0.5 * pulse; // Same as touch
      const glowColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        {r: 0, g: 255, b: 204}, // Start cyan
        {r: 255, g: 255, b: 0}, // End yellow
        1,
        chargePercent
      );
      const hexColor = Phaser.Display.Color.GetColor(glowColor.r, glowColor.g, glowColor.b);
      
      this.chargeGlow.fillStyle(hexColor, glowAlpha);
      this.chargeGlow.fillCircle(0, 0, glowRadius);
    } else if(this.isCrouching) {
      // Released DOWN - execute super jump immediately
      const chargePercent = Math.min(this.crouchTimer / this.maxChargeTime, 1.0);
      
      // Stop the charge sound
      try {
        gameSounds.jumpCharge.triggerRelease();
      } catch(e) {}
      
      // Execute super jump if on ground, or queue if airborne
      if (!this.isJumping) {
        this.superJump(chargePercent);
      } else {
        // Queue the super jump to execute on landing
        this.queuedSuperJumpCharge = chargePercent;
      }
      this.isCrouching = false;
      this.crouchTimer = 0;
      this.chargeGlow.setVisible(false);
    }
    
    // Regular jump mechanic - UP or W key (only if not crouching)
    if(this.playerCanControl && (Phaser.Input.Keyboard.JustDown(this.keys.UP) || Phaser.Input.Keyboard.JustDown(this.keys.W)) && !this.isCrouching){
      this.jump();
    }
    
    // Firing - keyboard space or touch hold
    if(this.keys.SPACE.isDown || this.isTouchFiring) {
      // Track keyboard if space is pressed
      if(this.keys.SPACE.isDown && (window.controlType === 'unknown' || window.controlType === 'touch')) {
        window.controlType = 'keyboard';
        window.trackEvent('control_type_detected', {
          type: 'keyboard',
          platform: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });
      }
      this._fire();
    }

    // Update enemies with perspective
    const vanishY = gameState.HEIGHT * 0.15;
    for(let i=this.enemies.length-1; i>=0; i--){
      const e=this.enemies[i]; 
      
      // Move along perspective curve - add pulse shift
      e.progress += (e.vy * dt/1000) / (gameState.HEIGHT * 0.8) + pulseShift;
      
      // Handle drifting enemies
      if(e.isDrifter){
        e.driftTimer += dt;
        if(e.driftTimer > 1000){ // Change lane every second
          e.driftTimer = 0;
          e.targetLane = Phaser.Math.Between(0, LANES-1);
        }
        // Smoothly interpolate to target lane
        const laneDiff = e.targetLane - e.lane;
        if(Math.abs(laneDiff) > 0.1){
          e.lane += laneDiff * 0.05;
        }
      }
      
      // Calculate position on exponential curve (same as grid)
      const y = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(e.progress, 2.5);
      e.y = y;
      
      // Update X position along perspective lane + pulse shift
      e.x = this._laneX(e.lane, e.progress) + pulseXShift;
      
      // Check if enemy should be in front or behind obstacles based on progress
      // Find the closest obstacle ahead in the same lane
      let closestObstacleAhead = null;
      let minDistance = Infinity;
      
      for(let obstacle of this.obstacles) {
        if(Math.floor(obstacle.lane) === Math.floor(e.lane)) {
          // Only consider obstacles that are ahead or at same position
          if(obstacle.progress >= e.progress) {
            const distance = obstacle.progress - e.progress;
            if(distance < minDistance) {
              minDistance = distance;
              closestObstacleAhead = obstacle;
            }
          }
        }
      }
      
      // If there's an obstacle ahead in our lane, be behind it
      // Otherwise be in front (we've passed all obstacles in our lane)
      e.setDepth(closestObstacleAhead ? 80 : 180); // 80 = behind obstacles, 180 = in front
      
      // Add position to trail history
      if(!e.trailPoints) e.trailPoints = [];
      e.trailPoints.push({x: e.x, y: e.y, alpha: 1.0});
      if(e.trailPoints.length > 8) e.trailPoints.shift(); // Keep trail short
      
      // Scale based on distance
      let scale = 0.1 + e.progress * 1.2; // Start tiny, grow to normal size
      
      // Apply pulse effect for all enemy types
      if(e.pulseTime) {
        const timeSincePulse = this.time.now - e.pulseTime;
        if(timeSincePulse < 300) { // Pulse lasts 300ms
          const pulseProgress = 1 - (timeSincePulse / 300);
          const pulseMagnitude = Math.sin(pulseProgress * Math.PI) * 0.5;
          scale *= (1 + pulseMagnitude);
          
          // Different tint colors based on enemy type
          if(e.isDrifter) {
            // Purple enemies - flash with purple-white
            const tintValue = Math.floor(255 * (1 - pulseProgress * 0.5));
            e.setTint(Phaser.Display.Color.GetColor(255, tintValue, 255));
          } else if(e.enemyType === 'fastEnemyTex') {
            // Yellow enemies - flash with yellow-white
            const tintValue = Math.floor(255 * (1 - pulseProgress * 0.3));
            e.setTint(Phaser.Display.Color.GetColor(255, 255, tintValue));
          } else if(e.enemyType === 'enemyTex') {
            // Red enemies - flash with red-white
            const tintValue = Math.floor(255 * (1 - pulseProgress * 0.5));
            e.setTint(Phaser.Display.Color.GetColor(255, tintValue, tintValue));
          }
        } else {
          e.setTint(0xffffff); // Reset tint
        }
      }
      
      e.setScale(scale);
      
      // Update collision box
      if(e.isDrifter) {
        // Drifters have tighter collision boxes (70% of visual size)
        e.w = e.baseSize * scale * 0.7;
        e.h = e.baseSize * scale * 0.7;
      } else {
        e.w = e.baseSize * scale;
        e.h = e.baseSize * scale;
      }
      
      // Remove or check collision (can't hit while jumping or stretching)
      // 3D collision: enemies only collide when near player (0.94-0.97), can step behind them after
      if(e.progress > 1.1){ e.destroy(); this.enemies.splice(i,1); }
      else if(e.progress > 0.94 && e.progress < 0.97 && !this.isJumping && !this.isStretching && !this.isInvincible && this._aabb(e, this.player)){ 
        // Set invincible immediately to prevent multiple deaths
        this.isInvincible = true;
        
        // Save highscore before restarting
        if(this.score > sessionHighScore) {
          setSessionHighScore(this.score);
        }
        
        // Create dramatic explosion for enemy hit with proper scale
        const enemyScale = 0.1 + e.progress * 1.2; // Same formula as enemy scaling
        this._createDeathExplosion(this.player.x, this.player.y, e.x, e.y, enemyScale);
        
        try {
          // Player death sound - descending pitch
          const now = Tone.now();
          gameSounds.obstacleHit.triggerAttackRelease("G2", "16n", now);
          gameSounds.obstacleHit.triggerAttackRelease("D2", "16n", now + 0.05);
          gameSounds.obstacleHit.triggerAttackRelease("G1", "16n", now + 0.1);
          gameSounds.explosion.triggerAttackRelease("8n", now + 0.02);
        } catch(e) {}
        
        // Hide player and enemy immediately
        this.player.setVisible(false);
        e.destroy();
        
        // Show game over screen
        this.showGameOverScreen();
      }
    }
    
    // Update floating stars
    for(let i=this.floatingStars.length-1; i>=0; i--){
      const star = this.floatingStars[i];
      
      // Check if the attached obstacle still exists and is active
      const obstacle = star.attachedObstacle;
      const obstacleExists = obstacle && obstacle.active && this.obstacles.includes(obstacle);
      
      if(obstacleExists) {
        // Follow the obstacle position
        const scale = 0.1 + obstacle.progress * 1.2;
        
        // Floating motion (up and down)
        star.floatOffset += star.floatSpeed * dt;
        const floatY = Math.sin(star.floatOffset) * 10;
        
        // Position above obstacle with floating offset (scaled with perspective)
        star.x = obstacle.x;
        star.y = obstacle.y - (60 * scale) + floatY; // Scale the offset with perspective
        star.setScale(scale); // Just use obstacle's scale for perspective
        
        // Spin the star
        star.rotation += star.rotationSpeed;
        
        // Check collection - player must be jumping and in the same lane
        // Uses same collision timing as obstacles (0.94-0.97) so you collect the star
        // at the exact moment you'd hit the obstacle if you weren't jumping
        if(!star.collected && this.isJumping && obstacle.lane === this.playerLane) {
          // Same collision window as obstacles
          if(obstacle.progress > 0.94 && obstacle.progress < 0.97) {
            // Collect the star!
            star.collected = true;
            this.score += 50;
            this.combo = Math.min(this.combo + 1, 8);
            this.lastKillTime = this.time.now;
            this.scoreText.setText(this.score.toString());
            
            // Track for tutorial
            if (this.isTutorial) {
              this.tutorialProgress.starsCollected++;
            }
            
            // Show combo text
            if(this.combo > 1) {
              this.comboText.setText(`${this.combo}x COMBO! +50`);
              this.comboText.setAlpha(1);
            }
            
            // Instantly hide the star
            star.visible = false;
            
            // Classic coin collection sound - ascending arpeggio
            try {
              const coinSound = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
              }).connect(reverb);
              
              // Classic coin pickup sound - quick ascending notes
              const now = Tone.now();
              coinSound.triggerAttackRelease("B5", "32n", now);
              coinSound.triggerAttackRelease("E6", "32n", now + 0.03);
              
              setTimeout(() => coinSound.dispose(), 300);
            } catch(e) {
            }
            
            // Create star explosion particles
            for(let j = 0; j < 8; j++) {
              const angle = (Math.PI * 2 * j) / 8;
              const speed = 200 + Math.random() * 100;
              
              const particle = this.add.image(star.x, star.y, 'starTex');
              particle.setScale(0.3);
              particle.setDepth(999);
              
              const destX = star.x + Math.cos(angle) * speed;
              const destY = star.y + Math.sin(angle) * speed;
              
              this.tweens.add({
                targets: particle,
                x: destX,
                y: destY,
                scale: 0,
                alpha: 0,
                rotation: Math.random() * Math.PI * 4,
                duration: 600,
                ease: 'Power2',
                onComplete: () => particle.destroy()
              });
            }
            
            // Immediately destroy the star and remove from array
            star.destroy();
            this.floatingStars.splice(i, 1);
          }
        }
        
        // Remove star if obstacle is gone off-screen
        if(obstacle.progress > 1.1) {
          star.destroy();
          this.floatingStars.splice(i, 1);
        }
      } else {
        // Obstacle was destroyed or doesn't exist, remove orphaned star
        star.destroy();
        this.floatingStars.splice(i, 1);
      }
    }
    
    // Update obstacles
    for(let i=this.obstacles.length-1; i>=0; i--){
      const o=this.obstacles[i];
      o.progress += (o.vy * dt/1000) / (gameState.HEIGHT * 0.8) + pulseShift;
      const y = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(o.progress, 2.5);
      o.y = y;
      o.x = this._laneX(o.lane, o.progress) + pulseXShift;
      const scale = 0.1 + o.progress * 1.2;
      o.setScale(scale, scale * 1.2); // Much taller shields
      o.w = o.baseSize * scale;
      o.h = 22 * scale * 1.2; // Adjusted height for collision
      
      // Animate the whole obstacle with shimmer effect on the barrier part
      if (!o.shimmerTime) o.shimmerTime = 0;
      o.shimmerTime += dt * 0.004; // Slow shimmer
      let shimmerAlpha = 0.85 + Math.sin(o.shimmerTime + o.progress * 3) * 0.15;
      
      // Add electric pulse effect on hi-hat beats
      if(o.pulseTime) {
        const timeSincePulse = this.time.now - o.pulseTime;
        if(timeSincePulse < 200) { // Shorter, sharper pulse for electric effect
          const pulseProgress = 1 - (timeSincePulse / 200);
          const pulseMagnitude = Math.sin(pulseProgress * Math.PI);
          
          // Scale pulse - make shield "surge" with electricity
          const pulseScale = 1 + pulseMagnitude * 0.3;
          o.setScale(scale * pulseScale, scale * 1.2 * pulseScale);
          
          // Bright electric flash - purple to white
          const flashIntensity = pulseMagnitude;
          const tintR = 191 + (64 * flashIntensity); // 191 -> 255
          const tintG = 64 + (191 * flashIntensity);  // 64 -> 255  
          const tintB = 255; // Keep full blue
          o.setTint(Phaser.Display.Color.GetColor(tintR, tintG, tintB));
          
          // Boost alpha for electric surge
          shimmerAlpha = Math.min(1, shimmerAlpha + pulseMagnitude * 0.3);
        } else {
          o.clearTint(); // Reset tint after pulse
        }
      }
      
      o.setAlpha(shimmerAlpha);
      
      // Check collision with player (can jump over obstacles!)
      // 3D collision: obstacles only collide when near player (0.94-0.97), can step behind them after
      if(o.progress > 0.94 && o.progress < 0.97 && o.lane === this.playerLane) {
        if (this.isJumping || this.isStretching) {
          // Successfully jumped over obstacle - track for tutorial
          if (this.isTutorial && !o.tutorialCounted) {
            o.tutorialCounted = true; // Only count once per obstacle
            this.tutorialProgress.jumpsMade++;
          }
        } else if (!this.isInvincible) {
          // Hit obstacle - game over
          // Set invincible immediately to prevent multiple deaths
          this.isInvincible = true;
          
          // Save highscore before restarting
          if(this.score > sessionHighScore) {
            setSessionHighScore(this.score);
          }
          
          // Create splat effect for hitting wall
          this._createSplatEffect(this.player.x, this.player.y);
          
          try {
            // Low impact thud with pitch bend down
            gameSounds.obstacleHit.triggerAttackRelease("C2", "8n");
            gameSounds.explosion.triggerAttackRelease("8n");
          } catch(e) {}
          
          // Show game over screen
          this.showGameOverScreen();
          
          // Clean up any stars attached to this obstacle
          for(let j = this.floatingStars.length - 1; j >= 0; j--) {
            if(this.floatingStars[j].attachedObstacle === o) {
              this.floatingStars[j].destroy();
              this.floatingStars.splice(j, 1);
            }
          }
        }
      }
      else if(o.progress > 1.1){ 
        // Remove any attached stars before destroying obstacle
        for(let j = this.floatingStars.length - 1; j >= 0; j--) {
          if(this.floatingStars[j].attachedObstacle === o) {
            this.floatingStars[j].destroy();
            this.floatingStars.splice(j, 1);
          }
        }
        o.destroy(); 
        this.obstacles.splice(i,1); 
      }
    }
    
    // Update power-ups
    for(let i=this.powerUps.length-1; i>=0; i--){
      const p=this.powerUps[i];
      p.progress += (p.vy * dt/1000) / (gameState.HEIGHT * 0.8) + pulseShift;
      const y = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(p.progress, 2.5);
      p.y = y;
      p.x = this._laneX(p.lane, p.progress) + pulseXShift;
      const scale = 0.1 + p.progress * 1.2;
      p.setScale(scale);
      p.angle += dt * 0.2; // Rotate
      
      // Check collection - slightly more forgiving than enemy collision
      if(p.progress > 0.93 && p.progress < 0.98 && p.lane === this.playerLane){
        p.destroy();
        this.powerUps.splice(i,1);
        this.score += 10; // Award 10 points for power-up collection
        this.scoreText.setText(this.score.toString()); // Update score display
        
        // Track for tutorial
        if (this.isTutorial) {
          this.tutorialProgress.powerUpsCollected = (this.tutorialProgress.powerUpsCollected || 0) + 1;
        }
        
        this.rapidFire = true;
        this.rapidFireTimer = 5000; // 5 seconds
        this.player.setTint(0x00ff00); // Green tint
        
        // Add jello wobble reaction for power-up
        this.wobbleVelocity.x = (Math.random() - 0.5) * 20;
        this.wobbleVelocity.y = -15;
        
        // Excited jello bounce animation
        this.tweens.add({
          targets: this.player,
          scaleX: 1.4,
          scaleY: 0.7,
          duration: 100,
          ease: 'Power2',
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            this.tweens.add({
              targets: this.player,
              scaleX: 1,
              scaleY: 1,
              duration: 200,
              ease: 'Elastic.easeOut',
              easeParams: [0.5, 0.3]
            });
          }
        })
        // Play quick arpeggio for power-up
        try {
          const now = Tone.now();
          gameSounds.powerUp.triggerAttackRelease("C5", "32n", now + 0.01);
          gameSounds.powerUp.triggerAttackRelease("E5", "32n", now + 0.05);
          gameSounds.powerUp.triggerAttackRelease("G5", "32n", now + 0.09);
        } catch(e) {}
      } else if(p.progress > 1.1){
        p.destroy();
        this.powerUps.splice(i,1);
      }
    }
    
    // Update rapid fire timer
    if(this.rapidFire){
      this.rapidFireTimer -= dt;
      if(this.rapidFireTimer <= 0){
        this.rapidFire = false;
        this.player.clearTint();
      }
    }

    // Update bullets with perspective
    for(let i=this.bullets.length-1; i>=0; i--){
      const b=this.bullets[i]; 
      
      if(b.isHorizontal) {
        // Horizontal bullet movement across lanes
        b.currentLane += (b.vx * dt/1000) / 150; // Convert speed to lane units
        b.lane = Math.floor(b.currentLane + 0.5); // Round to nearest lane for collision
        
        // Update position using current lane and constant progress
        b.x = this._laneX(b.currentLane, b.progress);
        b.y = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(b.progress, 2.5);
        
        // Remove if bullet has crossed all lanes
        if((b.vx > 0 && b.currentLane > 5) || (b.vx < 0 && b.currentLane < -1)) {
          b.destroy(); 
          this.bullets.splice(i,1); 
          continue;
        }
      } else {
        // Normal vertical bullet movement
        // Move backward along perspective curve
        b.progress -= (Math.abs(b.vy) * dt/1000) / (gameState.HEIGHT * 0.8);
        
        // Calculate base position on exponential curve
        let y = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(b.progress, 2.5);
        
        // Apply arc trajectory if this is a jump shot
        if(b.isArcShot) {
          // Update arc distance based on bullet speed
          b.arcDistance += (Math.abs(b.vy) * dt/1000) / (gameState.HEIGHT * 0.8);
          const distanceTraveled = b.arcDistance;
          const normalY = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(b.progress, 2.5);
          const normalStartY = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(1.0, 2.5); // Where normal bullets start
          const perspectiveOffset = normalStartY - gameState.PLAYER_Y; // How much the curve differs from player position
          const jumpHeight = gameState.PLAYER_Y - b.startY; // Positive when jumping
          
          // Log first frame of arc shot
          if (!b.arcLogged) {
            b.arcLogged = true;
          }
          
          if (distanceTraveled < b.safeDistance) {
            // Draw straight line from A to B
            const arcProgress = distanceTraveled / b.safeDistance;
            
            // Point A: player position when fired
            const pointA = b.startY;
            
            // Point B: After traveling safeDistance from progress 1.0
            // The bullet will be at progress (1.0 - safeDistance)
            // But we need to calculate where that is in screen Y
            const progressAtB = 1.0 - b.safeDistance;
            // This is the Y position for that progress value on the perspective curve
            const pointB = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(progressAtB, 2.5);
            
            // Linear interpolation from A to B
            y = pointA + (pointB - pointA) * arcProgress;
            
            // Check at boundary
            if (arcProgress > 0.99 && !b.boundaryChecked) {
              const arcEndY = pointA + (pointB - pointA) * 1.0; // Where arc ends (should be pointB)
              const nextFrameProgress = b.progress - (Math.abs(b.vy) * dt/1000) / (gameState.HEIGHT * 0.8);
              const nextFrameY = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(nextFrameProgress, 2.5) - perspectiveOffset;
              b.boundaryChecked = true;
            }
            
            // Log near transition
            if (arcProgress > 0.98 && !b.almostTransition) {
              const arcEndY = pointA + (pointB - pointA) * 1.0; // Where arc ends (should equal pointB)
              const normalStartProgress = 1.0 - b.safeDistance;
              const normalStartY = vanishY + (gameState.HEIGHT - vanishY) * Math.pow(normalStartProgress, 2.5) - perspectiveOffset;
              b.almostTransition = true;
            }
          } else {
            // After safeDistance: Arc shots don't need perspective offset
            y = normalY;
            b.isArcShot = false;
          }
        }
        
        b.y = y;
        
        // Update X position along perspective lane
        b.x = this._laneX(b.lane, b.progress);
        
        if(b.progress < 0){ b.destroy(); this.bullets.splice(i,1); continue; }
      }
      
      // Add bullet trail
      if(!b.trailPoints) b.trailPoints = [];
      b.trailPoints.push({x: b.x, y: b.y, alpha: 1.0});
      if(b.trailPoints.length > 6) b.trailPoints.shift();
      
      // Calculate rotation to align with trajectory
      if(!b.isHorizontal) {
        const deltaX = b.x - b.lastX;
        const deltaY = b.y - b.lastY;
        
        // Only update rotation if bullet has moved
        if(Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          // Calculate angle from movement direction
          let angle = Math.atan2(deltaY, deltaX) + Math.PI/2; // Add 90 degrees since bullet sprite points up
          
          // For arc shots, add some visual flair
          if(b.isArcShot) {
            // Slight wobble on arc shots
            angle += Math.sin(b.progress * Math.PI * 4) * 0.1;
          }
          
          b.setRotation(angle);
          b.lastX = b.x;
          b.lastY = b.y;
        }
        
        // Add spinning effect for high combo bullets
        if(b.rotationSpeed) {
          b.rotation += b.rotationSpeed;
        }
      }
      
      // Scale based on distance
      const scale = 0.1 + b.progress * 1.2;
      b.setScale(scale);
      
      // Check collision with obstacles first
      let hitObstacle = false;
      for(let j=this.obstacles.length-1; j>=0; j--){
        const o = this.obstacles[j];
        if(o.lane === b.lane && Math.abs(o.progress - b.progress) < 0.05){
          // Arc shots pass over obstacles during safe distance
          if(b.isArcShot) {
            const distanceTraveled = 1.0 - b.progress;
            if(distanceTraveled < b.safeDistance) {
              continue; // Bullet is in safe flight, skip collision
            }
          }
          
          // Bullet hits obstacle - small spark effect (obstacles don't scale)
          this._createExplosion(b.x, b.y, 0xffff00, 4, 0.5);
          b.destroy(); 
          this.bullets.splice(i,1);
          hitObstacle = true;
          
          // Obstacle block sound - metallic ping
          try {
            gameSounds.move.triggerAttackRelease("C7", "64n");
          } catch(e) {}
          break; // Obstacle blocks the shot
        }
      }
      
      // Check collision with enemies if not blocked
      if(!hitObstacle){
        for(let j=this.enemies.length-1; j>=0; j--){
          const e = this.enemies[j];
          // Check if in same lane and close in progress
          // Drifters require more precise timing due to lane-changing movement
          const progressThreshold = e.isDrifter ? 0.03 : 0.05; // Tighter window for drifters
          const laneThreshold = e.isDrifter ? 0.3 : 0.5; // More precise lane alignment needed
          if(Math.abs(e.lane - b.lane) < laneThreshold && Math.abs(e.progress - b.progress) < progressThreshold){
            // Calculate enemy scale for explosion
            const enemyScale = 0.1 + e.progress * 1.2; // Same formula as enemy scaling
            
            // Create explosion at enemy position with proper scale
            const explosionColor = e.isDrifter ? 0x9966ff : (e.enemyType === 'fastEnemyTex' ? 0xffff00 : 0xff3366);
            this._createExplosion(e.x, e.y, explosionColor, e.isDrifter ? 12 : 8, enemyScale);
            
            b.destroy(); this.bullets.splice(i,1);
            e.destroy(); this.enemies.splice(j,1);
            
            // Track for tutorial
            if (this.isTutorial) {
              this.tutorialProgress.shotsHit++;
              // Track arc shots specifically
              if (b.isArcShot) {
                this.tutorialProgress.arcShotsHit = (this.tutorialProgress.arcShotsHit || 0) + 1;
              }
              this.updateTutorialProgress();
            }
            
            // Differentiated scoring based on enemy type
            let basePoints = 10; // Default for red enemies
            if(e.isDrifter) {
              basePoints = 50; // Purple drifters worth most
            } else if(e.enemyType === 'fastEnemyTex') {
              basePoints = 25; // Yellow fast enemies worth more
            }
            
            // Check for combo
            const currentTime = this.time.now;
            if(currentTime - this.lastKillTime < this.comboWindow) {
              // Within combo window - increase multiplier
              this.combo = Math.min(this.combo + 1, this.maxCombo);
            } else {
              // Combo expired - reset to 1
              this.combo = 1;
            }
            this.lastKillTime = currentTime;
            
            // Apply combo multiplier
            const points = basePoints * this.combo;
            this.score += points;
            this.scoreText.setText(this.score.toString());
            
            // Show combo text with animation
            if(this.combo > 1) {
              this.comboText.setText(`${this.combo}x COMBO! +${points}`);
              this.comboText.setAlpha(1);
              // Pulse effect based on combo level
              const comboColor = this.combo >= 6 ? '#ff00ff' : this.combo >= 4 ? '#ffff00' : '#00ffff';
              this.comboText.setColor(comboColor);
              this.comboText.setScale(1 + (this.combo * 0.05));
              
              // Fade out combo text
              this.tweens.add({
                targets: this.comboText,
                alpha: 0,
                scale: 1,
                duration: 1000,
                ease: 'Power2'
              });
              
              // Screen flash for high combos
              if(this.combo >= 4) {
                const flash = this.add.graphics();
                flash.fillStyle(this.combo >= 6 ? 0xff00ff : 0xffff00, 0.3);
                flash.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
                this.tweens.add({
                  targets: flash,
                  alpha: 0,
                  duration: 200,
                  onComplete: () => flash.destroy()
                });
              }
              
              // Bonus sound effects for combo milestones
              if(this.combo === 4 || this.combo === 6 || this.combo === 8) {
                try {
                  const now = Tone.now();
                  // Ascending arpeggio for combo milestone
                  gameSounds.powerUp.triggerAttackRelease("C4", "32n", now);
                  gameSounds.powerUp.triggerAttackRelease("E4", "32n", now + 0.05);
                  gameSounds.powerUp.triggerAttackRelease("G4", "32n", now + 0.1);
                  gameSounds.powerUp.triggerAttackRelease("C5", "32n", now + 0.15);
                } catch(e) {}
              }
            }
            // Update highscore if beaten
            if(this.score > sessionHighScore) {
              setSessionHighScore(this.score);
              saveGameData({ highScore: sessionHighScore });
              this.highScoreText.setText(sessionHighScore.toString());
              this.highScoreText.setColor('#0ff'); // Cyan when beating high score
            }
            
            // Play destruction sound based on enemy type with pitch variation
            try {
              const now = Tone.now();
              if(e.isDrifter){
                // Drifter destruction - descending stab chord
                gameSounds.powerUp.triggerAttackRelease("G4", "32n", now);
                gameSounds.powerUp.triggerAttackRelease("D4", "32n", now + 0.02);
                gameSounds.powerUp.triggerAttackRelease("A3", "32n", now + 0.04);
              } else if(e.enemyType === 'fastEnemyTex'){
                // Fast enemy - high pitched noise burst
                gameSounds.explosion.triggerAttackRelease("32n", now);
                gameSounds.enemyDestroy.triggerAttackRelease("G5", "32n", now + 0.01);
              } else {
                // Regular enemy - distorted kick-like sound with random note from scale
                const noteIndex = Math.floor(Math.random() * 7);
                // Add tiny random offset to each sound to prevent exact timing conflicts
                const offset = Math.random() * 0.005;
                gameSounds.enemyDestroy.triggerAttackRelease(getGameNote(noteIndex) + "3", "16n", now + offset);
                gameSounds.explosion.triggerAttackRelease("32n", now + 0.015 + offset);
              }
            } catch(err) {
              // Timing conflict - sounds will be skipped this frame
            }
            break;
          }
        }
      }
    }

  }
  
  resize(gameSize, baseSize, displaySize, resolution) {
    // Update global dimensions using the actual camera dimensions
    updateDimensions(this.cameras.main.width, this.cameras.main.height);
    
    // Update vanishing point for consistent perspective
    this.vanishX = gameState.WIDTH / 2;
    this.vanishY = gameState.HEIGHT * 0.15;
    
    // Update player position
    if (this.player) {
      this.player.x = this._laneX(this.playerLane);
      this.player.y = gameState.PLAYER_Y;
    }
    
    // Update UI text positions
    const scoreY = isMobile ? gameState.HEIGHT-36 : gameState.HEIGHT-24;
    const highScoreY = isMobile ? gameState.HEIGHT-72 : gameState.HEIGHT-48;
    const comboY = isMobile ? gameState.HEIGHT-108 : gameState.HEIGHT-72;
    
    // Update score label and value positions
    if (this.scoreLabel) {
      this.scoreLabel.y = scoreY;
    }
    if (this.scoreText) {
      this.scoreText.y = scoreY;
    }
    
    // Update high score label and value positions
    if (this.highScoreLabel) {
      this.highScoreLabel.y = highScoreY;
    }
    if (this.highScoreText) {
      this.highScoreText.y = highScoreY;
    }
    
    if (this.comboText) {
      this.comboText.y = comboY;
    }
    
    // Update combo meter position
    if (this.comboMeterBg) {
      const meterY = comboY + 30;
      this.comboMeterY = meterY;
      this.comboMeterBg.clear();
      this.comboMeterBg.fillStyle(0x333333, 0.5);
      this.comboMeterBg.fillRect(10, meterY, 200, 8);
    }
    
    // Recreate starfield with new dimensions
    if (this.stars) {
      this.createStarfield();
    }
    
    // Update grid if visible
    if (this.gridVisible && this.gridGraphics) {
      this._drawPerspectiveGrid();
    }
    
    // Update mobile controls positions if they exist
    if (this.mobileControls) {
      this.setupMobileControls();
    }
  }
  
  updateTrails(dt) {
    return updateTrailsSystem.call(this, dt);
  }
}
