import { gameState, isMobile, PLAYER_CONFIG, MAIN_SCENE_TUNING } from '../../config.js';
import { DEFAULT_CHARACTER_ID, loadGameData, sessionHighScore } from '../../storage.js';
import { uiState, updateGridButton } from '../../audio/music-ui.js';
import { setupDebugToolsSystem } from './debug-tools.js';
import { depthForProgress, PLAYER_PROGRESS } from './perspective.js';
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
  unicorn: {
    textureKey: 'playerTexUnicorn'
  },
  classic: {
    textureKey: 'playerTexClassic'
  }
};

// Anything unrecognised - including the retired 'default' id from before the unicorn
// was promoted - falls back to the main character.
function normalizeCharacterId(characterId) {
  return PLAYER_CHARACTERS[characterId] ? characterId : DEFAULT_CHARACTER_ID;
}

function getPlayerTextureForCharacter(characterId) {
  const normalizedId = normalizeCharacterId(characterId);
  return PLAYER_CHARACTERS[normalizedId].textureKey;
}

function createUnicornParts(scene) {
  if (scene.unicornParts) return;

  // The rig was authored around the ship's old fixed depth of 500. Offsets keep
  // the parts glued to it now that the ship sits at its true depth on the track.
  const body = depthForProgress(PLAYER_PROGRESS);

  const head = scene.add.image(scene.player.x, scene.player.y, 'unicornHeadTex');
  head.setDepth(body + 1);
  const horn = scene.add.image(scene.player.x, scene.player.y, 'unicornHornTex');
  horn.setDepth(body + 10);
  const leftEar = scene.add.image(scene.player.x, scene.player.y, 'unicornEarTex');
  leftEar.setDepth(body + 3);
  const rightEar = scene.add.image(scene.player.x, scene.player.y, 'unicornEarTex');
  rightEar.setDepth(body + 3);

  const maneCount = 4;
  const mane = [];
  for (let i = 0; i < maneCount; i++) {
    const strand = scene.add.image(scene.player.x, scene.player.y, 'unicornManeTex');
    strand.setDepth(body + 6 + i);
    mane.push(strand);
  }

  const leftHoof = scene.add.image(scene.player.x, scene.player.y, 'unicornHoofTex');
  leftHoof.setDepth(body - 2);
  const rightHoof = scene.add.image(scene.player.x, scene.player.y, 'unicornHoofTex');
  rightHoof.setDepth(body - 2);

  const tail = scene.add.image(scene.player.x, scene.player.y, 'unicornTailTex');
  tail.setDepth(body - 1);

  scene.unicornParts = {
    head,
    horn,
    leftEar,
    rightEar,
    mane,
    leftHoof,
    rightHoof,
    tail
  };

  scene.unicornRig = {
    damping: 0.9,
    elasticTight: 0.4,
    elasticLoose: 0.15,
    head: { x: 0, y: 0 },
    tail: { x: 0, y: 0 },
    leftHoof: { x: 0, y: 0 },
    rightHoof: { x: 0, y: 0 },
    mane: mane.map(() => ({ x: 0, y: 0 }))
  };
}

function destroyUnicornParts(scene) {
  if (!scene.unicornParts) return;
  const {
    head,
    horn,
    leftEar,
    rightEar,
    mane,
    leftHoof,
    rightHoof,
    tail
  } = scene.unicornParts;
  head?.destroy();
  horn?.destroy();
  leftEar?.destroy();
  rightEar?.destroy();
  mane.forEach((strand) => strand?.destroy());
  leftHoof?.destroy();
  rightHoof?.destroy();
  tail?.destroy();
  scene.unicornParts = null;
  scene.unicornRig = null;
}

