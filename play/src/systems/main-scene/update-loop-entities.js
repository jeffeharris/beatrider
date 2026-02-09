import { updateEnemiesSystem } from './update-loop-enemies.js';
import { updateObstaclesStarsPowerUpsSystem } from './update-loop-obstacles-stars-powerups.js';
import { updateBulletsSystem } from './update-loop-bullets.js';

export function runUpdateLoopEntities(dt, pulseShift, pulseXShift) {
  updateEnemiesSystem.call(this, dt, pulseShift, pulseXShift);
  updateObstaclesStarsPowerUpsSystem.call(this, dt, pulseShift, pulseXShift);
  updateBulletsSystem.call(this, dt);
}
