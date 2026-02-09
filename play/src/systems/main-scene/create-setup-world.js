import { gameState, isMobile, PLAYER_CONFIG, MAIN_SCENE_TUNING } from '../../config.js';
import { sessionHighScore } from '../../storage.js';
import { uiState, updateGridButton } from '../../audio/music-ui.js';
import { setupDebugToolsSystem } from './debug-tools.js';

export function initializeSceneWorldAndHUD() {
  this.trails = [];
  this.trailGraphics = this.add.graphics();

  const gfx = this.make.graphics({ x: 0, y: 0, add: false });

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

  const playerSize = Math.floor(basePlayerSize * gameState.MOBILE_SCALE);
  const enemySize = Math.floor(baseEnemySize * gameState.MOBILE_SCALE);
  const bulletW = Math.floor(baseBulletW * gameState.MOBILE_SCALE);
  const bulletH = Math.floor(baseBulletH * gameState.MOBILE_SCALE);
  const obstacleW = Math.floor(baseObstacleW * gameState.MOBILE_SCALE);
  const obstacleH = Math.floor(baseObstacleH * gameState.MOBILE_SCALE);
  const powerUpSize = Math.floor(basePowerUpSize * gameState.MOBILE_SCALE);

  this.enemyBaseSize = enemySize;
  this.fastEnemyBaseSize = Math.floor(enemySize * 1.25);

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

    if (i === 0) {
      gfx.moveTo(x, y);
    } else {
      gfx.lineTo(x, y);
    }
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

  this.playerLane = 2;
  this.player = this.add.image(this._laneX(this.playerLane), gameState.PLAYER_Y, 'playerTex');
  this.player.w = playerSize;
  this.player.h = playerSize;
  this.player.setDepth(500);

  this.chargeGlow = this.add.graphics();
  this.chargeGlow.setDepth(-1);
  this.chargeGlow.setVisible(false);
  this.enemies = [];
  this.bullets = [];
  this.obstacles = [];
  this.powerUps = [];
  this.lastShotAt = 0;
  this.rapidFire = false;
  this.rapidFireTimer = 0;
  this.offScreenTimer = 0;
  this.offScreenShotCount = 0;
  this.offScreenTurnDelay = 0;
  this.isMoving = false;
  this.isStretching = false;
  this.isJumping = false;
  this.isCrouching = false;
  this.crouchTimer = 0;
  this.maxChargeTime = MAIN_SCENE_TUNING.crouchMaxChargeMs;
  this.releaseGraceTime = MAIN_SCENE_TUNING.crouchReleaseGraceMs;
  this.queuedSuperJumpCharge = 0;
  this.keyboardJumpQueuedWhileAirborne = false;
  this.queuedCrouchOnLanding = false;
  this.usingTimeBasedCharge = false;
  this.touchChargeStartTime = 0;

  this.idleWobblePhase = 0;
  this.wobbleVelocity = { x: 0, y: 0 };
  this.wobbleDamping = 0.92;

  this.isDashing = false;
  this.lastLeftPress = 0;
  this.lastRightPress = 0;
  this.doubleTapWindow = PLAYER_CONFIG.dash.doubleTapWindow;
  this.keys = this.input.keyboard.addKeys(`LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,G,ONE,TWO,THREE,FOUR,FIVE,SIX,ESC,${MAIN_SCENE_TUNING.debug.toggleKey}`);
  this.score = 0;
  this.beats = 0;
  this.combo = 1;
  this.comboTimer = 0;
  this.lastKillTime = 0;
  this.maxCombo = 8;
  this.comboWindow = MAIN_SCENE_TUNING.comboWindowMs;

  const scoreFontSize = isMobile ? '24px' : '16px';
  const scoreY = isMobile ? gameState.HEIGHT - 36 : gameState.HEIGHT - 24;
  const highScoreY = isMobile ? gameState.HEIGHT - 72 : gameState.HEIGHT - 48;
  const comboY = isMobile ? gameState.HEIGHT - 108 : gameState.HEIGHT - 72;

  const labelOffset = 10;
  const valueOffset = 80;

  this.highScoreLabel = this.add.text(labelOffset, highScoreY, 'high', { font: `${scoreFontSize} monospace`, fill: '#ff0' });
  this.highScoreText = this.add.text(valueOffset, highScoreY, sessionHighScore.toString(), { font: `${scoreFontSize} monospace`, fill: '#ff0' });
  this.highScoreText.setOrigin(0, 0);

  this.scoreLabel = this.add.text(labelOffset, scoreY, 'score', { font: `${scoreFontSize} monospace`, fill: '#0f0' });
  this.scoreText = this.add.text(valueOffset, scoreY, '0', { font: `${scoreFontSize} monospace`, fill: '#0f0' });
  this.scoreText.setOrigin(0, 0);
  this.comboText = this.add.text(10, comboY, '', { font: `${scoreFontSize} monospace`, fill: '#ff00ff' });
  this.comboText.setAlpha(0);

  const meterY = comboY + 30;
  this.comboMeterBg = this.add.graphics();
  this.comboMeterBg.fillStyle(0x333333, 0.5);
  this.comboMeterBg.fillRect(10, meterY, 200, 8);
  this.comboMeterBg.setVisible(false);

  this.comboMeter = this.add.graphics();
  this.comboMeterY = meterY;

  this.gridVisible = gameState.gridEnabled;

  uiState.gridVisible = gameState.gridEnabled;
  updateGridButton();

  this.setupMobileControls();
  setupDebugToolsSystem.call(this);
}