function applyUnicornPartStyles(scene, rainbowMode) {
  if (!scene.unicornParts) return;
  const { horn, leftEar, rightEar, mane, leftHoof, rightHoof, tail } = scene.unicornParts;
  const rainbow = [0xff004d, 0xff8a00, 0xfff000, 0x00ff85, 0x00d1ff, 0x7b61ff];

  if (!rainbowMode) {
    horn.setTint(0xffd700);
    leftEar.clearTint();
    rightEar.clearTint();
    mane.forEach((strand, index) => {
      strand.setTint(index % 2 === 0 ? 0xffb3d9 : 0xffd6eb);
    });
    tail.setTint(0xffffff);
    leftHoof.setTint(0xffffff);
    rightHoof.setTint(0xffffff);
    return;
  }

  const base = Math.floor((scene.time.now || 0) / 120);
  horn.setTint(rainbow[base % rainbow.length]);
  leftEar.setTint(0xffffcc);
  rightEar.setTint(0xffffcc);
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
  const alpha = player.alpha;

  const { head, horn, leftEar, rightEar, mane, leftHoof, rightHoof, tail } = scene.unicornParts;
  const rig = scene.unicornRig;
  const now = scene.time.now || 0;

  const springAttach = (part, velocity, targetX, targetY, {
    elastic = 0.2,
    maxForce = 1.5,
    leash = 14
  } = {}) => {
    velocity.x *= rig.damping;
    velocity.y *= rig.damping;

    const dx = targetX - part.x;
    const dy = targetY - part.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > leash && dist > 0.0001) {
      const ratio = leash / dist;
      part.x = targetX - dx * ratio;
      part.y = targetY - dy * ratio;
      velocity.x *= 0.5;
      velocity.y *= 0.5;
    } else {
      let forceX = dx * elastic;
      let forceY = dy * elastic;
      forceX = Math.max(-maxForce, Math.min(maxForce, forceX));
      forceY = Math.max(-maxForce, Math.min(maxForce, forceY));
      velocity.x += forceX;
      velocity.y += forceY;
      part.x += velocity.x;
      part.y += velocity.y;
    }
  };

  const bodyCenterX = player.x;
  const movingFactor = player.moving || player.dashing ? 1 : 0;

  // Floating head: tighter spring/leash.
  const headTargetX = bodyCenterX;
  const headTargetY = player.y - displayH * 0.7;
  springAttach(head, rig.head, headTargetX, headTargetY, {
    elastic: rig.elasticTight,
    maxForce: 2,
    leash: 10
  });
  head.x += Math.cos(now * 0.0015) * 0.5;
  head.y += Math.sin(now * 0.002) * 0.8;
  head.angle = Math.sin(now * 0.001) * 2;

  horn.x = head.x;
  horn.y = head.y;
  horn.angle = head.angle * 0.3;

  leftEar.x = head.x - displayW * 0.225;
  leftEar.y = head.y + displayH * 0.15;
  rightEar.x = head.x + displayW * 0.225;
  rightEar.y = head.y + displayH * 0.15;
  leftEar.angle = head.angle * 0.5 - 10;
  rightEar.angle = head.angle * 0.5 + 10;

  // Tail: looser spring, swings opposite movement.
  const tailTargetX = bodyCenterX;
  const tailTargetY = player.y + displayH * 0.5;
  rig.tail.x += ((scene.wobbleVelocity?.x || 0) * -0.02);
  rig.tail.y += ((scene.wobbleVelocity?.y || 0) * 0.02);
  springAttach(tail, rig.tail, tailTargetX, tailTargetY, {
    elastic: rig.elasticLoose,
    maxForce: 1.4,
    leash: 18
  });
  tail.angle = Math.sin(now * 0.006) * 8 + (player.moving ? Math.sin(now * 0.018) * 10 : 0);

  // Front hooves: loose spring with gallop phase while moving.
  const gallop = Math.sin(now * 0.012);
  const leftHoofTargetX = player.x - displayW * 0.4;
  const rightHoofTargetX = player.x + displayW * 0.4;
  const hoofBaseY = player.y - displayH * 0.4;
  const leftHoofTargetY = hoofBaseY + (movingFactor ? gallop * 4 : Math.sin(now * 0.003) * 1.5);
  const rightHoofTargetY = hoofBaseY + (movingFactor ? -gallop * 4 : Math.sin(now * 0.003 + Math.PI / 2) * 1.5);

  springAttach(leftHoof, rig.leftHoof, leftHoofTargetX, leftHoofTargetY, {
    elastic: rig.elasticLoose,
    maxForce: 1.6,
    leash: 14
  });
  springAttach(rightHoof, rig.rightHoof, rightHoofTargetX, rightHoofTargetY, {
    elastic: rig.elasticLoose,
    maxForce: 1.6,
    leash: 14
  });
  leftHoof.angle = movingFactor ? gallop * 10 : Math.sin(now * 0.002) * 4;
  rightHoof.angle = movingFactor ? -gallop * 10 : Math.sin(now * 0.002 + Math.PI / 2) * 4;

  // Mane: chained spring from head/back region.
  mane.forEach((strand, index) => {
    const prev = index === 0 ? null : mane[index - 1];
    const anchorX = prev ? prev.x - displayW * 0.01 : head.x - displayW * 0.05;
    const anchorY = prev ? prev.y + displayH * 0.08 : head.y + displayH * 0.05;
    springAttach(strand, rig.mane[index], anchorX, anchorY, {
      elastic: rig.elasticTight,
      maxForce: 1.8,
      leash: 10
    });
    strand.angle = Math.sin(now * 0.005 + index * 0.8) * (4 + index);
  });

  [head, horn, leftEar, rightEar, tail, leftHoof, rightHoof, ...mane].forEach((part) => {
    part.alpha = alpha;
  });

  const { combat } = scene.stateSlices;
  applyUnicornPartStyles(scene, !!combat?.rapidFire);
}

