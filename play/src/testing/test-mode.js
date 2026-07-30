const TEST_MODE_PARAM = 'testMode';
const DEFAULT_SEED = 1337;
export const FIXED_STEP_MS = 10;
const STEP_EPSILON_MS = 1e-9;
const MAX_RENDERED_ENTITIES = 20;

function currentSearch() {
  return typeof window === 'undefined' ? '' : (window.location?.search || '');
}

export function isTestMode(search = currentSearch()) {
  return new URLSearchParams(search).get(TEST_MODE_PARAM) === '1';
}

export function getTestOptions(search = currentSearch()) {
  const params = new URLSearchParams(search);
  const parsedSeed = Number.parseInt(params.get('seed') || '', 10);
  return {
    enabled: params.get(TEST_MODE_PARAM) === '1',
    seed: Number.isFinite(parsedSeed) ? parsedSeed >>> 0 : DEFAULT_SEED,
    scenario: params.get('scenario') || 'empty'
  };
}

export function createSeededRandom(seed = DEFAULT_SEED) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function configureDeterministicRandom(Phaser, options = getTestOptions()) {
  if (!options.enabled) return null;

  const random = createSeededRandom(options.seed);
  Math.random = random;
  Phaser?.Math?.RND?.sow?.([String(options.seed)]);
  return random;
}

