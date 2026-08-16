import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, LANES, DAMAGE_VALUES } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';
import { applyDamage } from './damage-state.js';
import { projectY, perspectiveScale } from './perspective.js';

export function updateEnemiesSystem(dt, pulseShift, pulseXShift) {
const { player: playerState, flow, combat } = this.stateSlices;
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
  const y = projectY(e.progress, vanishY, gameState.HEIGHT);
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
  let scale = perspectiveScale(e.progress); // Start tiny, grow to normal size
  
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
  else if(
    e.progress > 0.94 &&
    e.progress < 0.97 &&
    !playerState.jumping &&
    !playerState.stretching &&
    !flow.invincible &&
    this._aabb(e, this.player)
  ){
    const damageType = e.isDrifter ? 'drifter' : (e.enemyType || 'enemyTex');
    const damage = DAMAGE_VALUES[damageType] || 15;
    const { nextShield, lethal } = applyDamage({ shield: combat.shield, damage });

    if (lethal) {
      // No shield — instant death (original behavior)
      flow.invincible = true;
      // High score is persisted as it is beaten during play (update-loop-bullets.js)
      // and finalised on the game-over screen. Bumping it here as well made the
      // game-over check compare the score against itself, so "NEW HIGH SCORE!"
      // never fired.
      const enemyScale = perspectiveScale(e.progress);
      this._createDeathExplosion(this.player.x, this.player.y, e.x, e.y, enemyScale);
      try {
        const now = Tone.now();
        gameSounds.obstacleHit.triggerAttackRelease("G2", "16n", now);
        gameSounds.obstacleHit.triggerAttackRelease("D2", "16n", now + 0.05);
        gameSounds.obstacleHit.triggerAttackRelease("G1", "16n", now + 0.1);
        gameSounds.explosion.triggerAttackRelease("8n", now + 0.02);
      } catch(e) {}
      this.player.setVisible(false);
      e.destroy();
      this.showGameOverScreen();
    } else {
      // Shield absorbs hit — flash white, camera shake, destroy enemy
      combat.shield = nextShield;
      this.player.setTint(0xffffff);
      this.time.delayedCall(100, () => {
        if (combat.rapidFire) {
          this.player.setTint(combat.rapidFireFromShield ? 0xff00ff : 0x00ff00);
        } else {
          this.player.clearTint();
        }
      });
      this.cameras.main.shake(200, 0.01);
      this._createExplosion(e.x, e.y, 0xff3366, 6, 0.5);
      e.destroy();
      this.enemies.splice(i, 1);
    }
  }
}

}
