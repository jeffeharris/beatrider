import * as Tone from 'tone';
import { gameState, LANES, BULLET_SPEED, FIRE_COOLDOWN, HORIZONTAL_SHOOTING, ARC_SHOT_BASE_SAFE_DISTANCE, ARC_SHOT_HEIGHT_BONUS, ARC_SHOT_MAX_JUMP_HEIGHT, pulsePatternPool, sectionPatternMap } from '../../config.js';
import { currentBar, getSection } from '../../audio/music-engine.js';
import { currentDifficulty, DIFFICULTY_PRESETS } from '../../audio/music-ui.js';
import { gameSounds, getGameNote } from '../../audio/game-sounds.js';
import {
  projectY, getVanishY, getVanishX, unprojectProgress,
  laneOffsetFactor, depthForProgress, PLAYER_PROGRESS
} from './perspective.js';

export function pulseGridSystem() {
  this.pulseActive = true;
  this.pulseTimer = 150;
  this.pulsePhase = 0;

  if (currentDifficulty === DIFFICULTY_PRESETS.chaos) {
    this.pulseType = Math.floor(Math.random() * 3);
  } else {
    const section = getSection(currentBar);
    const patternType = sectionPatternMap[section] || 'gentle';
    const patterns = pulsePatternPool[patternType];
    const patternIndex = Math.floor(currentBar / 8) % patterns.length;
    const pattern = patterns[patternIndex];

    const hitsPerBar = 2;
    const totalHits = currentBar * hitsPerBar;
    const positionInPattern = totalHits % pattern.length;
    const direction = pattern[positionInPattern];

    if (direction === -1) {
      this.pulseActive = false;
      return;
    }

    if (!this.lastTwoDirections) this.lastTwoDirections = [];
    if (direction === 0 && this.lastTwoDirections.length >= 2 &&
        this.lastTwoDirections[0] === 0 && this.lastTwoDirections[1] === 0) {
      this.pulseType = Math.random() > 0.5 ? 1 : 2;
    } else {
      this.pulseType = direction;
    }

    this.lastTwoDirections.unshift(this.pulseType);
    if (this.lastTwoDirections.length > 2) {
      this.lastTwoDirections.pop();
    }
  }
}

/** X of a point on the grid floor, given its X at the player's row and a depth. */
function laneEdgeX(bottomX, t) {
  return this.vanishX + (bottomX - this.vanishX) * laneOffsetFactor(t);
}

export function drawPerspectiveGridSystem() {
  if (!this.gridGraphics) {
    this.gridGraphics = this.add.graphics();
    this.gridOffset = 0;
  }

  // vanishX/vanishY are owned by updatePerspectiveZoom, which runs earlier in the
  // frame - reading them here keeps the grid on the same lean as the entities.
  this.vanishX = getVanishX(this.cameras.main.scrollX);
  this.vanishY = getVanishY();

  if (!this.gridGraphics.scene) {
    this.gridGraphics = this.add.graphics();
  }

  if (!this.gridGraphics || !this.gridGraphics.scene) {
    this.gridGraphics = this.add.graphics();
  }

  this.gridGraphics.clear();
  const numLines = 12;

  for (let lane = 0; lane <= LANES; lane++) {
    const bottomX = lane * gameState.LANE_W;
    this.gridGraphics.lineStyle(1, 0x00ff00, 0.2);

    let lastX = this.vanishX;
    let lastY = this.vanishY;

    for (let t = 0.1; t <= 1; t += 0.1) {
      const y = projectY(t);
      const x = laneEdgeX.call(this, bottomX, t);
      this.gridGraphics.lineBetween(lastX, lastY, x, y);
      lastX = x;
      lastY = y;
    }
    this.gridGraphics.lineBetween(lastX, lastY, laneEdgeX.call(this, bottomX, 1), projectY(1));
  }

  for (let i = 0; i < numLines; i++) {
    const t = (i + this.gridOffset % 1) / numLines;
    const y = projectY(t);
    if (y < this.vanishY || y > gameState.HEIGHT) continue;

    // Span exactly the lane field at this depth, using the same projection the
    // lane lines use - otherwise the rungs drift off the verticals as the
    // vanishing point leans, and the grid stops reading as one surface.
    const alpha = 0.3 - t * 0.2;
    this.gridGraphics.lineStyle(2, 0x00ff00, alpha);
    this.gridGraphics.lineBetween(
      laneEdgeX.call(this, 0, t), y,
      laneEdgeX.call(this, gameState.WIDTH, t), y
    );
  }
}

