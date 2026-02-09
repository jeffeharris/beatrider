import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, isMobile, LANES } from '../../config.js';
import { saveGameData, sessionHighScore, setSessionHighScore } from '../../storage.js';
import { currentDifficulty, uiState, updateGridButton } from '../../audio/music-ui.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';

export function updateMainLoopSystem(_, dt){
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
