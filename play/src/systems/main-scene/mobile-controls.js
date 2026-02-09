import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { savedData } from '../../storage.js';
import { gameSounds } from '../../audio/game-sounds.js';

export function updateZoneVisualsSystem() {
  if (!this.zoneVisuals) return;
  
  this.zoneVisuals.clear();
  
  // Draw dead zone circle (center)
  this.zoneVisuals.lineStyle(2, 0x00aaff, 0.4);
  this.zoneVisuals.fillStyle(0x00aaff, 0.1);
  this.zoneVisuals.fillCircle(this.touchStartX, this.touchStartY, this.zoneDeadRadius);
  this.zoneVisuals.strokeCircle(this.touchStartX, this.touchStartY, this.zoneDeadRadius);
  
  // Draw outer radius circle
  this.zoneVisuals.lineStyle(1, 0xffffff, 0.2);
  this.zoneVisuals.strokeCircle(this.touchStartX, this.touchStartY, this.zoneRadius);
  
  // Draw zone boundary lines based on actual angles
  const cx = this.touchStartX;
  const cy = this.touchStartY;
  const r = this.zoneRadius;
  
  // Convert angles to radians and draw boundary lines
  const angle60 = 60 * Math.PI / 180;
  const angle120 = 120 * Math.PI / 180;
  
  this.zoneVisuals.lineStyle(1, 0xffffff, 0.3);
  // Right zone boundaries (±60°)
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(-angle60), cy + r * Math.sin(-angle60));
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(angle60), cy + r * Math.sin(angle60));
  
  // Left zone boundaries (±120°)
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(-angle120), cy + r * Math.sin(-angle120));
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(angle120), cy + r * Math.sin(angle120));
  
  // Add colored arcs to show zones more clearly
  // Jump zone (top) - green
  this.zoneVisuals.lineStyle(3, 0x00ff00, 0.4);
  this.zoneVisuals.arc(cx, cy, r * 0.8, -angle120, -angle60, false);
  
  // Crouch zone (bottom) - blue
  this.zoneVisuals.lineStyle(3, 0x0088ff, 0.4);
  this.zoneVisuals.arc(cx, cy, r * 0.8, angle60, angle120, false);
  
  // Movement zones (left/right) - orange
  this.zoneVisuals.lineStyle(3, 0xff8800, 0.4);
  this.zoneVisuals.arc(cx, cy, r * 0.8, -angle60, angle60, false); // Right
  this.zoneVisuals.arc(cx, cy, r * 0.8, angle120, Math.PI, false); // Left part 1
  this.zoneVisuals.arc(cx, cy, r * 0.8, -Math.PI, -angle120, false); // Left part 2
}

