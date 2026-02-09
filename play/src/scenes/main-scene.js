import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, isMobile, LANES, ENEMY_SPEED_BASE, BULLET_SPEED, FIRE_COOLDOWN, HORIZONTAL_SHOOTING, ARC_SHOT_BASE_SAFE_DISTANCE, ARC_SHOT_HEIGHT_BONUS, ARC_SHOT_MAX_JUMP_HEIGHT, PLAYER_CONFIG, pulsePatternPool, sectionPatternMap, updateDimensions } from '../config.js';
import { savedData, saveGameData, sessionHighScore, setSessionHighScore } from '../storage.js';
import { currentBar, setCurrentBar, currentChordIndex, setCurrentChordIndex, lastSection, setLastSection, currentGenre, updatePatterns, getSection, ensureTransportScheduled, getMusicWatchdogStatus, recoverMusicLoops } from '../audio/music-engine.js';
import { currentDifficulty, DIFFICULTY_PRESETS, uiState, updateGridButton, updatePlayPauseButton } from '../audio/music-ui.js';
import { gameSounds, getGameNote } from '../audio/game-sounds.js';
import { createStarfieldSystem, updateStarfieldSystem } from '../systems/main-scene/starfield.js';
import { handleTutorialSpawnSystem, updateTutorialProgressSystem, advanceTutorialSystem, skipTutorialSystem, completeTutorialSystem } from '../systems/main-scene/tutorial.js';
import { updateTrailsSystem } from '../systems/main-scene/trails.js';
import { updateZoneVisualsSystem, setupMobileControlsSystem } from '../systems/main-scene/mobile-controls.js';
import { moveLeftSystem, moveRightSystem, jumpSystem, dashLeftSystem, dashRightSystem, checkDashCollisionSystem, superJumpSystem } from '../systems/main-scene/movement.js';
import { pauseGameSystem, resumeGameSystem, showGameOverScreenSystem } from '../systems/main-scene/pause-gameover.js';
import { createSplatEffectSystem, createDeathExplosionSystem, createExplosionSystem } from '../systems/main-scene/fx.js';
import { spawnEnemySystem, spawnObstacleSystem, spawnFloatingStarSystem, spawnPowerUpSystem, spawnDrifterSystem } from '../systems/main-scene/spawn.js';
import { pulseGridSystem, drawPerspectiveGridSystem, fireSystem } from '../systems/main-scene/grid-fire.js';
import { updateMainLoopSystem } from '../systems/main-scene/update-loop.js';
import { createMainSceneSystem } from '../systems/main-scene/create-setup.js';

export default class Main extends Phaser.Scene {
  constructor() {
    super({ key: 'Main' });
    
    // Break section state
    this.isBreakSection = false;
    this.floatingStars = [];
  }
  updateSoundDisplay() {
    const soundNames = ['Triangle', 'Acid', 'Chord', 'Sub', 'Pluck', 'Pew Pew'];
    const display = document.getElementById('soundDisplay');
    if (display) {
      display.textContent = soundNames[gameSounds.currentLaserSound];
    }
  }
  
  createStarfield() {
    return createStarfieldSystem.call(this);
  }
  
  updateStarfield(dt) {
    return updateStarfieldSystem.call(this, dt);
  }
  
  create(data){
    return createMainSceneSystem.call(this, data);
  }

  updateZoneVisuals() {
    return updateZoneVisualsSystem.call(this);
  }

  setupMobileControls() {
    return setupMobileControlsSystem.call(this);
  }

  moveLeft() {
    return moveLeftSystem.call(this);
  }

  moveRight() {
    return moveRightSystem.call(this);
  }

  jump() {
    return jumpSystem.call(this);
  }

  dashLeft() {
    return dashLeftSystem.call(this);
  }

  dashRight() {
    return dashRightSystem.call(this);
  }

  checkDashCollision() {
    return checkDashCollisionSystem.call(this);
  }

  superJump(chargePercent = 1.0) {
    return superJumpSystem.call(this, chargePercent);
  }
  _laneX(lane, progress = 1){ 
    // Interpolate X position between vanishing point and lane position based on progress
    // Use the same vanishing point as the grid
    const vanishX = this.vanishX || gameState.WIDTH / 2;
    // Clamp off-screen lanes to be partially visible
    let clampedLane = lane;
    if(lane < 0) {
      clampedLane = -0.7; // Show 30% of ship on left edge
    } else if(lane >= LANES) {
      clampedLane = LANES - 0.3; // Show 30% of ship on right edge
    }
    const bottomLaneX = clampedLane * gameState.LANE_W + gameState.LANE_W / 2;
    return vanishX + (bottomLaneX - vanishX) * progress;
  }
  _spawnEnemy(lane, speed, texture='enemyTex'){ 
    return spawnEnemySystem.call(this, lane, speed, texture);
  }
  
