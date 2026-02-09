import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { sessionHighScore, setSessionHighScore } from '../../storage.js';
import { gameSounds } from '../../audio/game-sounds.js';
import {
  applyPoints,
  resolveComboForChain,
  updateMaxComboReached
} from './score-combo-state.js';

export function updateObstaclesStarsPowerUpsSystem(dt, pulseShift, pulseXShift) {
const { player: playerState, flow, combat } = this.stateSlices;
const vanishY = gameState.HEIGHT * 0.15;
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
    if(!star.collected && playerState.jumping && obstacle.lane === playerState.lane) {
      // Same collision window as obstacles
      if(obstacle.progress > 0.94 && obstacle.progress < 0.97) {
        // Collect the star!
        star.collected = true;
        combat.combo = resolveComboForChain({
          currentCombo: combat.combo,
          maxCombo: this.maxCombo
        });
        this.maxComboReached = updateMaxComboReached({
          currentMaxComboReached: this.maxComboReached,
          combo: combat.combo
        });
        this.lastKillTime = this.time.now;
        const scoreResult = applyPoints({
          currentScore: combat.score,
          basePoints: 50,
          comboMultiplier: 1
        });
        combat.score = scoreResult.nextScore;
        this.scoreText.setText(combat.score.toString());
        
        // Track for tutorial
        if (this.isTutorial) {
          this.tutorialProgress.starsCollected++;
        }
        
        // Show combo text
        if(combat.combo > 1) {
          this.comboText.setText(`${combat.combo}x COMBO! +50`);
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
  if(o.progress > 0.94 && o.progress < 0.97 && o.lane === playerState.lane) {
    if (playerState.jumping || playerState.stretching) {
      // Successfully jumped over obstacle - track for tutorial
      if (this.isTutorial && !o.tutorialCounted) {
        o.tutorialCounted = true; // Only count once per obstacle
        this.tutorialProgress.jumpsMade++;
      }
    } else if (!flow.invincible) {
      // Hit obstacle - game over
      // Set invincible immediately to prevent multiple deaths
      flow.invincible = true;
      
      // Save highscore before restarting
      if(combat.score > sessionHighScore) {
        setSessionHighScore(combat.score);
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
  if(p.progress > 0.93 && p.progress < 0.98 && p.lane === playerState.lane){
    p.destroy();
    this.powerUps.splice(i,1);
    const scoreResult = applyPoints({
      currentScore: combat.score,
      basePoints: 10,
      comboMultiplier: 1
    });
    combat.score = scoreResult.nextScore;
    this.scoreText.setText(combat.score.toString()); // Update score display
    
    // Track for tutorial
    if (this.isTutorial) {
      this.tutorialProgress.powerUpsCollected = (this.tutorialProgress.powerUpsCollected || 0) + 1;
    }
    
    combat.rapidFire = true;
    combat.rapidFireTimer = 5000;
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
if(combat.rapidFire){
  combat.rapidFireTimer -= dt;
  if(combat.rapidFireTimer <= 0){
    combat.rapidFire = false;
    this.player.clearTint();
  }
}

}
