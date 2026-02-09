import * as Tone from 'tone';
import { gameState, LANES, PLAYER_CONFIG } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';

function restoreJumpIfNeeded(scene, player) {
  if (!player.jumping) return;

  scene.tweens.add({
    targets: scene.player,
    y: gameState.PLAYER_Y,
    duration: 250,
    ease: 'Quad.easeIn',
    onComplete: () => {
      player.jumping = false;
      scene.player.y = gameState.PLAYER_Y;

      if (Math.abs(scene.player.angle % 360) > 1) {
        scene.tweens.add({
          targets: scene.player,
          angle: 0,
          duration: 200,
          ease: 'Cubic.easeOut'
        });
      } else {
        scene.player.angle = 0;
      }
    }
  });
}

function playDashSound() {
  try {
    const now = Tone.now();
    gameSounds.move.triggerAttackRelease('C4', '32n', now);
    gameSounds.move.triggerAttackRelease('G3', '32n', now + 0.02);
    gameSounds.offScreenWomp.triggerAttackRelease('C3', '32n', now);
  } catch (e) {}
}

function updateOffscreenDashState(scene, player, combat, startLane) {
  if (player.lane < 0 || player.lane >= LANES) {
    const laneNow = player.lane;
    const isDashingFromEdge = (startLane === 0 && laneNow < 0) ||
      (startLane === LANES - 1 && laneNow >= LANES);

    combat.offScreenTimer = isDashingFromEdge
      ? PLAYER_CONFIG.offScreen.gracePeriod + 400
      : PLAYER_CONFIG.offScreen.gracePeriod;

    scene.player.setAlpha(PLAYER_CONFIG.offScreen.alpha);

    if (isDashingFromEdge) {
      scene.offScreenTurnDelay = combat.rapidFire ? 910 : 870;
    } else {
      scene.offScreenTurnDelay = 580;
    }

    scene.offScreenShotCount = 0;
  } else {
    scene.player.setAlpha(1);
  }
}

function runDash(scene, laneDelta) {
  const { player, combat } = scene.stateSlices;

  if (player.dashing) return;
  if (player.lane < 0 || player.lane >= LANES) return;

  const startLane = player.lane;
  const unclampedTargetLane = startLane + laneDelta;
  const targetLane = Math.max(-1, Math.min(LANES, unclampedTargetLane));

  player.dashing = true;
  player.moving = true;
  scene.isDashStarting = true;

  scene.tweens.killTweensOf(scene.player);
  restoreJumpIfNeeded(scene, player);

  const startX = scene._laneX(startLane);
  if (!player.jumping) {
    scene.player.x = startX;
  }

  scene.player.setScale(1, 1);
  scene.player.angle = 0;

  const trail1 = scene.add.image(startX, scene.player.y, 'playerTex');
  trail1.setAlpha(0.5);
  trail1.setTint(0x00ffff);

  const trail2 = scene.add.image(startX, scene.player.y, 'playerTex');
  trail2.setAlpha(0.3);
  trail2.setTint(0x00ffff);

  playDashSound();

  player.lane = targetLane;
  updateOffscreenDashState(scene, player, combat, startLane);

  const targetX = scene._laneX(targetLane);

  scene.checkDashCollision();
  scene.player.x = startX;

  scene.tweens.add({
    targets: [scene.player, trail1, trail2],
    x: targetX,
    duration: PLAYER_CONFIG.dash.duration,
    ease: 'Power2',
    onComplete: () => {
      player.moving = false;
      player.dashing = false;
      scene.isDashStarting = false;

      scene.player.x = scene._laneX(player.lane);
      scene.checkDashCollision();

      scene.tweens.add({
        targets: scene.player,
        scaleX: [0.7, 1.2, 1],
        scaleY: [1.3, 0.9, 1],
        duration: 120,
        ease: 'Sine.easeInOut'
      });
    }
  });

  scene.tweens.add({
    targets: trail1,
    alpha: 0,
    duration: 200,
    delay: 50,
    onComplete: () => trail1.destroy()
  });

  scene.tweens.add({
    targets: trail2,
    alpha: 0,
    duration: 200,
    delay: 100,
    onComplete: () => trail2.destroy()
  });
}

export function dashLeftSystem() {
  runDash(this, -2);
}

export function dashRightSystem() {
  runDash(this, 2);
}

export function checkDashCollisionSystem() {
  const { player, flow } = this.stateSlices;
  // Check collision with obstacles during dash - using progress-based 3D collision
  for(let o of this.obstacles) {
    if(
      o.progress > 0.94 &&
      o.progress < 0.97 &&
      o.lane === player.lane &&
      !player.jumping &&
      !flow.invincible
    ) {
      // Set invincible immediately to prevent multiple deaths
      flow.invincible = true;

      // Hit obstacle during dash - game over
      this.cameras.main.shake(500, 0.03);
      this.player.setTint(0xff0000);

      // Player death sound - same as regular collision
      try {
        const now = Tone.now();
        gameSounds.obstacleHit.triggerAttackRelease('G2', '16n', now);
        gameSounds.obstacleHit.triggerAttackRelease('D2', '16n', now + 0.05);
        gameSounds.obstacleHit.triggerAttackRelease('G1', '16n', now + 0.1);
        gameSounds.explosion.triggerAttackRelease('8n', now + 0.02);
      } catch(e) {}

      // Show game over screen
      this.showGameOverScreen();
      break;
    }
  }
}
