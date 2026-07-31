import { gameState, isMobile, ENEMY_SPEED_BASE } from '../../config.js';
import { getVanishY, depthForProgress } from './perspective.js';

export function spawnEnemySystem(lane, speed, texture = 'enemyTex') {
  const vanishY = getVanishY();
  const e = this.add.image(this._laneX(lane, 0), vanishY, texture);
  e.lane = lane;
  e.progress = 0;
  e.vy = speed;
  e.baseSize = texture === 'fastEnemyTex' ? this.fastEnemyBaseSize : this.enemyBaseSize;
  e.w = e.baseSize;
  e.h = e.baseSize;
  e.enemyType = texture;
  e.setScale(0.1);
  e.setDepth(depthForProgress(0));
  e.trailPoints = [];
  this.enemies.push(e);
}

export function spawnObstacleSystem(lane) {
  const vanishY = getVanishY();
  const baseX = this._laneX(lane, 0);

  // Keep sizing formula in place for future obstacle variants.
  Math.floor(80 * (Math.min(gameState.WIDTH, gameState.HEIGHT) / 800) * (isMobile ? 1.2 : 1.0) * gameState.MOBILE_SCALE);
  Math.floor(22 * (Math.min(gameState.WIDTH, gameState.HEIGHT) / 800) * (isMobile ? 1.2 : 1.0) * gameState.MOBILE_SCALE);

  const o = this.add.image(baseX, vanishY, 'obstacleTex');
  o.lane = lane;
  o.progress = 0;
  o.vy = ENEMY_SPEED_BASE * 0.7;
  o.baseSize = Math.floor(60 * gameState.MOBILE_SCALE);
  o.w = o.baseSize;
  o.h = Math.floor(22 * gameState.MOBILE_SCALE);
  o.setScale(0.1);
  o.setDepth(depthForProgress(0));
  o.trailPoints = [];
  o.isObstacle = true;
  this.obstacles.push(o);

  if (this.isBreakSection) {
    if ((this.isTutorial && this.tutorialWave === 6) || !this.isTutorial) {
      this._spawnFloatingStar(o);
    }
  }
}

export function spawnFloatingStarSystem(obstacle) {
  const star = this.add.image(obstacle.x, obstacle.y - 25, 'starTex');
  star.attachedObstacle = obstacle;
  star.setScale(1.0);
  star.setDepth(depthForProgress(0) + 2);
  star.collected = false;
  star.rotationSpeed = 0.05;
  star.floatOffset = 0;
  star.floatSpeed = 0.003;
  this.floatingStars.push(star);
}

export function spawnPowerUpSystem(lane) {
  const vanishY = getVanishY();
  const p = this.add.image(this._laneX(lane, 0), vanishY, 'powerUpTex');
  p.lane = lane;
  p.progress = 0;
  p.vy = ENEMY_SPEED_BASE * 1.2;
  p.baseSize = Math.floor(20 * gameState.MOBILE_SCALE);
  p.setScale(0.1);
  p.setDepth(depthForProgress(0));
  this.powerUps.push(p);
}

export function spawnDrifterSystem(lane) {
  const vanishY = getVanishY();
  const d = this.add.image(this._laneX(lane, 0), vanishY, 'drifterTex');
  d.lane = lane;
  d.targetLane = lane;
  d.progress = 0;
  d.vy = ENEMY_SPEED_BASE * 0.8;
  d.baseSize = this.enemyBaseSize;
  d.w = d.baseSize * 0.7;
  d.h = d.baseSize * 0.7;
  d.enemyType = 'drifterTex';
  d.isDrifter = true;
  d.driftTimer = 0;
  d.setScale(0.1);
  d.setDepth(depthForProgress(0));
  d.trailPoints = [];
  this.enemies.push(d);
}
