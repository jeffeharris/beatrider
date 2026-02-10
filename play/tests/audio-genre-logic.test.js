import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP_COUNT,
  adaptBinaryPatternTo24,
  createGenreGenerators,
  generateGenrePatterns,
  generateGenreSubPattern,
  getStepCountForGenre,
  isNative24Enabled,
  getSectionForGenre,
  isApproachingTransitionForGenre,
  setNative24Enabled
} from '../src/audio/genres/genre-logic.js';

const patternBank = {
  kick: {
    fourOnFloor: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    halfTime: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    syncopated: [1,0,0,0, 1,0,0,1, 0,0,1,0, 1,0,0,0],
    minimal: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    detroit: [1,0,0,1, 1,0,0,0, 1,0,1,0, 1,0,0,0],
    berlin: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,0,0],
    chicago: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
    fill: [1,0,1,0, 1,0,1,1, 1,1,1,0, 1,1,1,1],
    dnb_basic: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    dnb_amen: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
    dnb_jump: [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,1],
    kygo_basic: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
    kygo_bounce: [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,1,0,0],
    kygo_minimal: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    dubstep_basic: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    dubstep_half: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    dubstep_roll: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    trance_kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    trance_build: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    trance_uplifting: [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,0,1],
    house_classic: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    house_drive: [1,0,0,1, 1,0,0,0, 1,0,0,1, 1,0,0,0],
    house_shuffle: [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],
    garage_2step: [1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,1,0],
    garage_shuffle: [1,0,0,1, 0,0,1,0, 0,1,0,0, 0,0,1,0],
    garage_sparse: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,1]
  },
  snare: {
    backbeat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    ghost: [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
    detroit: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
    fill: [0,0,0,0, 1,0,1,0, 1,0,1,1, 1,1,1,1],
    minimal: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    dnb_basic: [0,0,1,0, 1,0,0,0, 0,1,0,0, 1,0,0,0],
    dnb_amen: [0,0,1,0, 1,0,0,1, 0,0,1,0, 1,0,1,0],
    dnb_roll: [0,0,1,0, 1,0,1,1, 0,0,1,0, 1,1,1,1],
    kygo_clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    kygo_snap: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    kygo_rim: [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0],
    dubstep_basic: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    dubstep_trap: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    dubstep_roll: [0,0,0,0, 0,0,0,0, 1,0,1,1, 0,0,0,0],
    trance_clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    trance_build: [0,0,0,0, 1,0,0,1, 0,0,1,0, 1,0,1,1],
    trance_uplift: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
    house_clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    house_ghost: [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
    garage_clap: [0,0,0,0, 1,0,0,0, 0,0,0,1, 1,0,0,0],
    garage_ghost: [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,1]
  }
};

const generators = createGenreGenerators(patternBank);
const chordInfo = { bass: 'C1' };

function hits(stepLane) {
  return stepLane.reduce((sum, step) => sum + (step.on ? 1 : 0), 0);
}

test('16-step adapter maps to 24-step with pulse preservation', () => {
  const source = [1,0,0,1, 0,1,0,0, 1,0,0,0, 0,1,0,0];
  const out = adaptBinaryPatternTo24(source);
  assert.equal(out.length, 24);
  assert.equal(out.filter(Boolean).length, source.filter(Boolean).length);
});

test('native 24-step mode is opt-in for house and garage', () => {
  setNative24Enabled(false);
  assert.equal(isNative24Enabled(), false);
  assert.equal(getStepCountForGenre('house'), 16);
  assert.equal(getStepCountForGenre('garage'), 16);
  assert.equal(getStepCountForGenre('techno'), 16);

  setNative24Enabled(true);
  assert.equal(isNative24Enabled(), true);
  assert.equal(getStepCountForGenre('house'), 24);
  assert.equal(getStepCountForGenre('garage'), 24);
  assert.equal(getStepCountForGenre('techno'), 16);

  // Leave test process in default-safe state.
  setNative24Enabled(false);
});

test('genre arrangements return genre-specific section timing', () => {
  assert.equal(getSectionForGenre('techno', 10), 'BUILD');
  assert.equal(getSectionForGenre('dnb', 10), 'BUILD');
  assert.equal(getSectionForGenre('dnb', 33), 'BREAK');
  assert.equal(getSectionForGenre('trance', 20), 'MAIN');
  assert.equal(getSectionForGenre('house', 20), 'MAIN');
  assert.equal(getSectionForGenre('garage', 20), 'MAIN');
});

test('transition markers follow arrangement boundaries per genre', () => {
  assert.equal(isApproachingTransitionForGenre('techno', 7), true);
  assert.equal(isApproachingTransitionForGenre('techno', 8), false);
  assert.equal(isApproachingTransitionForGenre('dnb', 3), true);
  assert.equal(isApproachingTransitionForGenre('dnb', 4), false);
});

test('generators return complete 24-step event lanes', () => {
  for (const genre of ['techno', 'house', 'garage', 'dnb', 'tropical', 'dubstep', 'trance']) {
    const section = getSectionForGenre(genre, 20);
    const patterns = generateGenrePatterns(
      genre,
      { section, bar: 20, energy: 60, tension: 40, chordInfo },
      generators,
      patternBank
    );

    assert.equal(patterns.kick.length, STEP_COUNT);
    assert.equal(patterns.snare.length, STEP_COUNT);
    assert.equal(patterns.hihat.length, STEP_COUNT);
    assert.equal(patterns.stab.length, STEP_COUNT);
    assert.equal(typeof patterns.kick[0].on, 'boolean');
    assert.equal(typeof patterns.kick[0].velocity, 'number');

    const sub = generateGenreSubPattern(genre, { section, bar: 20, chordInfo }, generators);
    assert.equal(sub.length, STEP_COUNT);
    assert.ok(Object.prototype.hasOwnProperty.call(sub[0], 'note'));
  }
});

test('house and garage emit 24-step lanes when native24 mode enabled', () => {
  setNative24Enabled(true);
  for (const genre of ['house', 'garage']) {
    const section = getSectionForGenre(genre, 20);
    const patterns = generateGenrePatterns(
      genre,
      { section, bar: 20, energy: 60, tension: 40, chordInfo },
      generators,
      patternBank
    );
    assert.equal(patterns.kick.length, 24);
    assert.equal(patterns.snare.length, 24);
    assert.equal(patterns.hihat.length, 24);
    assert.equal(patterns.stab.length, 24);

    const sub = generateGenreSubPattern(genre, { section, bar: 20, chordInfo }, generators);
    assert.equal(sub.length, 24);
  }
  setNative24Enabled(false);
});

test('dubstep hats are sparser than trance in MAIN section', () => {
  const dubstep = generateGenrePatterns(
    'dubstep',
    { section: 'MAIN', bar: 24, energy: 70, tension: 50, chordInfo },
    generators,
    patternBank
  );
  const trance = generateGenrePatterns(
    'trance',
    { section: 'MAIN', bar: 24, energy: 70, tension: 50, chordInfo },
    generators,
    patternBank
  );

  assert.ok(hits(dubstep.hihat) < hits(trance.hihat));
});
