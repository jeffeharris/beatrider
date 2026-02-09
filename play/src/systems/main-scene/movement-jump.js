import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, MAIN_SCENE_TUNING } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function jumpSystem() {
  const { player, input } = this.stateSlices;
  if(player.jumping) return;
  player.jumping = true;
  
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
      
      // Check if we should start charging based on queued crouch
      if (this.queuedCrouchOnLanding && input.currentZone === 'crouch') {
        player.charging = true;
        this.chargeGlow.setVisible(true);
        this.queuedCrouchOnLanding = false;
        
        // Start time-based charging like keyboard
        this.touchChargeStartTime = this.time.now;
        this.usingTimeBasedCharge = true;
        input.jumpChargeAmount = 0;
        this.maxPullDistance = 0;
        // Start charge sound
        try {
          gameSounds.jumpCharge.triggerAttack("C2");
        } catch(e) {}
        
        // Reset touch reference point
        const activePointer = this.input.activePointer;
        if (activePointer && activePointer.isDown) {
          const edgePadding = this.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
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

export function superJumpSystem(chargePercent = 1.0) {
  const { player, input } = this.stateSlices;
  if(player.jumping) return;
  player.jumping = true;
  
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
                  player.jumping = false;
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
                  if (this.queuedCrouchOnLanding && input.currentZone === 'crouch') {
                    player.charging = true;
                    this.chargeGlow.setVisible(true);
                    this.queuedCrouchOnLanding = false;
                    
                    // Start time-based charging like keyboard
                    this.touchChargeStartTime = this.time.now;
                    this.usingTimeBasedCharge = true;
                    input.jumpChargeAmount = 0;
                    this.maxPullDistance = 0;
                    // Start charge sound
                    try {
                      gameSounds.jumpCharge.triggerAttack("C2");
                    } catch(e) {}
                    
                    // Reset touch reference point
                    const activePointer = this.input.activePointer;
                    if (activePointer && activePointer.isDown) {
                      const edgePadding = this.zoneRadius * MAIN_SCENE_TUNING.touch.edgePaddingRatio;
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
