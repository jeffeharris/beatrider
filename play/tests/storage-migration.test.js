import test from 'node:test';
import assert from 'node:assert/strict';

// storage.js reads localStorage at module-evaluation time, so the shim has to exist
// before the dynamic import below. Node has no DOM storage of its own.
function installLocalStorage(initialJson) {
  const store = new Map();
  if (initialJson !== undefined) store.set('beatrider_data', initialJson);

  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  };

  return store;
}

const V2_DATA = {
  version: 2,
  highScore: 4200,
  settings: { gridEnabled: false, difficulty: 'chaos', touchSensitivity: 42 }
};

const store = installLocalStorage(JSON.stringify(V2_DATA));
const { loadGameData, saveGameData } = await import('../src/storage.js');

test('v2 data is migrated to v3 with the high score seeded into the leaderboard', () => {
  const data = loadGameData();

  assert.equal(data.version, 4);
  assert.equal(data.leaderboard.length, 1);
  assert.equal(data.leaderboard[0].score, 4200);
  assert.equal(data.leaderboard[0].isLegacySeed, true);
});

test('migration preserves the existing high score and settings', () => {
  const data = loadGameData();

  assert.equal(data.highScore, 4200);
  assert.equal(data.settings.gridEnabled, false);
  assert.equal(data.settings.difficulty, 'chaos');
  assert.equal(data.settings.touchSensitivity, 42);
});

test('the migrated shape is written back to storage', () => {
  const persisted = JSON.parse(store.get('beatrider_data'));
  assert.equal(persisted.version, 4);
});

test('saving a leaderboard replaces the stored array wholesale', () => {
  // deepMerge treats arrays as scalars, which is what lets a capped list shrink.
  // If it ever merged element-wise, trimming the table would leave stale rows behind.
  saveGameData({ leaderboard: [{ score: 900 }, { score: 800 }, { score: 700 }] });
  assert.equal(loadGameData().leaderboard.length, 3);

  saveGameData({ leaderboard: [{ score: 900 }] });
  const after = loadGameData().leaderboard;

  assert.equal(after.length, 1, 'a shorter list must truncate, not merge by index');
  assert.equal(after[0].score, 900);
});

test('the unicorn is the main character after migrating', () => {
  // The seeded v2 blob predates the character setting entirely.
  assert.equal(loadGameData().settings.character, 'unicorn');
});

test('an explicit unicorn choice survives migration', () => {
  store.set('beatrider_data', JSON.stringify({
    version: 3, highScore: 0, leaderboard: [], settings: { character: 'unicorn' }
  }));
  assert.equal(loadGameData().settings.character, 'unicorn');
});

test('the retired default character id maps forward to the unicorn', () => {
  store.set('beatrider_data', JSON.stringify({
    version: 3, highScore: 0, leaderboard: [], settings: { character: 'default' }
  }));
  const data = loadGameData();

  assert.equal(data.version, 4);
  assert.equal(data.settings.character, 'unicorn');
});

test('migrating the character preserves the rest of settings', () => {
  store.set('beatrider_data', JSON.stringify({
    version: 3,
    highScore: 77,
    leaderboard: [{ score: 77 }],
    settings: { character: 'default', difficulty: 'chaos', gridEnabled: false }
  }));
  const data = loadGameData();

  assert.equal(data.settings.difficulty, 'chaos');
  assert.equal(data.settings.gridEnabled, false);
  assert.equal(data.highScore, 77);
  assert.equal(data.leaderboard.length, 1);
});

test('an already-v4 blob passes through untouched', () => {
  saveGameData({ leaderboard: [{ score: 1234, id: 'keep-me' }] });
  const data = loadGameData();

  assert.equal(data.version, 4);
  assert.equal(data.leaderboard[0].id, 'keep-me');
});

test('corrupt storage falls back to defaults with an empty leaderboard', () => {
  store.set('beatrider_data', '{not valid json');
  const data = loadGameData();

  assert.equal(data.version, 4);
  assert.deepEqual(data.leaderboard, []);
});
