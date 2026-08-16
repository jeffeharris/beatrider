import test from 'node:test';
import assert from 'node:assert/strict';

const {
  DEFAULT_BEAT_INTERVAL_MS,
  MIN_BEAT_INTERVAL_MS,
  MAX_BEAT_INTERVAL_MS,
  MAX_SILENCE_INTERVALS,
  LOW_PULSE_FLOOR,
  CRITICAL_PULSE_FLOOR,
  createBeatPulseState,
  recordBeat,
  beatPulseIntensity
} = await import('../src/systems/main-scene/resource-pulse.js');

// Representative setup: 120 BPM quarter-note kicks, 500ms apart, and the
// critical-tier floor used for empty ammo / empty shield.
const INTERVAL = 500;
const FLOOR = CRITICAL_PULSE_FLOOR;

function intensityAt(elapsed, overrides = {}) {
  return beatPulseIntensity({
    now: 10000 + elapsed,
    lastBeatTime: 10000,
    beatInterval: INTERVAL,
    minIntensity: FLOOR,
    ...overrides
  });
}

test('initial state has no beat and the default 120 BPM interval', () => {
  assert.deepEqual(createBeatPulseState(), {
    lastBeatTime: null,
    beatInterval: DEFAULT_BEAT_INTERVAL_MS
  });
});

test('no beat recorded yet falls back to static full intensity', () => {
  const state = createBeatPulseState();
  const intensity = beatPulseIntensity({
    now: 1234,
    lastBeatTime: state.lastBeatTime,
    beatInterval: state.beatInterval,
    minIntensity: FLOOR
  });
  assert.equal(intensity, 1);
});

test('zero or negative beat interval never divides — static fallback', () => {
  for (const beatInterval of [0, -100, NaN]) {
    assert.equal(intensityAt(100, { beatInterval }), 1);
  }
});

test('immediately on the beat the pulse peaks at maxIntensity', () => {
  assert.equal(intensityAt(0), 1);
});

test('mid-interval the pulse has decayed with the quadratic ease-out', () => {
  // phase 0.5 → (1 - 0.5)^2 = 0.25 of the way above the floor
  const expected = FLOOR + (1 - FLOOR) * 0.25;
  assert.ok(Math.abs(intensityAt(INTERVAL / 2) - expected) < 1e-12);
});

test('at the end of one interval the pulse rests at the tier floor', () => {
  assert.equal(intensityAt(INTERVAL), FLOOR);
});

test('pulse decays monotonically across the beat interval', () => {
  let prev = Infinity;
  for (let elapsed = 0; elapsed <= INTERVAL; elapsed += 50) {
    const intensity = intensityAt(elapsed);
    assert.ok(intensity <= prev, `intensity rose at elapsed ${elapsed}`);
    assert.ok(intensity >= FLOOR && intensity <= 1, `intensity out of range at elapsed ${elapsed}`);
    prev = intensity;
  }
});

test('between one and maxSilence intervals the pulse holds at the floor', () => {
  assert.equal(intensityAt(INTERVAL * 1.5), FLOOR);
  assert.equal(intensityAt(INTERVAL * MAX_SILENCE_INTERVALS), FLOOR);
});

test('a long gap since the last beat clamps to static full intensity', () => {
  // Music stopped or the game was paused: never keep throbbing off a stale beat.
  assert.equal(intensityAt(INTERVAL * MAX_SILENCE_INTERVALS + 1), 1);
  assert.equal(intensityAt(INTERVAL * 100), 1);
});

test('a clock that jumped backwards falls back to static intensity', () => {
  assert.equal(intensityAt(-50), 1);
});

test('low tier floor sits above the critical tier floor', () => {
  assert.ok(LOW_PULSE_FLOOR > CRITICAL_PULSE_FLOOR);
  assert.ok(CRITICAL_PULSE_FLOOR > 0);
  assert.ok(LOW_PULSE_FLOOR < 1);
});

test('recordBeat stores the first beat but keeps the default interval', () => {
  const state = recordBeat(createBeatPulseState(), 5000);
  assert.deepEqual(state, { lastBeatTime: 5000, beatInterval: DEFAULT_BEAT_INTERVAL_MS });
});

test('recordBeat measures the interval from a plausible kick-to-kick gap', () => {
  let state = recordBeat(createBeatPulseState(), 5000);
  state = recordBeat(state, 5345); // 174 BPM drum & bass quarter note
  assert.deepEqual(state, { lastBeatTime: 5345, beatInterval: 345 });
});

test('recordBeat ignores implausibly short gaps (syncopated double kicks)', () => {
  let state = recordBeat(createBeatPulseState(), 5000);
  state = recordBeat(state, 5000 + MIN_BEAT_INTERVAL_MS - 1);
  assert.equal(state.beatInterval, DEFAULT_BEAT_INTERVAL_MS);
  assert.equal(state.lastBeatTime, 5000 + MIN_BEAT_INTERVAL_MS - 1);
});

test('recordBeat ignores implausibly long gaps (resume after silence)', () => {
  let state = recordBeat(createBeatPulseState(), 5000);
  state = recordBeat(state, 5345);
  state = recordBeat(state, 5345 + MAX_BEAT_INTERVAL_MS + 1);
  assert.equal(state.beatInterval, 345);
  assert.equal(state.lastBeatTime, 5345 + MAX_BEAT_INTERVAL_MS + 1);
});
