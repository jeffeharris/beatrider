import { gameState, isMobile, PLAYER_CONFIG, MAIN_SCENE_TUNING } from '../../config.js';
import { loadGameData, sessionHighScore } from '../../storage.js';
import { uiState, updateGridButton } from '../../audio/music-ui.js';
import { setupDebugToolsSystem } from './debug-tools.js';
import { createResourceBarSystem } from './resource-bar.js';

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

const PLAYER_CHARACTERS = {
  default: {
    textureKey: 'playerTexDefault'
  },
  unicorn: {
    textureKey: 'playerTexUnicorn'
  }
};

function normalizeCharacterId(characterId) {
  return PLAYER_CHARACTERS[characterId] ? characterId : 'default';
}

function getPlayerTextureForCharacter(characterId) {
  const normalizedId = normalizeCharacterId(characterId);
  return PLAYER_CHARACTERS[normalizedId].textureKey;
}

function createUnicornParts(scene) {
  if (scene.unicornParts) return;

  const maneCount = 4;
  const mane = [];
  for (let i = 0; i < maneCount; i++) {
    const strand = scene.add.image(scene.player.x, scene.player.y, 'unicornManeTex');
    strand.setDepth(506 + i);
    mane.push(strand);
  }

  const leftHoof = scene.add.image(scene.player.x, scene.player.y, 'unicornHoofTex');
  leftHoof.setDepth(498);
  const rightHoof = scene.add.image(scene.player.x, scene.player.y, 'unicornHoofTex');
  rightHoof.setDepth(498);

  const tail = scene.add.image(scene.player.x, scene.player.y, 'unicornTailTex');
  tail.setDepth(499);

  scene.unicornParts = {
    mane,
    leftHoof,
    rightHoof,
    tail
  };
}

function destroyUnicornParts(scene) {
  if (!scene.unicornParts) return;
  const { mane, leftHoof, rightHoof, tail } = scene.unicornParts;
  mane.forEach((strand) => strand?.destroy());
  leftHoof?.destroy();
  rightHoof?.destroy();
  tail?.destroy();
  scene.unicornParts = null;
}

function applyUnicornPartStyles(scene, rainbowMode) {
  if (!scene.unicornParts) return;
  const { mane, leftHoof, rightHoof, tail } = scene.unicornParts;
  const rainbow = [0xff004d, 0xff8a00, 0xfff000, 0x00ff85, 0x00d1ff, 0x7b61ff];

  if (!rainbowMode) {
    mane.forEach((strand, index) => {
      strand.setTint(index % 2 === 0 ? 0xffb3d9 : 0xffd6eb);
    });
    tail.setTint(0xffffff);
    leftHoof.setTint(0xffffff);
    rightHoof.setTint(0xffffff);
    return;
  }

  const base = Math.floor((scene.time.now || 0) / 120);
  mane.forEach((strand, index) => {
    strand.setTint(rainbow[(base + index) % rainbow.length]);
  });
  tail.setTint(rainbow[(base + 1) % rainbow.length]);
  leftHoof.setTint(rainbow[(base + 3) % rainbow.length]);
  rightHoof.setTint(rainbow[(base + 4) % rainbow.length]);
}

function updateUnicornParts(scene) {
  if (scene.playerCharacter !== 'unicorn' || !scene.unicornParts || !scene.player?.active) return;

  const player = scene.player;
  const displayW = player.displayWidth;
  const displayH = player.displayHeight;
  const originX = player.originX;
  const originY = player.originY;
  const left = player.x - displayW * originX;
  const top = player.y - displayH * originY;
  const alpha = player.alpha;

  const { mane, leftHoof, rightHoof, tail } = scene.unicornParts;

  mane.forEach((strand, index) => {
    strand.x = left + displayW * 0.28;
    strand.y = top + displayH * (0.12 + index * 0.09);
    strand.alpha = alpha;
    strand.angle = Math.sin((scene.time.now || 0) * 0.004 + index) * 6;
  });

  leftHoof.x = left + displayW * 0.36;
  leftHoof.y = top + displayH * 0.73;
  leftHoof.alpha = alpha;

  rightHoof.x = left + displayW * 0.64;
  rightHoof.y = top + displayH * 0.73;
  rightHoof.alpha = alpha;

  tail.x = left + displayW * 0.5;
  tail.y = top + displayH * 0.92;
  tail.alpha = alpha;
  tail.angle = Math.sin((scene.time.now || 0) * 0.006) * 10;

  const { combat } = scene.stateSlices;
  applyUnicornPartStyles(scene, !!combat?.rapidFire);
}

