import * as Tone from 'tone';
import { sessionHighScore } from '../../storage.js';
import { showMenu } from '../../ui/menus.js';
import {
  MENU,
  applyPauseTransition,
  applyResumeTransition,
  applyOpenSettingsTransition,
  applyCloseSettingsTransition,
  shouldMusicPlay
} from './state-transitions.js';

// The Main scene's side of the menus: freezing and thawing the run, starting and
// stopping the music, and telling ui/menus.js which screen to show. Which menu is
// open is decided by the pure transitions in state-transitions.js.

function freezeGameplay(scene) {
  scene.pauseStartTime = scene.time.now;
  scene.tweens.pauseAll();
  scene.stateSlices.input.touchFiring = false;

  // The menus own the keyboard while open; without this Phaser keeps swallowing
  // arrows and space, so selects and buttons can't be driven from the keyboard.
  scene.input.keyboard.enabled = false;
  scene.input.keyboard.disableGlobalCapture();
}

function thawGameplay(scene) {
  if (scene.pauseStartTime) {
    const pauseDuration = scene.time.now - scene.pauseStartTime;
    scene.gameStartTime += pauseDuration;

    if (scene.adaptiveState.isAssisting && scene.adaptiveState.assistStartTime) {
      scene.adaptiveState.assistStartTime += pauseDuration;
    }
    scene.pauseStartTime = null;
  }

  scene.tweens.resumeAll();

  scene.input.keyboard.enabled = true;
  scene.input.keyboard.enableGlobalCapture();
  scene.input.keyboard.resetKeys();
  // Swallow the tap or key that closed the menu so it doesn't also fire a shot.
  scene.fireBlockTime = scene.time.now + 100;
}

function resumeTransport() {
  if (Tone.Transport.state !== 'paused') return;

  // An interruption (phone call, Siri, alarm) or a spell in the background can
  // leave the AudioContext suspended, and starting the Transport on a suspended
  // context resumes the game silently — visuals running, no sound. Resume the
  // context first in that case, then start the Transport once it is actually
  // running. The common path is untouched and stays synchronous.
  if (Tone.context.state === 'suspended') {
    Tone.context.resume()
      .then(() => {
        if (Tone.Transport.state === 'paused') Tone.Transport.start();
      })
      .catch(() => {
        // Nothing more we can do from JS; the native session handles its half
        // (see configureAudioSession in ios/App/App/AppDelegate.swift).
      });
  } else {
    Tone.Transport.start();
  }
}

// Bring the music, blur and DOM menus in line with flow after any menu transition.
function syncMenuPresentation(scene, { wasPaused }) {
  const { flow, combat } = scene.stateSlices;

  if (flow.paused && !wasPaused) freezeGameplay(scene);
  if (!flow.paused && wasPaused) thawGameplay(scene);

  if (shouldMusicPlay(flow)) {
    resumeTransport();
  } else if (Tone.Transport.state === 'started') {
    Tone.Transport.pause();
  }

  // Blur only behind the pause menu; settings over a run keeps the beat pulses visible.
  if (flow.menu === MENU.PAUSE) {
    scene.cameras.main.setPostPipeline('Blur');
  } else {
    scene.cameras.main.resetPostPipeline();
  }

  showMenu(flow.menu, {
    score: combat.score,
    highScore: sessionHighScore,
    overGame: flow.settingsReturnTo === MENU.NONE
  });
}

function runMenuTransition(scene, transition) {
  const { flow } = scene.stateSlices;
  const wasPaused = flow.paused;
  if (!transition(flow)) return false;
  syncMenuPresentation(scene, { wasPaused });
  return true;
}

export function pauseGameSystem() {
  return runMenuTransition(this, applyPauseTransition);
}

export function resumeGameSystem() {
  return runMenuTransition(this, applyResumeTransition);
}

export function openSettingsSystem() {
  return runMenuTransition(this, applyOpenSettingsTransition);
}

export function closeSettingsSystem() {
  return runMenuTransition(this, applyCloseSettingsTransition);
}

// Leaving the run from the pause menu: drop every menu first so nothing leaks into
// the next scene (DOM screens, blur, a disabled keyboard).
function leaveRun(scene) {
  scene.cameras.main.resetPostPipeline();
  scene.input.keyboard.enabled = true;
  scene.input.keyboard.enableGlobalCapture();
  showMenu(MENU.NONE);
}

export function restartRunSystem() {
  leaveRun(this);
  // A paused Transport is restarted from bar 0 by startMusicAndWatchdog on create.
  this.scene.restart();
}

export function quitToTitleSystem() {
  leaveRun(this);
  Tone.Transport.stop();
  this.scene.start('StartupScene');
}
