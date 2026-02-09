import { gameState, isMobile, PLAYER_CONFIG, MAIN_SCENE_TUNING } from '../../config.js';
import { sessionHighScore } from '../../storage.js';
import { uiState, updateGridButton } from '../../audio/music-ui.js';
import { setupDebugToolsSystem } from './debug-tools.js';

function computeWorldSizes() {
  const screenReference = Math.min(gameState.WIDTH, gameState.HEIGHT);
  const screenScale = screenReference / 800;
  const mobileBoost = isMobile ? 1.2 : 1.0;

  const basePlayerSize = Math.floor(36 * screenScale * mobileBoost);
  const baseEnemySize = Math.floor(32 * screenScale * mobileBoost);
  const baseBulletW = Math.floor(8 * screenScale * mobileBoost);
  const baseBulletH = Math.floor(16 * screenScale * mobileBoost);
  const baseObstacleW = Math.floor(80 * screenScale * mobileBoost);
  const baseObstacleH = Math.floor(22 * screenScale * mobileBoost);
  const basePowerUpSize = Math.floor(28 * screenScale * mobileBoost);

  return {
    playerSize: Math.floor(basePlayerSize * gameState.MOBILE_SCALE),
    enemySize: Math.floor(baseEnemySize * gameState.MOBILE_SCALE),
    bulletW: Math.floor(baseBulletW * gameState.MOBILE_SCALE),
    bulletH: Math.floor(baseBulletH * gameState.MOBILE_SCALE),
    obstacleW: Math.floor(baseObstacleW * gameState.MOBILE_SCALE),
    obstacleH: Math.floor(baseObstacleH * gameState.MOBILE_SCALE),
    powerUpSize: Math.floor(basePowerUpSize * gameState.MOBILE_SCALE)
  };
}

function buildMainSceneTextures(gfx, sizes) {
  const { enemySize, bulletW, bulletH, obstacleW, obstacleH, powerUpSize, playerSize } = sizes;

  gfx.fillStyle(0x00ffcc, 1).fillRect(0, 0, playerSize, playerSize).generateTexture('playerTex', playerSize, playerSize).clear();
  gfx.fillStyle(0xff3366, 1).fillRect(0, 0, enemySize, enemySize).generateTexture('enemyTex', enemySize, enemySize).clear();
  gfx.fillStyle(0xffff00, 1).fillTriangle(enemySize / 2, 0, 0, enemySize, enemySize, enemySize).generateTexture('fastEnemyTex', enemySize, enemySize).clear();
  gfx.fillStyle(0xffffff, 1).fillRect(0, 0, bulletW, bulletH).generateTexture('bulletTex', bulletW, bulletH).clear();

  const poleWidth = Math.floor(obstacleW * 0.15);
  const shieldGap = 2;

  gfx.fillStyle(0xbf40ff, 1);
  gfx.fillRect(0, 0, poleWidth, obstacleH);
  gfx.fillRect(obstacleW - poleWidth, 0, poleWidth, obstacleH);

  const shieldX = poleWidth + shieldGap;
  const shieldWidth = obstacleW - (poleWidth * 2) - (shieldGap * 2);

  gfx.fillStyle(0xff99ff, 0.15);
  gfx.fillRect(shieldX - 2, 0, shieldWidth + 4, obstacleH);

  gfx.fillStyle(0xffccff, 0.25);
  gfx.fillRect(shieldX, 2, shieldWidth, obstacleH - 4);

  gfx.fillStyle(0xffd4ff, 0.4);
  gfx.fillRect(shieldX + 2, 4, shieldWidth - 4, obstacleH - 8);

  gfx.lineStyle(1, 0xffffff, 0.2);
  for (let i = 0; i < 3; i++) {
    const lineX = shieldX + shieldGap + (shieldWidth / 4) * (i + 1);
    gfx.lineBetween(lineX, 2, lineX, obstacleH - 2);
  }

  gfx.generateTexture('obstacleTex', obstacleW, obstacleH).clear();
  gfx.fillStyle(0x00ff00, 1).fillCircle(powerUpSize / 2, powerUpSize / 2, powerUpSize / 2).generateTexture('powerUpTex', powerUpSize, powerUpSize).clear();

  const starSize = Math.floor(40 * gameState.MOBILE_SCALE);
  const spikes = 5;
  const outerRadius = starSize / 2;
  const innerRadius = outerRadius * 0.4;

  gfx.fillStyle(0xffdd00, 1);
  gfx.beginPath();

  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI * 2 * i) / (spikes * 2) - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = starSize / 2 + Math.cos(angle) * radius;
    const y = starSize / 2 + Math.sin(angle) * radius;

    if (i === 0) gfx.moveTo(x, y);
    else gfx.lineTo(x, y);
  }

  gfx.closePath();
  gfx.fillPath();
  gfx.generateTexture('starTex', starSize, starSize).clear();

  const halfSize = enemySize / 2;
  gfx.fillStyle(0xff00ff, 1);
  gfx.beginPath();
  gfx.moveTo(halfSize, 2);
  gfx.lineTo(enemySize - 2, halfSize);
  gfx.lineTo(halfSize, enemySize - 2);
  gfx.lineTo(2, halfSize);
  gfx.closePath();
  gfx.fillPath();
  gfx.generateTexture('drifterTex', enemySize, enemySize).destroy();
}