function buildMainSceneTextures(gfx, sizes) {
  const { enemySize, bulletW, bulletH, obstacleW, obstacleH, powerUpSize, playerSize } = sizes;

  gfx.fillStyle(0x00ffcc, 1).fillRect(0, 0, playerSize, playerSize).generateTexture('playerTexDefault', playerSize, playerSize).clear();
  // Backward-compat key still used by some tooling/experiments.
  gfx.fillStyle(0x00ffcc, 1).fillRect(0, 0, playerSize, playerSize).generateTexture('playerTex', playerSize, playerSize).clear();

  // Cuboid unicorn variant inspired by the unicorn experiment.
  const unicornW = Math.floor(playerSize * 0.8);
  const unicornH = Math.floor(playerSize * 1.2);
  const unicornHeadW = Math.floor(playerSize * 0.55);
  const unicornHeadH = Math.floor(playerSize * 0.45);
  const unicornTexH = unicornH + unicornHeadH;
  const bodyX = Math.floor((playerSize - unicornW) / 2);
  const bodyY = unicornHeadH;
  const headX = Math.floor((playerSize - unicornHeadW) / 2);
  const headBottomY = unicornHeadH;

  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(bodyX, bodyY, unicornW, unicornH);

  gfx.fillStyle(0xffffff, 1);
  gfx.beginPath();
  gfx.moveTo(headX + Math.floor(unicornHeadW * 0.3), 0);
  gfx.lineTo(headX + Math.floor(unicornHeadW * 0.7), 0);
  gfx.lineTo(headX + unicornHeadW, headBottomY);
  gfx.lineTo(headX, headBottomY);
  gfx.closePath();
  gfx.fillPath();

  gfx.fillStyle(0x000000, 1);
  gfx.fillCircle(headX + Math.floor(unicornHeadW * 0.28), Math.floor(unicornHeadH * 0.5), Math.max(1, Math.floor(playerSize * 0.03)));
  gfx.fillCircle(headX + Math.floor(unicornHeadW * 0.72), Math.floor(unicornHeadH * 0.5), Math.max(1, Math.floor(playerSize * 0.03)));

  gfx.fillStyle(0xffd700, 1);
  gfx.fillTriangle(
    headX + Math.floor(unicornHeadW * 0.5),
    Math.max(0, Math.floor(unicornHeadH * 0.05)),
    headX + Math.floor(unicornHeadW * 0.42),
    Math.floor(unicornHeadH * 0.8),
    headX + Math.floor(unicornHeadW * 0.58),
    Math.floor(unicornHeadH * 0.8)
  );

  gfx.fillStyle(0xffffff, 1);
  gfx.fillTriangle(
    headX + Math.floor(unicornHeadW * 0.22),
    Math.floor(unicornHeadH * 0.25),
    headX + Math.floor(unicornHeadW * 0.1),
    Math.floor(unicornHeadH * 0.75),
    headX + Math.floor(unicornHeadW * 0.3),
    Math.floor(unicornHeadH * 0.75)
  );
  gfx.fillTriangle(
    headX + Math.floor(unicornHeadW * 0.78),
    Math.floor(unicornHeadH * 0.25),
    headX + Math.floor(unicornHeadW * 0.7),
    Math.floor(unicornHeadH * 0.75),
    headX + Math.floor(unicornHeadW * 0.9),
    Math.floor(unicornHeadH * 0.75)
  );

  const footSize = Math.max(3, Math.floor(playerSize * 0.18));
  const footY = bodyY + unicornH - Math.floor(footSize * 0.2);
  gfx.fillTriangle(
    bodyX + Math.floor(unicornW * 0.2),
    footY,
    bodyX + Math.floor(unicornW * 0.1),
    footY + footSize,
    bodyX + Math.floor(unicornW * 0.3),
    footY + footSize
  );
  gfx.fillTriangle(
    bodyX + Math.floor(unicornW * 0.8),
    footY,
    bodyX + Math.floor(unicornW * 0.7),
    footY + footSize,
    bodyX + Math.floor(unicornW * 0.9),
    footY + footSize
  );

  const tailCenterX = bodyX + Math.floor(unicornW * 0.5);
  const tailY = bodyY + unicornH - 2;
  gfx.fillTriangle(
    tailCenterX,
    tailY,
    tailCenterX - Math.floor(playerSize * 0.08),
    tailY + Math.floor(playerSize * 0.18),
    tailCenterX + Math.floor(playerSize * 0.08),
    tailY + Math.floor(playerSize * 0.18)
  );

  gfx.generateTexture('playerTexUnicorn', playerSize, unicornTexH).clear();

  const maneW = Math.max(4, Math.floor(playerSize * 0.12));
  const maneH = Math.max(10, Math.floor(playerSize * 0.26));
  gfx.fillStyle(0xffb3d9, 0.95).fillRect(0, 0, maneW, maneH);
  gfx.generateTexture('unicornManeTex', maneW, maneH).clear();

  const hoofSize = Math.max(4, Math.floor(playerSize * 0.2));
  gfx.fillStyle(0xffffff, 1);
  gfx.fillTriangle(
    Math.floor(hoofSize * 0.5), 0,
    0, hoofSize,
    hoofSize, hoofSize
  );
  gfx.generateTexture('unicornHoofTex', hoofSize, hoofSize).clear();

  const tailW = Math.max(4, Math.floor(playerSize * 0.18));
  const tailH = Math.max(10, Math.floor(playerSize * 0.34));
  gfx.fillStyle(0xffffff, 1).fillRect(0, 0, tailW, tailH);
  gfx.generateTexture('unicornTailTex', tailW, tailH).clear();

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
  const savedCharacter = loadGameData().settings?.character;
  const initialCharacter = normalizeCharacterId(savedCharacter);
  const initialTexture = getPlayerTextureForCharacter(initialCharacter);

  playerState.lane = 2;
  scene.playerCharacter = initialCharacter;
  scene.player = scene.add.image(scene._laneX(playerState.lane), gameState.PLAYER_Y, initialTexture);
  scene.player.w = sizes.playerSize;
  scene.player.h = sizes.playerSize;
  scene.player.setDepth(500);

  scene.setPlayerCharacter = (characterId = 'default') => {
    const normalized = normalizeCharacterId(characterId);
    scene.playerCharacter = normalized;
    if (scene.player?.active) {
      scene.player.setTexture(getPlayerTextureForCharacter(normalized));
      scene.player.setOrigin(0.5, normalized === 'unicorn' ? 0.7 : 0.5);
    }
    if (normalized === 'unicorn') {
      createUnicornParts(scene);
    } else {
      destroyUnicornParts(scene);
    }
    return normalized;
  };
  scene.setPlayerCharacter(initialCharacter);
  scene.updatePlayerCharacterCosmetics = () => {
    updateUnicornParts(scene);
  };

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
  combat.rapidFireFromShield = false;
  combat.offScreenTimer = 0;
  combat.score = 0;
  combat.beats = 0;
  combat.combo = 1;
  combat.ammo = 100;
  combat.shield = 0;

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
  scene.keys = scene.input.keyboard.addKeys(`LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,G,C,ONE,TWO,THREE,FOUR,FIVE,SIX,ESC,${MAIN_SCENE_TUNING.debug.toggleKey}`);

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
  createResourceBarSystem(this);
  wireSceneUiAndDebug(this);
}
