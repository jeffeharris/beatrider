import Phaser from 'phaser';
import { gameState } from '../../config.js';
import { HUD_DEPTH, PERSPECTIVE_EXPONENT, PERSPECTIVE_VANISH_RATIO } from '../../tuning.js';
import {
  stepZoom,
  easeZoom,
  followTargetX,
  followTowards,
  computeZoomFrame
} from './perspective-zoom.js';

// Two cameras: the main camera draws the world and zooms; the HUD camera draws
// screen-space UI and never moves. Which camera draws an object is decided by
// its depth (HUD_DEPTH and up is UI), re-sorted just before every render, so
// UI created anywhere - pause, game over, tutorial - lands on the right camera
// without registering itself.
//
// All zoom state lives on the scene, so a restart always starts unzoomed.
export function setupPerspectiveCameraSystem(scene) {
  scene.zoomT = 0;
  scene.zoomEngaged = false;
  scene.zoomFollowX = gameState.WIDTH / 2;
  scene.vanishX = gameState.WIDTH / 2;
  scene.vanishY = gameState.HEIGHT * PERSPECTIVE_VANISH_RATIO;
  scene.perspectiveExponent = PERSPECTIVE_EXPONENT;

  scene.hudCamera = scene.cameras.add(0, 0, gameState.WIDTH, gameState.HEIGHT);
  scene.hudCamera.setName('hud');

  const route = () => routeObjectsToCameras(scene);
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, route);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, route);
  });
}

function routeObjectsToCameras(scene) {
  const worldCam = scene.cameras.main;
  const hudCam = scene.hudCamera;
  if (!worldCam || !hudCam) return;
  for (const obj of scene.children.list) {
    // cameraFilter is the set of cameras that skip the object.
    obj.cameraFilter = obj.depth >= HUD_DEPTH ? worldCam.id : hudCam.id;
  }
}

/**
 * Advance the zoom and apply this frame's camera and projection. Runs before
 * anything projects, so every entity in a frame uses the same parameters.
 * Follows the rapid-fire boolean rather than a schedule: chained power-ups
 * refresh the timer, so the zoom holds for as long as the buff does.
 */
export function updatePerspectiveCameraSystem(dt) {
  const { combat, flow } = this.stateSlices;
  const wantNear = combat.rapidFire && !flow.gameOver;

  // Punch on the rising edge only, so a chained pickup doesn't re-shake.
  if (wantNear && !this.zoomEngaged) {
    this.cameras.main.shake(300, 0.01);
    this.cameras.main.flash(200, 0, 170, 80);
  }
  this.zoomEngaged = wantNear;

  this.zoomT = stepZoom(this.zoomT, dt, wantNear);
  const ease = easeZoom(this.zoomT);
  this.zoomFollowX = followTowards(
    this.zoomFollowX,
    followTargetX(gameState.WIDTH, this.player.x, ease),
    dt
  );
  applyZoomFrame(this, ease);
}

export function resizePerspectiveCameraSystem() {
  if (this.hudCamera) this.hudCamera.setSize(gameState.WIDTH, gameState.HEIGHT);
  applyZoomFrame(this, easeZoom(this.zoomT ?? 0));
}

function applyZoomFrame(scene, ease) {
  const { WIDTH, HEIGHT, PLAYER_Y } = gameState;
  const frame = computeZoomFrame({
    ease,
    width: WIDTH,
    height: HEIGHT,
    playerY: PLAYER_Y,
    followX: scene.zoomFollowX ?? WIDTH / 2
  });

  // Phaser zooms about the camera's centre, so convert the visible rectangle's
  // top-left into the scroll that produces it.
  const cam = scene.cameras.main;
  cam.setZoom(frame.zoom);
  cam.setScroll(
    frame.viewLeft - (WIDTH - WIDTH / frame.zoom) / 2,
    frame.viewTop - (HEIGHT - HEIGHT / frame.zoom) / 2
  );

  scene.vanishX = frame.vanishX;
  scene.vanishY = frame.vanishY;
  scene.perspectiveExponent = frame.exponent;
}