  _createSplatEffect(x, y) {
    return createSplatEffectSystem.call(this, x, y);
  }

  _createDeathExplosion(playerX, playerY, enemyX, enemyY, enemyScale = 1.0) {
    return createDeathExplosionSystem.call(this, playerX, playerY, enemyX, enemyY, enemyScale);
  }

  _createExplosion(x, y, color = 0xff3366, particleCount = 8, scale = 1.0){
    return createExplosionSystem.call(this, x, y, color, particleCount, scale);
  }

  pauseGame() {
    return pauseGameSystem.call(this);
  }

  resumeGame() {
    return resumeGameSystem.call(this);
  }

  showGameOverScreen() {
    return showGameOverScreenSystem.call(this);
  }

  _spawnObstacle(lane){
    return spawnObstacleSystem.call(this, lane);
  }
  
  _spawnFloatingStar(obstacle) {
    return spawnFloatingStarSystem.call(this, obstacle);
  }
  
  _spawnPowerUp(lane){
    return spawnPowerUpSystem.call(this, lane);
  }
  
  handleTutorialSpawn() {
    return handleTutorialSpawnSystem.call(this);
  }
  
  updateTutorialProgress() {
    return updateTutorialProgressSystem.call(this);
  }
  
  advanceTutorial() {
    return advanceTutorialSystem.call(this);
  }
  
  skipTutorial() {
    return skipTutorialSystem.call(this);
  }
  
  completeTutorial() {
    return completeTutorialSystem.call(this);
  }
  
  _spawnDrifter(lane){
    return spawnDrifterSystem.call(this, lane);
  }
  
  _pulseGrid(){
    return pulseGridSystem.call(this);
  }
  
  _drawPerspectiveGrid(){
    return drawPerspectiveGridSystem.call(this);
  }
  _fire(){ 
    return fireSystem.call(this);
  }
  _aabb(a,b){ 
    return Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.y-b.y) < (a.h+b.h)/2; 
  }

  update(_, dt){
    return updateMainLoopSystem.call(this, _, dt);
  }

  resize(gameSize, baseSize, displaySize, resolution) {
    // Update global dimensions using the actual camera dimensions
    updateDimensions(this.cameras.main.width, this.cameras.main.height);
    
    // Update vanishing point for consistent perspective
    this.vanishX = gameState.WIDTH / 2;
    this.vanishY = gameState.HEIGHT * 0.15;
    
    // Update player position
    if (this.player) {
      this.player.x = this._laneX(this.playerLane);
      this.player.y = gameState.PLAYER_Y;
    }
    
    // Update UI text positions
    const scoreY = isMobile ? gameState.HEIGHT-36 : gameState.HEIGHT-24;
    const highScoreY = isMobile ? gameState.HEIGHT-72 : gameState.HEIGHT-48;
    const comboY = isMobile ? gameState.HEIGHT-108 : gameState.HEIGHT-72;
    
    // Update score label and value positions
    if (this.scoreLabel) {
      this.scoreLabel.y = scoreY;
    }
    if (this.scoreText) {
      this.scoreText.y = scoreY;
    }
    
    // Update high score label and value positions
    if (this.highScoreLabel) {
      this.highScoreLabel.y = highScoreY;
    }
    if (this.highScoreText) {
      this.highScoreText.y = highScoreY;
    }
    
    if (this.comboText) {
      this.comboText.y = comboY;
    }
    
    // Update combo meter position
    if (this.comboMeterBg) {
      const meterY = comboY + 30;
      this.comboMeterY = meterY;
      this.comboMeterBg.clear();
      this.comboMeterBg.fillStyle(0x333333, 0.5);
      this.comboMeterBg.fillRect(10, meterY, 200, 8);
    }
    
    // Recreate starfield with new dimensions
    if (this.stars) {
      this.createStarfield();
    }
    
    // Update grid if visible
    if (this.gridVisible && this.gridGraphics) {
      this._drawPerspectiveGrid();
    }
    
    // Update mobile controls positions if they exist
    if (this.mobileControls) {
      this.setupMobileControls();
    }
  }
  
  updateTrails(dt) {
    return updateTrailsSystem.call(this, dt);
  }
}
