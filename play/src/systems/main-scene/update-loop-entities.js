import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, LANES } from '../../config.js';
import { saveGameData, sessionHighScore, setSessionHighScore } from '../../storage.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';

export function runUpdateLoopEntities(dt, pulseShift, pulseXShift) {
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