function initializeSceneEntities(scene, sizes) {
  const { player: playerState } = scene.stateSlices;

  playerState.lane = 2;
  scene.player = scene.add.image(scene._laneX(playerState.lane), gameState.PLAYER_Y, 'playerTex');
  scene.player.w = sizes.playerSize;
  scene.player.h = sizes.playerSize;
  scene.player.setDepth(500);

  scene.chargeGlow = scene.add.graphics();
  scene.chargeGlow.setDepth(-1);
  scene.chargeGlow.setVisible(false);

  scene.enemyBaseSize = sizes.enemySize;
  scene.fastEnemyBaseSize = Math.floor(sizes.enemySize * 1.25);
}

function initializeRuntimeState(scene) {
  const { player: playerState, combat } = scene.stateSlices;

  scene.trails = [];
  scene.trailGraphics = scene.add.graphics();
  scene.enemies = [];
  scene.bullets = [];
  scene.obstacles = [];
  scene.powerUps = [];
  scene.lastShotAt = 0;

  combat.rapidFire = false;
  combat.rapidFireTimer = 0;
  combat.offScreenTimer = 0;
  combat.score = 0;
  combat.beats = 0;
  combat.combo = 1;

  scene.offScreenShotCount = 0;
  scene.offScreenTurnDelay = 0;
  playerState.moving = false;
  playerState.stretching = false;
  playerState.jumping = false;
  playerState.crouching = false;
  playerState.dashing = false;

  scene.crouchTimer = 0;
  scene.maxChargeTime = MAIN_SCENE_TUNING.crouchMaxChargeMs;
  scene.releaseGraceTime = MAIN_SCENE_TUNING.crouchReleaseGraceMs;
  scene.queuedSuperJumpCharge = 0;
  scene.keyboardJumpQueuedWhileAirborne = false;
  scene.queuedCrouchOnLanding = false;
  scene.usingTimeBasedCharge = false;
  scene.touchChargeStartTime = 0;

  scene.idleWobblePhase = 0;
  scene.wobbleVelocity = { x: 0, y: 0 };
  scene.wobbleDamping = 0.92;

  scene.lastLeftPress = 0;
  scene.lastRightPress = 0;
  scene.doubleTapWindow = PLAYER_CONFIG.dash.doubleTapWindow;
  scene.keys = scene.input.keyboard.addKeys(`LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,G,ONE,TWO,THREE,FOUR,FIVE,SIX,ESC,${MAIN_SCENE_TUNING.debug.toggleKey}`);

  scene.comboTimer = 0;
  scene.lastKillTime = 0;
  scene.maxCombo = 8;
  scene.comboWindow = MAIN_SCENE_TUNING.comboWindowMs;
}

function createHud(scene) {
  const scoreFontSize = isMobile ? '24px' : '16px';
  const scoreY = isMobile ? gameState.HEIGHT - 36 : gameState.HEIGHT - 24;
  const highScoreY = isMobile ? gameState.HEIGHT - 72 : gameState.HEIGHT - 48;
  const comboY = isMobile ? gameState.HEIGHT - 108 : gameState.HEIGHT - 72;

  const labelOffset = 10;
  const valueOffset = 80;

  scene.highScoreLabel = scene.add.text(labelOffset, highScoreY, 'high', { font: `${scoreFontSize} monospace`, fill: '#ff0' });
  scene.highScoreText = scene.add.text(valueOffset, highScoreY, sessionHighScore.toString(), { font: `${scoreFontSize} monospace`, fill: '#ff0' });
  scene.highScoreText.setOrigin(0, 0);

  scene.scoreLabel = scene.add.text(labelOffset, scoreY, 'score', { font: `${scoreFontSize} monospace`, fill: '#0f0' });
  scene.scoreText = scene.add.text(valueOffset, scoreY, '0', { font: `${scoreFontSize} monospace`, fill: '#0f0' });
  scene.scoreText.setOrigin(0, 0);
  scene.comboText = scene.add.text(10, comboY, '', { font: `${scoreFontSize} monospace`, fill: '#ff00ff' });
  scene.comboText.setAlpha(0);

  const meterY = comboY + 30;
  scene.comboMeterBg = scene.add.graphics();
  scene.comboMeterBg.fillStyle(0x333333, 0.5);
  scene.comboMeterBg.fillRect(10, meterY, 200, 8);
  scene.comboMeterBg.setVisible(false);

  scene.comboMeter = scene.add.graphics();
  scene.comboMeterY = meterY;
}

function wireSceneUiAndDebug(scene) {
  scene.gridVisible = gameState.gridEnabled;

  uiState.gridVisible = gameState.gridEnabled;
  updateGridButton();

  scene.setupMobileControls();
  setupDebugToolsSystem.call(scene);
}

export function initializeSceneWorldAndHUD() {
  const gfx = this.make.graphics({ x: 0, y: 0, add: false });
  const sizes = computeWorldSizes();

  buildMainSceneTextures(gfx, sizes);
  initializeSceneEntities(this, sizes);
  initializeRuntimeState(this);
  createHud(this);
  wireSceneUiAndDebug(this);
}
