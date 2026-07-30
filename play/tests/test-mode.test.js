import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGameSnapshot,
  createSeededRandom,
  FIXED_STEP_MS,
  getTestOptions,
  installTestModeRuntime,
  isTestMode
} from '../src/testing/test-mode.js';
import { createSilentGameSounds } from '../src/testing/silent-game-sounds.js';

test('test mode is opt-in and parses deterministic options', () => {
  assert.equal(isTestMode('?testMode=1'), true);
  assert.equal(isTestMode('?testMode=0'), false);
  assert.deepEqual(getTestOptions('?testMode=1&seed=42&scenario=enemy'), {
    enabled: true,
    seed: 42,
    scenario: 'enemy'
  });
});

test('seeded random produces the same sequence for the same seed', () => {
  const first = createSeededRandom(7);
  const second = createSeededRandom(7);
  assert.deepEqual(
    Array.from({ length: 5 }, first),
    Array.from({ length: 5 }, second)
  );
});

test('game snapshot exposes concise player, combat, flow, and entity state', () => {
  globalThis.window = { innerWidth: 1280, innerHeight: 720 };
  const scene = {
    cameras: { main: { width: 1280, height: 720 } },
    playerCharacter: 'unicorn',
    player: { x: 640, y: 660, visible: true },
    stateSlices: {
      player: { lane: 2, moving: false, dashing: false, jumping: true, crouching: false },
      combat: { score: 120, combo: 3, ammo: 80, shield: 25, beats: 4, rapidFire: false },
      flow: { paused: false, gameOver: false, invincible: false, playerCanControl: true }
    },
    enemies: [{ active: true, enemyType: 'enemyTex', lane: 1, progress: 0.4567, x: 320, y: 200 }],
    obstacles: [],
    powerUps: [],
    bullets: []
  };

  const snapshot = buildGameSnapshot(
    scene,
    { enabled: true, seed: 42, scenario: 'enemy' },
    16.6667
  );

  assert.equal(snapshot.mode, 'playing');
  assert.equal(snapshot.player.character, 'unicorn');
  assert.equal(snapshot.combat.score, 120);
  assert.equal(snapshot.entities.enemies[0].progress, 0.457);
  assert.equal(snapshot.counts.enemies, 1);
  delete globalThis.window;
});

test('silent game sounds implement the sound API without scheduling audio', () => {
  const sounds = createSilentGameSounds({ settings: { laserSound: 3 } });
  assert.equal(sounds.currentLaserSound, 3);
  assert.equal(sounds.laserSounds.length, 6);
  assert.doesNotThrow(() => {
    sounds.move.triggerAttackRelease('C4', '16n');
    sounds.jumpCharge.triggerAttack('C2');
    sounds.jumpCharge.frequency.rampTo(440, 1);
    sounds.jumpCharge.frequency.exponentialRampToValueAtTime(440, 1);
    sounds.jumpCharge.triggerRelease();
  });
});

test('advanceTime uses cohesive 10ms steps and carries partial time between calls', async () => {
  const originalWindow = globalThis.window;
  const originalRandom = Math.random;
  const stepTimes = [];
  const loop = {
    lastTime: 100,
    smoothStep: true,
    sleep() {},
    step(time) {
      stepTimes.push(time);
      this.lastTime = time;
    }
  };
  const game = { loop };
  const scene = {
    stateSlices: {
      player: {},
      combat: {},
      flow: {},
      input: {}
    },
    enemies: [],
    bullets: [],
    obstacles: [],
    powerUps: [],
    floatingStars: [],
    trails: []
  };

  try {
    globalThis.window = {
      location: { search: '?testMode=1&seed=42' },
      innerWidth: 1280,
      innerHeight: 720
    };
    const runtime = installTestModeRuntime(game, {});
    runtime.attachScene(scene);

    await window.advanceTime(7);
    assert.equal(runtime.clockMs, 0);
    assert.deepEqual(stepTimes, []);

    await window.advanceTime(3);
    assert.equal(runtime.clockMs, FIXED_STEP_MS);
    assert.deepEqual(stepTimes, [110]);

    await window.advanceTime(25);
    assert.equal(runtime.clockMs, 30);
    assert.deepEqual(stepTimes, [110, 120, 130]);

    await window.advanceTime(5);
    assert.equal(runtime.clockMs, 40);
    assert.deepEqual(stepTimes, [110, 120, 130, 140]);

    await window.advanceTime(Infinity);
    await window.advanceTime(-10);
    assert.equal(runtime.clockMs, 40);

    for (let i = 0; i < 100; i++) {
      await window.advanceTime(0.1);
    }
    assert.equal(runtime.clockMs, 50);
    assert.equal(stepTimes.at(-1), 150);
  } finally {
    Math.random = originalRandom;
    globalThis.window = originalWindow;
  }
});