export function fireSystem() {
  const { player, flow, combat } = this.stateSlices;
  if (!flow.playerCanControl || player.moving) return;

  const lane = player.lane;
  const isOffScreen = lane < 0 || lane >= LANES;
  if (!HORIZONTAL_SHOOTING && isOffScreen) return;

  if (HORIZONTAL_SHOOTING && isOffScreen) {
    if (this.offScreenTurnDelay > 0) return;
  }

  const now = this.time.now;
  if (this.fireBlockTime && now < this.fireBlockTime) return;

  const cooldown = (combat.rapidFire ? FIRE_COOLDOWN / 3 : FIRE_COOLDOWN) * currentDifficulty.fireMult;
  if (now - this.lastShotAt < cooldown) return;
  this.lastShotAt = now;

  this.wobbleVelocity.y = 3;
  if (!player.jumping) {
    this.tweens.add({
      targets: this.player,
      scaleX: 0.9,
      scaleY: 1.1,
      duration: 50,
      ease: 'Power1',
      yoyo: true
    });
  }

  const b = this.add.image(this.player.x, this.player.y, 'bulletTex');
  b.lane = lane;
  b.setDepth(depthForProgress(PLAYER_PROGRESS));

  let bulletColor = 0xffffff;
  switch (combat.combo) {
    case 1: bulletColor = 0xffffff; break;
    case 2: bulletColor = 0xccffcc; break;
    case 3: bulletColor = 0x00ff00; break;
    case 4: bulletColor = 0x00ff88; break;
    case 5: bulletColor = 0x00ffff; break;
    case 6: bulletColor = 0x88ccff; break;
    case 7: bulletColor = 0xcc88ff; break;
    case 8:
    default: bulletColor = 0xff00ff; break;
  }

  if (player.jumping) {
    const jumpHeight = Math.max(0, this.groundY - this.player.y);
    const heightPercent = Math.min(1, jumpHeight / 200);
    if (heightPercent > 0.5) {
      const r = Math.min(255, ((bulletColor >> 16) & 0xFF) + 30);
      const g = Math.min(255, ((bulletColor >> 8) & 0xFF) + 30);
      const bb = Math.min(255, (bulletColor & 0xFF) + 30);
      bulletColor = (r << 16) | (g << 8) | bb;
    }
  }
  b.setTint(bulletColor);

  b.lastX = this.player.x;
  b.lastY = this.player.y;
  b.rotationSpeed = combat.combo >= 6 ? 0.3 : 0;

  // Depth is derived from the player's screen Y through the live curve, so shots
  // fired mid-zoom still spawn at the right distance.
  b.progress = unprojectProgress(this.player.y);

  if (HORIZONTAL_SHOOTING && isOffScreen) {
    const direction = lane < 0 ? 1 : -1;
    b.vx = direction * BULLET_SPEED * 1.2;
    b.vy = 0;
    b.isHorizontal = true;
    b.startLane = lane;
    b.currentLane = lane < 0 ? -0.5 : 4.5;
    b.w = Math.floor(12 * gameState.MOBILE_SCALE);
    b.h = Math.floor(6 * gameState.MOBILE_SCALE);
    b.setRotation(direction > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else {
    b.vy = -BULLET_SPEED;
    b.isHorizontal = false;
  }

  b.w = b.w || Math.floor(6 * gameState.MOBILE_SCALE);
  b.h = b.h || Math.floor(12 * gameState.MOBILE_SCALE);

  if (player.jumping && !isOffScreen) {
    b.isArcShot = true;
    const jumpHeight = Math.abs(this.player.y - gameState.PLAYER_Y);
    const jumpPercent = Math.min(jumpHeight / ARC_SHOT_MAX_JUMP_HEIGHT, 1);
    b.safeDistance = ARC_SHOT_BASE_SAFE_DISTANCE + (jumpPercent * ARC_SHOT_HEIGHT_BONUS);
    b.startY = this.player.y;
    b.progress = 1.0;
    b.arcDistance = 0;
  }

  if (combat.rapidFire) {
    b.vy *= 1.5;
    if (Math.random() < 0.3) {
      try {
        const note = getGameNote(lane) + '6';
        const sound = gameSounds.laserSounds[gameSounds.currentLaserSound];
        if (sound.triggerAttackRelease) {
          sound.triggerAttackRelease(note, '32n', Tone.now() + 0.01);
        } else if (sound.triggerAttack) {
          sound.triggerAttack(note, Tone.now() + 0.01);
        }
      } catch (e) {}
    }
  } else {
    try {
      const note = getGameNote(lane) + '5';
      const sound = gameSounds.laserSounds[gameSounds.currentLaserSound];
      if (gameSounds.currentLaserSound === 2) {
        const chordNotes = [note, getGameNote(lane + 2) + '5', getGameNote(lane + 4) + '5'];
        sound.triggerAttackRelease(chordNotes, '32n', Tone.now() + 0.01);
      } else if (gameSounds.currentLaserSound === 4) {
        sound.triggerAttack(note, Tone.now() + 0.01);
      } else if (gameSounds.currentLaserSound === 5) {
        const highNote = getGameNote(lane) + '6';
        const lowNote = getGameNote(lane) + '3';
        sound.triggerAttackRelease(highNote, '16n', Tone.now());
        sound.frequency.exponentialRampToValueAtTime(
          Tone.Frequency(lowNote).toFrequency(),
          Tone.now() + 0.15
        );
      } else {
        sound.triggerAttackRelease(note, '32n', Tone.now() + 0.01);
      }
    } catch (e) {}
  }

  this.bullets.push(b);
}