function rounded(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

function activeEntities(items = [], fallbackType) {
  return items
    .filter((item) => item && item.active !== false)
    .slice(0, MAX_RENDERED_ENTITIES)
    .map((item) => ({
      type: item.enemyType || (item.isObstacle ? 'obstacle' : fallbackType),
      lane: item.lane ?? item.currentLane ?? null,
      progress: rounded(item.progress),
      x: rounded(item.x),
      y: rounded(item.y),
      visible: item.visible !== false
    }));
}

export function buildGameSnapshot(scene, options = getTestOptions(), clockMs = 0) {
  const slices = scene?.stateSlices;
  const playerState = slices?.player;
  const combat = slices?.combat;
  const flow = slices?.flow;
  const player = scene?.player;
  const mode = !scene
    ? 'startup'
    : flow?.gameOver
      ? 'game-over'
      : flow?.paused
        ? 'paused'
        : 'playing';

  const entities = {
    enemies: activeEntities(scene?.enemies, 'enemy'),
    obstacles: activeEntities(scene?.obstacles, 'obstacle'),
    powerUps: activeEntities(scene?.powerUps, 'power-up'),
    bullets: activeEntities(scene?.bullets, 'bullet')
  };

  return {
    version: 1,
    testMode: options.enabled,
    seed: options.seed,
    scenario: options.scenario,
    mode,
    coordinates: {
      origin: 'top-left',
      xAxis: 'right',
      yAxis: 'down',
      width: scene?.cameras?.main?.width ?? window.innerWidth,
      height: scene?.cameras?.main?.height ?? window.innerHeight
    },
    timeMs: rounded(clockMs),
    player: scene ? {
      lane: playerState?.lane ?? null,
      x: rounded(player?.x),
      y: rounded(player?.y),
      character: scene.playerCharacter || 'default',
      moving: Boolean(playerState?.moving),
      dashing: Boolean(playerState?.dashing),
      jumping: Boolean(playerState?.jumping),
      crouching: Boolean(playerState?.crouching),
      visible: player?.visible !== false
    } : null,
    combat: scene ? {
      score: combat?.score ?? 0,
      combo: combat?.combo ?? 1,
      ammo: combat?.ammo ?? 0,
      shield: combat?.shield ?? 0,
      beats: combat?.beats ?? 0,
      rapidFire: Boolean(combat?.rapidFire)
    } : null,
    flow: scene ? {
      paused: Boolean(flow?.paused),
      gameOver: Boolean(flow?.gameOver),
      invincible: Boolean(flow?.invincible),
      playerCanControl: Boolean(flow?.playerCanControl)
    } : null,
    entities,
    counts: Object.fromEntries(
      Object.entries(entities).map(([name, items]) => [name, items.length])
    )
  };
}

function destroyEntities(items = []) {
  for (const item of items) item?.destroy?.();
  items.length = 0;
}

export function applyTestScenario(scene, scenario = 'empty') {
  if (!scene?.stateSlices) return false;

  destroyEntities(scene.enemies);
  destroyEntities(scene.bullets);
  destroyEntities(scene.obstacles);
  destroyEntities(scene.powerUps);
  destroyEntities(scene.floatingStars);
  destroyEntities(scene.trails);

  const { player, combat, flow, input } = scene.stateSlices;
  Object.assign(player, {
    lane: 2,
    moving: false,
    dashing: false,
    jumping: false,
    crouching: false,
    charging: false,
    stretching: false
  });
  Object.assign(combat, {
    score: 0,
    combo: 1,
    beats: 0,
    rapidFire: false,
    rapidFireTimer: 0,
    offScreenTimer: 0,
    ammo: 100,
    shield: 0
  });
  Object.assign(flow, {
    paused: false,
    gameOver: false,
    invincible: false,
    playerCanControl: true
  });
  Object.assign(input, {
    touchActive: false,
    touchFiring: false,
    currentZone: 'center',
    jumpChargeAmount: 0
  });

  if (scene.player?.active) {
    scene.tweens?.killTweensOf?.(scene.player);
    scene.player.x = scene._laneX(player.lane);
    scene.player.y = scene.__testPlayerGroundY ?? scene.player.y;
    scene.player.setScale(1);
    scene.player.setAngle(0);
    scene.player.setVisible(true);
    scene.player.setAlpha(1);
  }

  if (scenario === 'power-up') {
    combat.ammo = 50;
    scene._spawnPowerUp(player.lane);
    scene.powerUps.at(-1).progress = 0.9;
  } else if (scenario === 'shield-hit') {
    combat.shield = 50;
    scene._spawnObstacle(player.lane);
    scene.obstacles.at(-1).progress = 0.9;
  } else if (scenario === 'enemy') {
    scene._spawnEnemy(player.lane, 160, 'enemyTex');
    scene.enemies.at(-1).progress = 0.75;
  } else if (scenario !== 'empty') {
    throw new Error(`Unknown test scenario: ${scenario}`);
  }

  return true;
}

export function installTestModeRuntime(game, Phaser) {
  const options = getTestOptions();
  if (!options.enabled) return null;

  configureDeterministicRandom(Phaser, options);
  let clockMs = 0;
  let loopTime = 0;
  let pendingMs = 0;
  let scene = null;

  const render = () => JSON.stringify(buildGameSnapshot(scene, options, clockMs));
  window.render_game_to_text = render;

  const runtime = {
    options,
    get ready() {
      return Boolean(scene);
    },
    get clockMs() {
      return clockMs;
    },
    attachScene(nextScene) {
      scene = nextScene;
      scene.__deterministicTestMode = true;
      scene.__testTimeAdvancing = false;
      scene.__testPlayerGroundY = scene.player?.y;
      game.loop.sleep();
      game.loop.smoothStep = false;
      loopTime = game.loop.lastTime || performance.now();
      clockMs = 0;
      pendingMs = 0;
      applyTestScenario(scene, options.scenario);
    },
    applyScenario(name) {
      const applied = applyTestScenario(scene, name);
      if (applied) options.scenario = name;
      return applied;
    },
    spawn(type, lane = 2, progress = 0) {
      if (!scene) return false;
      if (type === 'enemy') scene._spawnEnemy(lane, 160, 'enemyTex');
      else if (type === 'fast-enemy') scene._spawnEnemy(lane, 240, 'fastEnemyTex');
      else if (type === 'drifter') scene._spawnDrifter(lane);
      else if (type === 'obstacle') scene._spawnObstacle(lane);
      else if (type === 'power-up') scene._spawnPowerUp(lane);
      else throw new Error(`Unknown test entity: ${type}`);

      const collections = {
        enemy: scene.enemies,
        'fast-enemy': scene.enemies,
        drifter: scene.enemies,
        obstacle: scene.obstacles,
        'power-up': scene.powerUps
      };
      collections[type].at(-1).progress = progress;
      return true;
    },
    setResources({ ammo, shield, score, combo } = {}) {
      if (!scene) return false;
      const combat = scene.stateSlices.combat;
      if (Number.isFinite(ammo)) combat.ammo = ammo;
      if (Number.isFinite(shield)) combat.shield = shield;
      if (Number.isFinite(score)) combat.score = score;
      if (Number.isFinite(combo)) combat.combo = combo;
      return true;
    }
  };

  window.BeatriderTest = runtime;
  window.advanceTime = async (durationMs = FIXED_STEP_MS) => {
    const duration = Number(durationMs);
    if (!scene || !Number.isFinite(duration) || duration <= 0) return;

    pendingMs += duration;
    const stepCount = Math.floor((pendingMs + STEP_EPSILON_MS) / FIXED_STEP_MS);
    pendingMs = Math.max(0, pendingMs - stepCount * FIXED_STEP_MS);

    for (let i = 0; i < stepCount; i++) {
      loopTime += FIXED_STEP_MS;
      clockMs += FIXED_STEP_MS;
      scene.__testTimeAdvancing = true;
      try {
        game.loop.step(loopTime);
      } finally {
        scene.__testTimeAdvancing = false;
      }
    }
  };

  return runtime;
}
