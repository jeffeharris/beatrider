import * as Tone from 'tone';
import { gameState } from '../../config.js';
import { saveGameData, sessionHighScore, setSessionHighScore } from '../../storage.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';
import {
  applyPoints,
  resolveComboFromWindow,
  updateMaxComboReached
} from './score-combo-state.js';
import { projectY, entityScale, depthForProgress } from './perspective.js';

export function updateBulletsSystem(dt) {
const { combat } = this.stateSlices;
for(let i=this.bullets.length-1; i>=0; i--){
  const b=this.bullets[i]; 
  
  if(b.isHorizontal) {
    // Horizontal bullet movement across lanes
    b.currentLane += (b.vx * dt/1000) / 150; // Convert speed to lane units
    b.lane = Math.floor(b.currentLane + 0.5); // Round to nearest lane for collision
    
    // Update position using current lane and constant progress
    b.x = this._laneX(b.currentLane, b.progress);
    b.y = projectY(b.progress);
    
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
    let y = projectY(b.progress);

    // Apply arc trajectory if this is a jump shot.
    // For its first `safeDistance` of travel the shot flies a straight line from
    // where the player fired to where the perspective curve says that depth sits,
    // which is what lets it clear obstacles. After that it rejoins the curve.
    if(b.isArcShot) {
      b.arcDistance += (Math.abs(b.vy) * dt/1000) / (gameState.HEIGHT * 0.8);

      if (b.arcDistance < b.safeDistance) {
        const arcProgress = b.arcDistance / b.safeDistance;
        const arcEndY = projectY(1.0 - b.safeDistance);
        y = b.startY + (arcEndY - b.startY) * arcProgress;
      } else {
        b.isArcShot = false; // y is already the on-curve position
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
  
  // Scale and render order both follow distance down the track
  b.setScale(entityScale(b.progress));
  b.setDepth(depthForProgress(b.progress));
  
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
        // Create explosion at enemy position with proper scale
        const explosionColor = e.isDrifter ? 0x9966ff : (e.enemyType === 'fastEnemyTex' ? 0xffff00 : 0xff3366);
        this._createExplosion(e.x, e.y, explosionColor, e.isDrifter ? 12 : 8, entityScale(e.progress));
        
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
        
        const currentTime = this.time.now;
        combat.combo = resolveComboFromWindow({
          currentCombo: combat.combo,
          nowMs: currentTime,
          lastKillTimeMs: this.lastKillTime,
          comboWindowMs: this.comboWindow,
          maxCombo: this.maxCombo
        });
        this.lastKillTime = currentTime;
        this.maxComboReached = updateMaxComboReached({
          currentMaxComboReached: this.maxComboReached,
          combo: combat.combo
        });

        const scoreResult = applyPoints({
          currentScore: combat.score,
          basePoints,
          comboMultiplier: combat.combo
        });
        const points = scoreResult.pointsAwarded;
        combat.score = scoreResult.nextScore;
        this.scoreText.setText(combat.score.toString());
        
        // Show combo text with animation
        if(combat.combo > 1) {
          this.comboText.setText(`${combat.combo}x COMBO! +${points}`);
          this.comboText.setAlpha(1);
          // Pulse effect based on combo level
          const currentCombo = combat.combo;
          const comboColor = currentCombo >= 6 ? '#ff00ff' : currentCombo >= 4 ? '#ffff00' : '#00ffff';
          this.comboText.setColor(comboColor);
          this.comboText.setScale(1 + (currentCombo * 0.05));
          
          // Fade out combo text
          this.tweens.add({
            targets: this.comboText,
            alpha: 0,
            scale: 1,
            duration: 1000,
            ease: 'Power2'
          });
          
          // Screen flash for high combos
          if(combat.combo >= 4) {
            const flash = this.add.graphics();
            flash.fillStyle(combat.combo >= 6 ? 0xff00ff : 0xffff00, 0.3);
            flash.fillRect(0, 0, gameState.WIDTH, gameState.HEIGHT);
            this.tweens.add({
              targets: flash,
              alpha: 0,
              duration: 200,
              onComplete: () => flash.destroy()
            });
          }
          
          // Bonus sound effects for combo milestones
          if(combat.combo === 4 || combat.combo === 6 || combat.combo === 8) {
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
        if(combat.score > sessionHighScore) {
          setSessionHighScore(combat.score);
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
