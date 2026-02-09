import { LANES, PLAYER_CONFIG } from '../../config.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';

export function moveLeftSystem() {
  const { player, combat } = this.stateSlices;
  if(player.moving) return;
  // Block movement if already off-screen
  if(player.lane < 0 || player.lane >= LANES) return;
  const previousLane = player.lane;
  player.lane = Math.max(-1, player.lane - 1); // Can go to -1 (off-screen left)
  const targetX = this._laneX(player.lane);
  
  // Play womp sound when entering off-screen
  if(player.lane === -1 && previousLane === 0) {
    try {
      gameSounds.offScreenWomp.triggerAttackRelease("C2", "4n");
    } catch(e) {}
  }
  
  // Check if we're jumping for special animation
  if(player.jumping) {
    // Mid-air twirl animation
    player.moving = true;
    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: PLAYER_CONFIG.movement.air.duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        player.moving = false;
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
    player.moving = true;
    player.stretching = true;
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
        player.stretching = false; // Stretch phase complete, no longer immune
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
            if (this.isDashStarting || player.dashing) {
              player.moving = false;
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
                player.moving = false; // Can shoot after bounce completes
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
  if(player.lane < 0 || player.lane >= LANES){
    combat.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
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
    const note = getGameNote(Math.max(0, Math.min(4, player.lane))) + "5";
    gameSounds.move.triggerAttackRelease(note, "32n");
  } catch(e) {}
}

export function moveRightSystem() {
  const { player, combat } = this.stateSlices;
  if(player.moving) return;
  // Block movement if already off-screen
  if(player.lane < 0 || player.lane >= LANES) return;
  const previousLane = player.lane;
  player.lane = Math.min(LANES, player.lane + 1); // Can go to 5 (off-screen right)
  const targetX = this._laneX(player.lane);
  
  // Play womp sound when entering off-screen
  if(player.lane === LANES && previousLane === LANES - 1) {
    try {
      gameSounds.offScreenWomp.triggerAttackRelease("C2", "4n");
    } catch(e) {}
  }
  
  // Check if we're jumping for special animation
  if(player.jumping) {
    // Mid-air twirl animation
    player.moving = true;
    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: PLAYER_CONFIG.movement.air.duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        player.moving = false;
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
    player.moving = true;
    player.stretching = true;
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
        player.stretching = false; // Stretch phase complete, no longer immune
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
            if (this.isDashStarting || player.dashing) {
              player.moving = false;
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
                player.moving = false; // Can shoot after bounce completes
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
  if(player.lane < 0 || player.lane >= LANES){
    combat.offScreenTimer = PLAYER_CONFIG.offScreen.gracePeriod;
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
    const note = getGameNote(Math.max(0, Math.min(4, player.lane))) + "5";
    gameSounds.move.triggerAttackRelease(note, "32n");
  } catch(e) {}
}
