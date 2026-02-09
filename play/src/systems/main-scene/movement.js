import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, LANES, PLAYER_CONFIG } from '../../config.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';

export function moveLeftSystem() {
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

export function moveRightSystem() {
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

export function jumpSystem() {
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

export function dashLeftSystem() {
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

export function dashRightSystem() {
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

export function checkDashCollisionSystem() {
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

export function superJumpSystem(chargePercent = 1.0) {
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