export function setupMobileControlsSystem() {
  // Zone-based control state
  this.touchStartX = 0;
  this.touchStartY = 0;
  this.touchZoneActive = false;
  this.isTouchFiring = false;
  
  // Zone configuration - based on comfortable thumb reach
  this.zoneRadius = 100; // Radius from touch point to edge
  // Load saved touch sensitivity or use default
  this.zoneDeadRadius = savedData.settings?.touchSensitivity || 30;
  
  // We'll use angle-based detection for the 4 directional zones
  // No need to pre-define boundaries, we'll calculate on the fly
  
  // Movement state tracking
  this.currentZone = 'center';
  this.lastMoveTime = 0;
  this.moveCooldown = 150; // ms between lane changes
  this.laneBeforeMove = null; // Track lane position before any move starts
  this.zoneHoldTimer = 0; // Track how long we've been in a zone
  this.zoneRepeatDelay = 300; // ms before first repeat
  this.zoneRepeatRate = 150; // ms between repeats after first
  this.lastZoneCheckTime = 0;
  
  // Jump charge tracking
  this.jumpChargeAmount = 0;
  this.maxPullDistance = 0; // Track the furthest pull distance
  this.isChargingJump = false;
  this.jumpThreshold = 40; // pixels up for jump
  
  // Visual debug indicator (optional)
  this.touchIndicator = this.add.circle(0, 0, 15, 0x00ff00, 0.3);
  this.touchIndicator.setVisible(false);
  
  // Zone visualization (for debugging - remove in production)
  if (true) { // Set to false in production
    this.zoneVisuals = this.add.graphics();
    this.zoneVisuals.setDepth(1000);
  }
  
  // Touch start - anywhere on screen
  this.input.on('pointerdown', (pointer) => {
    // Edge constraint - keep control center within screen bounds with padding
    const edgePadding = this.zoneRadius * 0.7; // Allow 30% of zone to go off-screen
    this.touchStartX = Phaser.Math.Clamp(pointer.x, edgePadding, gameState.WIDTH - edgePadding);
    this.touchStartY = Phaser.Math.Clamp(pointer.y, edgePadding, gameState.HEIGHT - edgePadding);
    this.touchZoneActive = true;
    
    // Reset state
    this.currentZone = 'center';
    this.isChargingJump = false;
    this.jumpChargeAmount = 0;
    this.maxPullDistance = 0;
    this.queuedCrouchOnLanding = false;
    this.usingTimeBasedCharge = false;
    
    // Show touch indicator at clamped position
    this.touchIndicator.setPosition(this.touchStartX, this.touchStartY);
    this.touchIndicator.setVisible(true);
    this.touchIndicator.setAlpha(0.5);
    
    // Start firing immediately
    this.isTouchFiring = true;
    
    // Check if we started in a movement zone (edge case)
    const dx = pointer.x - this.touchStartX;
    const dy = pointer.y - this.touchStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > this.zoneDeadRadius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      let startZone = 'center';
      
      if (angle >= -60 && angle < 60) {
        startZone = distance > this.zoneRadius ? 'rightDash' : 'rightMove';
      } else if (angle >= 60 && angle < 120) {
        startZone = 'crouch';
      } else if (angle >= -120 && angle < -60) {
        startZone = 'jump';
      } else {
        startZone = distance > this.zoneRadius ? 'leftDash' : 'leftMove';
      }
      
      if (startZone === 'leftMove' || startZone === 'rightMove') {
        // Trigger immediate movement
        if (startZone === 'leftMove') {
          this.moveLeft();
        } else {
          this.moveRight();
        }
        this.lastMoveTime = this.time.now;
        this.currentZone = startZone;
      }
    }
    
    // Visualize zones if enabled
    if (this.zoneVisuals) {
      this.updateZoneVisuals();
    }
  });
  
  // Touch move - zone-based movement detection
  this.input.on('pointermove', (pointer) => {
    if (!pointer.isDown || !this.touchZoneActive) return;
    
    // Update touch indicator position
    if (this.touchIndicator && this.touchIndicator.visible) {
      this.touchIndicator.setPosition(pointer.x, pointer.y);
    }
    
    const currentTime = this.time.now;
    const dx = pointer.x - this.touchStartX;
    const dy = pointer.y - this.touchStartY;
    
    // Update jump charge if in crouch zone or after leaving it (elastic pull)
    if (this.isChargingJump && !this.usingTimeBasedCharge) {
      // Normal distance-based charge tracking (not time-based)
      const currentPullDistance = Math.max(0, dy); // Only positive (downward) distance
      this.maxPullDistance = Math.max(this.maxPullDistance, currentPullDistance);
      
      // Charge based on the furthest pull, not current position
      const maxPullThreshold = this.zoneRadius * 2.25; // Pull to 225% of zone radius for max charge (1.5x original)
      this.jumpChargeAmount = Math.min(this.maxPullDistance / maxPullThreshold, 1.0); // 0 to 1 based on max pull
      
      // Update charge glow effect (same as keyboard)
      this.chargeGlow.clear();
      this.chargeGlow.setPosition(this.player.x, this.player.y);
      
      // Pulsing glow effect that grows with charge
      const pulseSpeed = 10 + this.jumpChargeAmount * 20; // Faster pulse as charge increases
      const pulse = Math.sin(currentTime * pulseSpeed * 0.001) * 0.2 + 0.8;
      const glowRadius = 30 + this.jumpChargeAmount * 50 * pulse;
      const glowAlpha = 0.3 + this.jumpChargeAmount * 0.5 * pulse;
      
      // Color transitions from blue to yellow to purple
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
        const pitchShift = 1 + this.jumpChargeAmount * 2; // Rise up to 3x pitch
        gameSounds.jumpCharge.frequency.exponentialRampToValueAtTime(
          Tone.Frequency("C2").toFrequency() * pitchShift,
          Tone.now() + 0.05
        );
      } catch(e) {}
      
      // Visual feedback for charging on touch indicator too
      if (this.touchIndicator) {
        // Pulse and grow indicator based on charge
        const scale = 15 + this.jumpChargeAmount * 20;
        this.touchIndicator.setRadius(scale);
        this.touchIndicator.setFillStyle(hexColor, 0.5 + this.jumpChargeAmount * 0.3);
      }
    }
    
    // Determine which zone we're in using radial detection
    let newZone = 'center';
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.zoneDeadRadius) {
      newZone = 'center';
    } else {
      // Calculate angle from center (-180 to 180)
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Determine zone based on angle
      // Steeper angles for up/down (narrower zones)
      // Right: -60 to 60 degrees (wider)
      // Bottom: 60 to 120 degrees (narrower)
      // Left: 120 to -120 degrees (wider)
      // Top: -120 to -60 degrees (narrower)
      
      if (angle >= -60 && angle < 60) {
        // Right zone - move extends to full radius, dash beyond
        newZone = distance > this.zoneRadius ? 'rightDash' : 'rightMove';
      } else if (angle >= 60 && angle < 120) {
        // Bottom zone - narrower angle, harder to accidentally trigger
        newZone = 'crouch';
      } else if (angle >= -120 && angle < -60) {
        // Top zone - narrower angle for jump
        newZone = 'jump';
      } else {
        // Left zone (120 to 180 or -180 to -120)
        newZone = distance > this.zoneRadius ? 'leftDash' : 'leftMove';
      }
    }
    
    // Handle zone changes for horizontal movement
    if (newZone !== this.currentZone) {
      
      // Visual feedback for zone change
      if (this.touchIndicator) {
        switch(newZone) {
          case 'leftDash':
          case 'rightDash':
            this.touchIndicator.setFillStyle(0xff0000, 0.6); // Red for dash
            break;
          case 'leftMove':
          case 'rightMove':
            this.touchIndicator.setFillStyle(0xff8800, 0.5); // Orange for move
            break;
          case 'jump':
            this.touchIndicator.setFillStyle(0x00ff00, 0.5); // Green for jump
            break;
          case 'crouch':
            this.touchIndicator.setFillStyle(0x0088ff, 0.5); // Blue for crouch
            break;
          default:
            this.touchIndicator.setFillStyle(0x00aaff, 0.3); // Light blue for center
        }
      }
      
      // Check if we can execute movement - prevent rapid firing
      const timeSinceLastMove = currentTime - this.lastMoveTime;
      const canMove = !this.isMoving && !this.isDashing && timeSinceLastMove > this.moveCooldown;
      // Dash can always interrupt movement, just check we're not already dashing
      const canDash = !this.isDashing;
      
      // Execute actions based on zone entry
      switch(newZone) {
        case 'leftMove':
          if ((this.currentZone === 'center' || this.currentZone === 'jump') && canMove) {
            this.laneBeforeMove = this.playerLane; // Save position before move
            this.moveLeft();
            this.lastMoveTime = currentTime;
            
            // Schedule recentering after move completes (150ms)
            this.time.delayedCall(150, () => {
              if (this.touchZoneActive) {
                // Get current pointer position
                const activePointer = this.input.activePointer;
                if (activePointer && activePointer.isDown) {
                  // Recenter with edge constraints
                  const edgePadding = this.zoneRadius * 0.7; // Allow 30% of zone to go off-screen
                  this.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
                  this.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);
                  
                  // Update visual zones at new position
                  if (this.zoneVisuals) {
                    this.updateZoneVisuals();
                  }
                }
              }
            });
          }
          break;
          
        case 'rightMove':
          if ((this.currentZone === 'center' || this.currentZone === 'jump') && canMove) {
            this.laneBeforeMove = this.playerLane; // Save position before move
            this.moveRight();
            this.lastMoveTime = currentTime;
            
            // Schedule recentering after move completes (150ms)
            this.time.delayedCall(150, () => {
              if (this.touchZoneActive) {
                // Get current pointer position
                const activePointer = this.input.activePointer;
                if (activePointer && activePointer.isDown) {
                  // Recenter with edge constraints
                  const edgePadding = this.zoneRadius * 0.7; // Allow 30% of zone to go off-screen
                  this.touchStartX = Phaser.Math.Clamp(activePointer.x, edgePadding, gameState.WIDTH - edgePadding);
                  this.touchStartY = Phaser.Math.Clamp(activePointer.y, edgePadding, gameState.HEIGHT - edgePadding);
                  
                  // Update visual zones at new position
                  if (this.zoneVisuals) {
                    this.updateZoneVisuals();
                  }
                }
              }
            });
          }
          break;
          
        case 'leftDash':
          if (canDash) {
            // Check if we just moved (within 250ms like keyboard double-tap)
            if (this.laneBeforeMove !== null && currentTime - this.lastMoveTime < 250) {
              // Cancel the move and dash from original position
              // Kill ALL tweens to prevent any move animations from continuing
              this.tweens.killTweensOf(this.player);
              
              // Reset to original lane AND position
              this.playerLane = this.laneBeforeMove;
              this.player.x = this._laneX(this.playerLane);
              this.player.setScale(1, 1); // Reset scale
              
              // Clear the flag
              this.laneBeforeMove = null;
              this.isMoving = false; // Clear moving flag
            }
            
            // Dash 2 lanes
            this.dashLeft();
            this.lastMoveTime = currentTime;
          }
          break;
          
        case 'rightDash':
          if (canDash) {
            // Check if we just moved (within 250ms like keyboard double-tap)
            if (this.laneBeforeMove !== null && currentTime - this.lastMoveTime < 250) {
              // Cancel the move and dash from original position
              // Kill ALL tweens to prevent any move animations from continuing
              this.tweens.killTweensOf(this.player);
              
              // Reset to original lane AND position
              this.playerLane = this.laneBeforeMove;
              this.player.x = this._laneX(this.playerLane);
              this.player.setScale(1, 1); // Reset scale
              
              // Clear the flag
              this.laneBeforeMove = null;
              this.isMoving = false; // Clear moving flag
            }
            
            // Dash 2 lanes
            this.dashRight();
            this.lastMoveTime = currentTime;
          }
          break;
          
        case 'jump':
          // Simple jump zone - just do a regular jump
          if (this.currentZone !== 'jump' && !this.isJumping && !this.isChargingJump) {
            this.jump();
          }
          break;
          
        case 'crouch':
          // Queue charging if airborne, or start immediately if on ground
          if (!this.isChargingJump) {
            if (this.isJumping) {
              // Queue the charge to start when landing
              this.queuedCrouchOnLanding = true;
              // Don't start charging yet, just track that we're in crouch zone
            } else {
              // Start charging immediately if on ground
              this.isChargingJump = true;
              this.chargeGlow.setVisible(true);
              
              // Start charge sound
              try {
                gameSounds.jumpCharge.triggerAttack("C2");
              } catch(e) {}
            }
          }
          break;
      }
      
      // If we left the crouch zone and went to a horizontal zone, cancel the charge or queue
      // But keep it active if going through center (which is part of the swipe path to jump)
      if (this.currentZone === 'crouch') {
        if (newZone === 'leftMove' || newZone === 'rightMove' || 
            newZone === 'leftDash' || newZone === 'rightDash') {
          // Cancelled by moving horizontally
          if (this.isChargingJump) {
            this.isChargingJump = false;
            this.jumpChargeAmount = 0;
            this.maxPullDistance = 0;
            this.chargeGlow.setVisible(false);
          }
          // Also cancel any queued crouch or time-based charge
          this.queuedCrouchOnLanding = false;
          this.usingTimeBasedCharge = false;
          // Stop charge sound
          try {
            gameSounds.jumpCharge.triggerRelease();
          } catch(e) {}
        }
        // Keep charge active when going through center or to jump
      }
      
      this.currentZone = newZone;
      this.zoneHoldTimer = 0; // Reset hold timer on zone change
    } else {
      // Same zone - check for auto-repeat for movement zones
      if (this.currentZone === 'leftMove' || this.currentZone === 'rightMove') {
        const currentTime = this.time.now;
        this.zoneHoldTimer += currentTime - (this.lastZoneCheckTime || currentTime);
        
        // Check if we should repeat the action
        const repeatThreshold = this.zoneHoldTimer > this.zoneRepeatDelay ? 
          this.zoneRepeatRate : this.zoneRepeatDelay;
        
        const timeSinceLastMove = currentTime - this.lastMoveTime;
        if (timeSinceLastMove > repeatThreshold && !this.isMoving && !this.isDashing) {
          if (this.currentZone === 'leftMove') {
            this.moveLeft();
          } else {
            this.moveRight();
          }
          this.lastMoveTime = currentTime;
        }
      }
    }
    
    this.lastZoneCheckTime = this.time.now;
  });
  
  // Touch end
  this.input.on('pointerup', (pointer) => {
    // Hide touch indicator
    if (this.touchIndicator) {
      this.touchIndicator.setVisible(false);
      this.touchIndicator.setFillStyle(0x00ff00, 0.3); // Reset color
    }
    
    // Clear zone visuals if enabled
    if (this.zoneVisuals) {
      this.zoneVisuals.clear();
    }
    
    // Stop time-based charging
    this.usingTimeBasedCharge = false;
    
    // Check if we should execute a charged jump on release
    if (this.isChargingJump && this.jumpChargeAmount > 0) {
      const chargePercent = this.jumpChargeAmount;
      if (chargePercent > 0.3) {
        // Super jump if charged enough, or queue if airborne
        if (!this.isJumping) {
          this.superJump(chargePercent);
        } else {
          // Queue the super jump to execute on landing
          this.queuedSuperJumpCharge = chargePercent;
        }
      } else {
        // Regular jump if barely charged (only if not already jumping)
        if (!this.isJumping) {
          this.jump();
        }
      }
      
      // Hide glow
      this.chargeGlow.setVisible(false);
      
      // Stop charge sound
      try {
        gameSounds.jumpCharge.triggerRelease();
      } catch(e) {}
    }
    
    // Reset state
    this.touchZoneActive = false;
    this.isTouchFiring = false;
    this.currentZone = 'center';
    this.isChargingJump = false;
    this.jumpChargeAmount = 0;
    this.maxPullDistance = 0;
    
    // Reset indicator size
    if (this.touchIndicator) {
      this.touchIndicator.setRadius(15);
    }
  });
}
