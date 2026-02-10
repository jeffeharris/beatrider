import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGenreGenerators,
  generateGenrePatterns,
  generateGenreSubPattern,
  getSectionForGenre,
  isApproachingTransitionForGenre
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
    trance_uplifting: [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,0,1]
  },
  snare: {
    backbeat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
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
    trance_uplift: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0]
  }
};

const generators = createGenreGenerators(patternBank);
const chordInfo = { bass: 'C1' };

function hits(pattern) {
  return pattern.reduce((sum, step) => sum + (step ? 1 : 0), 0);
}

test('genre arrangements return genre-specific section timing', () => {
  assert.equal(getSectionForGenre('techno', 10), 'BUILD');
  assert.equal(getSectionForGenre('dnb', 10), 'BUILD');
  assert.equal(getSectionForGenre('dnb', 33), 'BREAK');
  assert.equal(getSectionForGenre('trance', 20), 'MAIN');
});

test('transition markers follow arrangement boundaries per genre', () => {
  assert.equal(isApproachingTransitionForGenre('techno', 7), true);
  assert.equal(isApproachingTransitionForGenre('techno', 8), false);
  assert.equal(isApproachingTransitionForGenre('dnb', 3), true);
  assert.equal(isApproachingTransitionForGenre('dnb', 4), false);
});

test('generators return complete 16-step patterns', () => {
  for (const genre of ['techno', 'dnb', 'tropical', 'dubstep', 'trance']) {
    const section = getSectionForGenre(genre, 20);
    const patterns = generateGenrePatterns(
      genre,
      { section, bar: 20, energy: 60, tension: 40, chordInfo },
      generators,
      patternBank
    );

    assert.equal(patterns.kick.length, 16);
    assert.equal(patterns.snare.length, 16);
    assert.equal(patterns.hihat.length, 16);
    assert.equal(patterns.stab.length, 16);

    const sub = generateGenreSubPattern(genre, { section, bar: 20, chordInfo }, generators);
    assert.equal(sub.length, 16);
  }
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
