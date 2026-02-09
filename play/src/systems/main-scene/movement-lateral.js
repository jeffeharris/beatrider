import { LANES, PLAYER_CONFIG } from '../../config.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';

export function moveLeftSystem() {
  const player = this.stateSlices?.player;
  const combat = this.stateSlices?.combat;
  if(player?.moving ?? this.isMoving) return;
  // Block movement if already off-screen
  if((player?.lane ?? this.playerLane) < 0 || (player?.lane ?? this.playerLane) >= LANES) return;
  const previousLane = player?.lane ?? this.playerLane;
  if (player) player.lane = Math.max(-1, player.lane - 1);
  else this.playerLane = Math.max(-1, this.playerLane - 1); // Can go to -1 (off-screen left)
  const targetX = this._laneX(player?.lane ?? this.playerLane);
  
  // Play womp sound when entering off-screen
  if((player?.lane ?? this.playerLane) === -1 && previousLane === 0) {
    try {
      gameSounds.offScreenWomp.triggerAttackRelease("C2", "4n");
    } catch(e) {}
  }
  
  // Check if we're jumping for special animation
  if(player?.jumping ?? this.isJumping) {
    // Mid-air twirl animation
    if (player) player.moving = true;
    else this.isMoving = true;
    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: PLAYER_CONFIG.movement.air.duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (player) player.moving = false;
        else this.isMoving = false;
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
    if (player) {
      player.moving = true;
      player.stretching = true;
    } else {
      this.isMoving = true;
      this.isStretching = true; // Only immune during stretch phase
    }
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
        if (player) player.stretching = false;
        else this.isStretching = false; // Stretch phase complete, no longer immune
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
            if (this.isDashStarting || (player?.dashing ?? this.isDashing)) {
              if (player) player.moving = false;
              else this.isMoving = false;
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
                if (player) player.moving = false;
                else this.isMoving = false; // Can shoot after bounce completes
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
  if((player?.lane ?? this.playerLane) < 0 || (player?.lane ?? this.playerLane) >= LANES){
    if (combat) combat.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
    else this.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
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
    const note = getGameNote(Math.max(0, Math.min(4, player?.lane ?? this.playerLane))) + "5";
    gameSounds.move.triggerAttackRelease(note, "32n");
  } catch(e) {}
}

export function moveRightSystem() {
  const player = this.stateSlices?.player;
  const combat = this.stateSlices?.combat;
  if(player?.moving ?? this.isMoving) return;
  // Block movement if already off-screen
  if((player?.lane ?? this.playerLane) < 0 || (player?.lane ?? this.playerLane) >= LANES) return;
  const previousLane = player?.lane ?? this.playerLane;
  if (player) player.lane = Math.min(LANES, player.lane + 1);
  else this.playerLane = Math.min(LANES, this.playerLane + 1); // Can go to 5 (off-screen right)
  const targetX = this._laneX(player?.lane ?? this.playerLane);
  
  // Play womp sound when entering off-screen
  if((player?.lane ?? this.playerLane) === LANES && previousLane === LANES - 1) {
    try {
      gameSounds.offScreenWomp.triggerAttackRelease("C2", "4n");
    } catch(e) {}
  }
  
  // Check if we're jumping for special animation
  if(player?.jumping ?? this.isJumping) {
    // Mid-air twirl animation
    if (player) player.moving = true;
    else this.isMoving = true;
    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: PLAYER_CONFIG.movement.air.duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (player) player.moving = false;
        else this.isMoving = false;
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
    if (player) {
      player.moving = true;
      player.stretching = true;
    } else {
      this.isMoving = true;
      this.isStretching = true; // Only immune during stretch phase
    }
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
        if (player) player.stretching = false;
        else this.isStretching = false; // Stretch phase complete, no longer immune
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
            if (this.isDashStarting || (player?.dashing ?? this.isDashing)) {
              if (player) player.moving = false;
              else this.isMoving = false;
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
                if (player) player.moving = false;
                else this.isMoving = false; // Can shoot after bounce completes
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
  if((player?.lane ?? this.playerLane) < 0 || (player?.lane ?? this.playerLane) >= LANES){
    if (combat) combat.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
    else this.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
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
    const note = getGameNote(Math.max(0, Math.min(4, player?.lane ?? this.playerLane))) + "5";
    gameSounds.move.triggerAttackRelease(note, "32n");
  } catch(e) {}
}
