import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { saveGameData } from '../../storage.js';
import { currentDifficulty, uiState, updateGridButton } from '../../audio/music-ui.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function runUpdateLoopCore(dt) {
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
  return { pulseShift, pulseXShift };
}