function buildMainSceneTextures(gfx, sizes) {
  const { enemySize, bulletW, bulletH, obstacleW, obstacleH, powerUpSize, playerSize } = sizes;

  gfx.fillStyle(0x00ffcc, 1).fillRect(0, 0, playerSize, playerSize).generateTexture('playerTexClassic', playerSize, playerSize).clear();
  // Backward-compat key still used by some tooling/experiments.
  gfx.fillStyle(0x00ffcc, 1).fillRect(0, 0, playerSize, playerSize).generateTexture('playerTex', playerSize, playerSize).clear();

  // Unicorn body-only texture; face/ears/horn/hooves/tail are separate attached parts.
  const unicornBodyW = Math.max(8, Math.floor(playerSize * 0.8));
  const unicornBodyH = Math.max(10, Math.floor(playerSize * 1.2));
  gfx.fillStyle(0xffffff, 1).fillRect(0, 0, unicornBodyW, unicornBodyH);
  gfx.generateTexture('playerTexUnicorn', unicornBodyW, unicornBodyH).clear();

  const maneW = Math.max(4, Math.floor(playerSize * 0.12));
  const maneH = Math.max(10, Math.floor(playerSize * 0.26));
  gfx.fillStyle(0xffb3d9, 0.95).fillRect(0, 0, maneW, maneH);
  gfx.generateTexture('unicornManeTex', maneW, maneH).clear();

  const floatingHeadW = Math.max(8, Math.floor(playerSize * 0.55));
  const floatingHeadH = Math.max(8, Math.floor(playerSize * 0.45));
  gfx.fillStyle(0xffffff, 1);
  gfx.beginPath();
  gfx.moveTo(Math.floor(floatingHeadW * 0.3), 0);
  gfx.lineTo(Math.floor(floatingHeadW * 0.7), 0);
  gfx.lineTo(floatingHeadW, floatingHeadH);
  gfx.lineTo(0, floatingHeadH);
  gfx.closePath();
  gfx.fillPath();
  gfx.fillStyle(0x000000, 1);
  gfx.fillCircle(Math.floor(floatingHeadW * 0.3), Math.floor(floatingHeadH * 0.45), Math.max(1, Math.floor(playerSize * 0.03)));
  gfx.fillCircle(Math.floor(floatingHeadW * 0.7), Math.floor(floatingHeadH * 0.45), Math.max(1, Math.floor(playerSize * 0.03)));
  gfx.generateTexture('unicornHeadTex', floatingHeadW, floatingHeadH).clear();

  const hornW = Math.max(4, Math.floor(playerSize * 0.15));
  const hornH = Math.max(8, Math.floor(playerSize * 0.35));
  gfx.fillStyle(0xffffff, 1);
  gfx.fillTriangle(Math.floor(hornW * 0.5), 0, 0, hornH, hornW, hornH);
  gfx.generateTexture('unicornHornTex', hornW, hornH).clear();

  const earW = Math.max(4, Math.floor(playerSize * 0.14));
  const earH = Math.max(6, Math.floor(playerSize * 0.2));
  gfx.fillStyle(0xffffff, 1);
  gfx.fillTriangle(Math.floor(earW * 0.5), 0, 0, earH, earW, earH);
  gfx.generateTexture('unicornEarTex', earW, earH).clear();

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
  // The ship's own place on the depth axis: anything nearer draws over it.
  scene.player.setDepth(depthForProgress(PLAYER_PROGRESS));

  scene.setPlayerCharacter = (characterId = DEFAULT_CHARACTER_ID) => {
    const normalized = normalizeCharacterId(characterId);
    scene.playerCharacter = normalized;
    if (scene.player?.active) {
      scene.player.setTexture(getPlayerTextureForCharacter(normalized));
      scene.player.setOrigin(0.5, 0.5);
    }
    if (normalized === 'unicorn') {
      createUnicornParts(scene);
      updateUnicornParts(scene);
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

  // Above the player so large sprites never cover the readout - at the near
  // perspective they reach the bottom corners where the score sits. Scroll
  // factor 0 keeps them put while the follow camera pans.
  for (const el of [
    scene.highScoreLabel, scene.highScoreText,
    scene.scoreLabel, scene.scoreText,
    scene.comboText, scene.comboMeterBg, scene.comboMeter
  ]) {
    el.setDepth(9000);
    el.setScrollFactor(0);
  }
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
