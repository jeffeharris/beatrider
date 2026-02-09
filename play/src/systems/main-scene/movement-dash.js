import * as Tone from 'tone';
import { gameState, LANES, PLAYER_CONFIG } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function dashLeftSystem() {
  const { player, combat } = this.stateSlices;
  if(player.dashing) return;  // Only check isDashing, not isMoving
  // Block dashing if already off-screen
  if(player.lane < 0 || player.lane >= LANES) return;
  
  const startLane = player.lane;
  const targetLane = Math.max(-1, startLane - 2);  // Dash 2 lanes total
  // Can't dash if already at leftmost position  
  if(startLane <= -1) return;  // Allow dashing from lane 0
  
  player.dashing = true;
  player.moving = true;
  
  // Set a flag to prevent move animations from creating bounce tweens
  this.isDashStarting = true;
  
  // Store jump state before killing tweens
  const wasJumping = player.jumping;
  
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
        player.jumping = false;
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
  if (!player.jumping) {
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
  player.lane = targetLane;
  
  // Reset rubber band timer when dashing off-screen
  if(player.lane < 0 || player.lane >= LANES){
    // Give extra time when dashing from edge lanes (0 or 4) to off-screen
    const laneNow = player.lane;
    const isDashingFromEdge = (startLane === 0 && laneNow < 0) ||
                              (startLane === LANES - 1 && laneNow >= LANES);
    combat.offScreenTimer = isDashingFromEdge
      ? PLAYER_CONFIG.offScreen.gracePeriod + 400
      : PLAYER_CONFIG.offScreen.gracePeriod;
    this.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);
    
    // Set turn delay based on dash type and rapid fire status
    if(isDashingFromEdge) {
      // Outer lane dash: 1200ms total
      if(combat.rapidFire) {
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
      player.moving = false;
      player.dashing = false;
      // Clear the dash starting flag after dash completes
      this.isDashStarting = false;
      // Ensure visual position matches logical lane
      const expectedX = this._laneX(player.lane);
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
  const { player, combat } = this.stateSlices;
  if(player.dashing) return;  // Only check isDashing, not isMoving
  // Block dashing if already off-screen
  if(player.lane < 0 || player.lane >= LANES) return;
  
  const startLane = player.lane;
  const targetLane = Math.min(LANES, startLane + 2);  // Dash 2 lanes total
  // Can't dash if already at rightmost position
  if(startLane >= LANES) return;  // Allow dashing from lane 4 to off-screen
  
  player.dashing = true;
  player.moving = true;
  
  // Set a flag to prevent move animations from creating bounce tweens
  this.isDashStarting = true;
  
  // Store jump state before killing tweens
  const wasJumping = player.jumping;
  
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
        player.jumping = false;
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
  if (!player.jumping) {
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
  player.lane = targetLane;
  
  // Reset rubber band timer when dashing off-screen
  if(player.lane < 0 || player.lane >= LANES){
    // Give extra time when dashing from edge lanes (0 or 4) to off-screen
    const laneNow = player.lane;
    const isDashingFromEdge = (startLane === 0 && laneNow < 0) ||
                              (startLane === LANES - 1 && laneNow >= LANES);
    combat.offScreenTimer = isDashingFromEdge
      ? PLAYER_CONFIG.offScreen.gracePeriod + 400
      : PLAYER_CONFIG.offScreen.gracePeriod;
    this.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);
    
    // Set turn delay based on dash type and rapid fire status
    if(isDashingFromEdge) {
      // Outer lane dash: 1200ms total
      if(combat.rapidFire) {
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
      player.moving = false;
      player.dashing = false;
      // Clear the dash starting flag after dash completes
      this.isDashStarting = false;
      // Ensure visual position matches logical lane
      const expectedX = this._laneX(player.lane);
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
  const { player, flow } = this.stateSlices;
  // Check collision with obstacles during dash - using progress-based 3D collision
  for(let o of this.obstacles) {
    if(
      o.progress > 0.94 &&
      o.progress < 0.97 &&
      o.lane === player.lane &&
      !player.jumping &&
      !flow.invincible
    ) {
      // Set invincible immediately to prevent multiple deaths
      flow.invincible = true;
      
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
