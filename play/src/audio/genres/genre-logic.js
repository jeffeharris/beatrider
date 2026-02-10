const DEFAULT_STEP_COUNT = 16;
const ALT_STEP_COUNT = 24;
const LEGACY_STEP_COUNT = 16;
const NATIVE_24_GENRES = new Set(['house', 'garage']);
let native24Enabled = false;
let runtimeStepCount = DEFAULT_STEP_COUNT;

export const STEP_COUNT = DEFAULT_STEP_COUNT;

export function setNative24Enabled(enabled) {
  native24Enabled = !!enabled;
}

export function isNative24Enabled() {
  return native24Enabled;
}

export function getStepCountForGenre(genre) {
  return native24Enabled && NATIVE_24_GENRES.has(genre) ? ALT_STEP_COUNT : DEFAULT_STEP_COUNT;
}

export const GENRE_CONFIGS = {
  techno: {
    name: 'Techno/Acid',
    bpmMin: 120,
    bpmMax: 150,
    bpmDefault: 132,
    patterns: ['detroit', 'berlin', 'chicago', 'fourOnFloor', 'syncopated']
  },
  dnb: {
    name: 'Drum & Bass',
    bpmMin: 160,
    bpmMax: 180,
    bpmDefault: 174,
    patterns: ['dnb_basic', 'dnb_amen', 'dnb_jump', 'dnb_roll']
  },
  tropical: {
    name: 'Tropical/Kygo',
    bpmMin: 100,
    bpmMax: 115,
    bpmDefault: 110,
    patterns: ['kygo_basic', 'kygo_bounce', 'kygo_minimal', 'kygo_clap']
  },
  dubstep: {
    name: 'Dubstep',
    bpmMin: 138,
    bpmMax: 145,
    bpmDefault: 140,
    patterns: ['dubstep_basic', 'dubstep_half', 'dubstep_roll']
  },
  trance: {
    name: 'Trance',
    bpmMin: 135,
    bpmMax: 145,
    bpmDefault: 138,
    patterns: ['trance_kick', 'trance_build', 'trance_uplifting']
  },
  house: {
    name: 'House',
    bpmMin: 118,
    bpmMax: 130,
    bpmDefault: 124,
    patterns: ['house_classic', 'house_drive', 'house_shuffle']
  },
  garage: {
    name: 'UK Garage',
    bpmMin: 128,
    bpmMax: 138,
    bpmDefault: 132,
    patterns: ['garage_2step', 'garage_shuffle', 'garage_sparse']
  }
};

export const GENRE_ARRANGEMENTS = {
  techno: [
    { name: 'INTRO', length: 8 },
    { name: 'BUILD', length: 8 },
    { name: 'MAIN', length: 16 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 16 },
    { name: 'OUTRO', length: 8 }
  ],
  dnb: [
    { name: 'INTRO', length: 4 },
    { name: 'BUILD', length: 8 },
    { name: 'MAIN', length: 20 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 20 },
    { name: 'OUTRO', length: 4 }
  ],
  tropical: [
    { name: 'INTRO', length: 8 },
    { name: 'BUILD', length: 8 },
    { name: 'MAIN', length: 24 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 12 },
    { name: 'OUTRO', length: 4 }
  ],
  dubstep: [
    { name: 'INTRO', length: 8 },
    { name: 'BUILD', length: 8 },
    { name: 'MAIN', length: 16 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 20 },
    { name: 'OUTRO', length: 4 }
  ],
  trance: [
    { name: 'INTRO', length: 8 },
    { name: 'BUILD', length: 12 },
    { name: 'MAIN', length: 20 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 12 },
    { name: 'OUTRO', length: 4 }
  ],
  house: [
    { name: 'INTRO', length: 8 },
    { name: 'BUILD', length: 8 },
    { name: 'MAIN', length: 24 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 12 },
    { name: 'OUTRO', length: 4 }
  ],
  garage: [
    { name: 'INTRO', length: 8 },
    { name: 'BUILD', length: 8 },
    { name: 'MAIN', length: 20 },
    { name: 'BREAK', length: 8 },
    { name: 'DROP', length: 16 },
    { name: 'OUTRO', length: 4 }
  ]
};

export const GENRE_SCENES = {
  techno: {
    raveSynth: 'technoStab',
    kick: { frequency: 60, octaves: 4 },
    hihat: { highpass: 9500 },
    sidechain: { ratio: 8, threshold: -20 },
    stab: { wet: 0.3, lowpass: 2600 },
    acid: { drive: 0.5 },
    sub: { low: 3, mid: -6, high: -12, volume: -6 },
    humanize: { kick: 0.003, snare: 0.005, hihat: 0.008, acid: 0.004, stab: 0.006, sub: 0.002 }
  },
  dnb: {
    raveSynth: 'dnbReese',
    kick: { frequency: 68, octaves: 3 },
    hihat: { highpass: 12000 },
    sidechain: { ratio: 7, threshold: -18 },
    stab: { wet: 0.18, lowpass: 3200 },
    acid: { drive: 0.35 },
    sub: { low: 5, mid: -7, high: -14, volume: -5 },
    humanize: { kick: 0.002, snare: 0.004, hihat: 0.006, acid: 0.003, stab: 0.004, sub: 0.0015 }
  },
  tropical: {
    raveSynth: 'tropicalPluck',
    kick: { frequency: 50, octaves: 6 },
    hihat: { highpass: 8200 },
    sidechain: { ratio: 6, threshold: -22 },
    stab: { wet: 0.4, lowpass: 3800 },
    acid: { drive: 0.25 },
    sub: { low: 4, mid: -5, high: -10, volume: -7 },
    humanize: { kick: 0.0035, snare: 0.006, hihat: 0.009, acid: 0.004, stab: 0.007, sub: 0.0025 }
  },
  dubstep: {
    raveSynth: 'dnbReese',
    kick: { frequency: 45, octaves: 7 },
    hihat: { highpass: 10500 },
    sidechain: { ratio: 10, threshold: -17 },
    stab: { wet: 0.22, lowpass: 2100 },
    acid: { drive: 0.6 },
    sub: { low: 6, mid: -8, high: -15, volume: -4 },
    humanize: { kick: 0.0025, snare: 0.004, hihat: 0.005, acid: 0.003, stab: 0.005, sub: 0.0015 }
  },
  trance: {
    raveSynth: 'technoStab',
    kick: { frequency: 60, octaves: 4 },
    hihat: { highpass: 11000 },
    sidechain: { ratio: 9, threshold: -19 },
    stab: { wet: 0.35, lowpass: 4200 },
    acid: { drive: 0.45 },
    sub: { low: 4, mid: -6, high: -11, volume: -6 },
    humanize: { kick: 0.002, snare: 0.003, hihat: 0.005, acid: 0.003, stab: 0.004, sub: 0.0015 }
  },
  house: {
    raveSynth: 'technoStab',
    kick: { frequency: 55, octaves: 5 },
    hihat: { highpass: 10200 },
    sidechain: { ratio: 7, threshold: -20 },
    stab: { wet: 0.28, lowpass: 3100 },
    acid: { drive: 0.38 },
    sub: { low: 5, mid: -6, high: -12, volume: -5 },
    humanize: { kick: 0.0025, snare: 0.004, hihat: 0.006, acid: 0.0035, stab: 0.005, sub: 0.0018 }
  },
  garage: {
    raveSynth: 'technoStab',
    kick: { frequency: 58, octaves: 4 },
    hihat: { highpass: 10800 },
    sidechain: { ratio: 6, threshold: -21 },
    stab: { wet: 0.25, lowpass: 3300 },
    acid: { drive: 0.32 },
    sub: { low: 5, mid: -7, high: -13, volume: -5 },
    humanize: { kick: 0.003, snare: 0.0045, hihat: 0.007, acid: 0.003, stab: 0.005, sub: 0.002 }
  }
};

function clonePattern(pattern) {
  return [...pattern];
}

function shiftOctave(note, delta) {
  if (!note) return note;
  return note.replace(/(\d+)/, (value) => `${Math.max(0, parseInt(value, 10) + delta)}`);
}

function arrangementFor(genre) {
  return GENRE_ARRANGEMENTS[genre] || GENRE_ARRANGEMENTS.techno;
}

function cycleLength(genre) {
  return arrangementFor(genre).reduce((acc, segment) => acc + segment.length, 0);
}

export function getSectionForGenre(genre, bar) {
  const arrangement = arrangementFor(genre);
  const cycle = cycleLength(genre);
  const position = ((bar % cycle) + cycle) % cycle;

  let cursor = 0;
  for (const segment of arrangement) {
    if (position < cursor + segment.length) return segment.name;
    cursor += segment.length;
  }
  return arrangement[arrangement.length - 1].name;
}

export function getBarsUntilNextSectionForGenre(genre, bar) {
  const arrangement = arrangementFor(genre);
  const cycle = cycleLength(genre);
  const position = ((bar % cycle) + cycle) % cycle;

  let cursor = 0;
  for (const segment of arrangement) {
    const end = cursor + segment.length;
    if (position < end) {
      return end - position;
    }
    cursor = end;
  }
  return 1;
}

export function isApproachingTransitionForGenre(genre, bar) {
  return getBarsUntilNextSectionForGenre(genre, bar) === 1;
}

export function adaptBinaryPatternToStepCount(pattern, stepCount = DEFAULT_STEP_COUNT) {
  const source = Array.isArray(pattern) ? pattern : [];
  if (source.length === stepCount) return clonePattern(source);

  const mapped = new Array(stepCount).fill(0);
  if (source.length === 0) return mapped;

  for (let i = 0; i < source.length; i++) {
    if (!source[i]) continue;
    const idx = Math.min(stepCount - 1, Math.floor((i * stepCount) / source.length));
    mapped[idx] = 1;
  }
  return mapped;
}

export function adaptBinaryPatternTo24(pattern) {
  return adaptBinaryPatternToStepCount(pattern, ALT_STEP_COUNT);
}

function createStepEvent(on = false, velocity = 0.7, gate = '16n', accent = false) {
  return {
    on: !!on,
    velocity: on ? Math.max(0, Math.min(1, velocity)) : 0,
    gate,
    accent: !!accent,
    slide: false
  };
}

function toStepLane(binaryPattern, options = {}) {
  const {
    stepCount = runtimeStepCount,
    velocity = 0.72,
    gate = '16n',
    accentEvery = 4,
    accentBoost = 0.2
  } = options;

  const pattern24 = adaptBinaryPatternToStepCount(binaryPattern, stepCount);
  return pattern24.map((on, i) => {
    const accent = !!on && i % accentEvery === 0;
    const eventVelocity = accent ? Math.min(1, velocity + accentBoost) : velocity;
    return createStepEvent(!!on, eventVelocity, gate, accent);
  });
}

function toNoteLane(notePattern, options = {}) {
  const {
    stepCount = runtimeStepCount,
    velocity = 0.78,
    gate = '8n',
    accentEvery = 4,
    slideEvery = 0
  } = options;

  const mapped = new Array(stepCount).fill(null);
  const source = Array.isArray(notePattern) ? notePattern : [];
  for (let i = 0; i < source.length; i++) {
    const note = source[i];
    if (!note) continue;
    const idx = Math.min(stepCount - 1, Math.floor((i * stepCount) / source.length));
    mapped[idx] = note;
  }

  return mapped.map((note, i) => {
    const accent = !!note && i % accentEvery === 0;
    return {
      note,
      velocity: note ? (accent ? Math.min(1, velocity + 0.15) : velocity) : 0,
      gate,
      accent,
      slide: !!note && slideEvery > 0 && i % slideEvery === 0
    };
  });
}

function pick(...values) {
  return values[Math.floor(Math.random() * values.length)];
}

function getStabPattern(section, bar) {
  const stab16 = {
    downbeat: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    midpoint: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    upbeat: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0],
    offbeat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    rest: new Array(LEGACY_STEP_COUNT).fill(0)
  };

  if (section === 'BREAK') return toStepLane(stab16.rest, { velocity: 0.65, gate: '8n' });
  if (section === 'DROP') return toStepLane(bar % 4 === 0 ? stab16.downbeat : stab16.rest, { velocity: 0.8, gate: '8n' });
  if (section === 'BUILD') return toStepLane(bar % 2 === 1 ? stab16.upbeat : stab16.rest, { velocity: 0.74, gate: '8n' });
  if (section === 'MAIN') return toStepLane(bar % 2 === 0 ? stab16.midpoint : stab16.rest, { velocity: 0.72, gate: '8n' });
  return toStepLane(bar % 4 === 0 ? stab16.offbeat : stab16.rest, { velocity: 0.68, gate: '8n' });
}

function buildDrumFill(patternBank, genre) {
  if (genre === 'dnb') {
    return {
      kick: toStepLane(patternBank.kick.dnb_amen, { velocity: 0.9, gate: '16n', accentEvery: 3 }),
      snare: toStepLane(patternBank.snare.dnb_roll, { velocity: 0.88, gate: '16n', accentEvery: 3 }),
      hihat: toStepLane(new Array(LEGACY_STEP_COUNT).fill(1), { velocity: 0.62, gate: '32n', accentEvery: 3 })
    };
  }

  if (genre === 'dubstep') {
    return {
      kick: toStepLane(patternBank.kick.dubstep_roll, { velocity: 0.88, gate: '16n' }),
      snare: toStepLane(patternBank.snare.dubstep_roll, { velocity: 0.86, gate: '16n' }),
      hihat: toStepLane([0,1,1,0, 0,1,0,1, 0,1,1,0, 0,1,0,1], { velocity: 0.6, gate: '32n', accentEvery: 3 })
    };
  }

  return {
    kick: toStepLane(patternBank.kick.fill, { velocity: 0.85, gate: '16n' }),
    snare: toStepLane(patternBank.snare.fill, { velocity: 0.84, gate: '16n' }),
    hihat: toStepLane(new Array(LEGACY_STEP_COUNT).fill(1), { velocity: 0.58, gate: '32n', accentEvery: 3 })
  };
}

function createTechnoGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar, energy, tension }) => {
      if (section === 'DROP') {
        return {
          kick: toStepLane(bar % 8 < 4 ? patternBank.kick.chicago : patternBank.kick.detroit, { velocity: 0.84, gate: '16n' }),
          snare: toStepLane(energy > 70 ? patternBank.snare.detroit : patternBank.snare.backbeat, { velocity: 0.74, gate: '16n' }),
          hihat: toStepLane(tension > 65
            ? [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1]
            : [1,0,0,1, 1,0,1,0, 1,0,0,1, 1,0,1,0], { velocity: 0.56, gate: '16n', accentEvery: 3 })
        };
      }

      if (section === 'MAIN') {
        const kick = pick(patternBank.kick.fourOnFloor, patternBank.kick.berlin, patternBank.kick.detroit);
        const hihat16 = Array.from({ length: LEGACY_STEP_COUNT }, (_, i) => {
          if (tension > 70 && i % 2 === 1) return 1;
          const density = (energy / 100) * 0.5 + (tension / 100) * 0.5 + (i % 4 === 0 ? 0.2 : 0);
          return Math.random() < Math.min(0.95, density) ? 1 : 0;
        });
        return {
          kick: toStepLane(kick, { velocity: 0.8, gate: '16n' }),
          snare: toStepLane(patternBank.snare.backbeat, { velocity: 0.7, gate: '16n' }),
          hihat: toStepLane(hihat16, { velocity: 0.53, gate: '16n', accentEvery: 3 })
        };
      }

      if (section === 'BUILD') {
        return {
          kick: toStepLane(patternBank.kick.halfTime, { velocity: 0.78, gate: '16n' }),
          snare: toStepLane(patternBank.snare.minimal, { velocity: 0.68, gate: '16n' }),
          hihat: toStepLane([0,1,0,1, 0,1,0,1, 0,1,1,1, 1,1,1,1], { velocity: 0.56, gate: '16n' })
        };
      }

      if (section === 'BREAK') {
        return {
          kick: toStepLane(patternBank.kick.minimal, { velocity: 0.74, gate: '16n' }),
          snare: toStepLane(new Array(LEGACY_STEP_COUNT).fill(0), { velocity: 0.7, gate: '16n' }),
          hihat: toStepLane([0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1], { velocity: 0.48, gate: '16n' })
        };
      }

      return {
        kick: toStepLane(patternBank.kick.halfTime, { velocity: 0.75, gate: '16n' }),
        snare: toStepLane(patternBank.snare.minimal, { velocity: 0.66, gate: '16n' }),
        hihat: toStepLane([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], { velocity: 0.5, gate: '16n' })
      };
    },
    generateBass: ({ chordInfo }) => toNoteLane([
      null, chordInfo.bass, null, null,
      null, null, null, null,
      null, chordInfo.bass, null, null,
      null, null, null, null
    ], { velocity: 0.78, gate: '8n' }),
    generateStabs: ({ section, bar }) => getStabPattern(section, bar)
  };
}

function createDnbGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar, tension }) => {
      if (section === 'BREAK') {
        return {
          kick: toStepLane(patternBank.kick.dnb_basic, { velocity: 0.84, gate: '16n', accentEvery: 3 }),
          snare: toStepLane(patternBank.snare.dnb_basic, { velocity: 0.84, gate: '16n', accentEvery: 3 }),
          hihat: toStepLane([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], { velocity: 0.6, gate: '16n', accentEvery: 3 })
        };
      }

      if (section === 'DROP') {
        return {
          kick: toStepLane(patternBank.kick.dnb_jump, { velocity: 0.9, gate: '16n', accentEvery: 3 }),
          snare: toStepLane(patternBank.snare.dnb_roll, { velocity: 0.88, gate: '16n', accentEvery: 3 }),
          hihat: toStepLane(tension > 70 ? new Array(LEGACY_STEP_COUNT).fill(1) : [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1], { velocity: 0.62, gate: '32n', accentEvery: 3 })
        };
      }

      const kick = bar % 8 < 4 ? patternBank.kick.dnb_basic : patternBank.kick.dnb_amen;
      const snare = bar % 16 >= 8 ? patternBank.snare.dnb_amen : patternBank.snare.dnb_basic;
      return {
        kick: toStepLane(kick, { velocity: 0.85, gate: '16n' }),
        snare: toStepLane(snare, { velocity: 0.84, gate: '16n' }),
        hihat: toStepLane([1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0], { velocity: 0.58, gate: '16n' })
      };
    },
    generateBass: ({ chordInfo, bar }) => toNoteLane([
      chordInfo.bass, null, null, null,
      null, null, bar % 2 === 0 ? chordInfo.bass : null, null,
      null, null, null, null,
      chordInfo.bass, null, null, bar % 2 === 0 ? chordInfo.bass : null
    ], { velocity: 0.82, gate: '8n', slideEvery: 3 }),
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN' || section === 'DROP') {
        return toStepLane(bar % 2 === 0
          ? [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]
          : [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0], { velocity: 0.76, gate: '8n' });
      }
      return getStabPattern(section, bar);
    }
  };
}

function createTropicalGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar }) => {
      if (section === 'DROP') {
        return {
          kick: toStepLane(patternBank.kick.kygo_bounce, { velocity: 0.8, gate: '16n' }),
          snare: toStepLane(patternBank.snare.kygo_clap, { velocity: 0.72, gate: '16n' }),
          hihat: toStepLane([0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], { velocity: 0.54, gate: '16n' })
        };
      }

      if (section === 'BREAK') {
        return {
          kick: toStepLane(patternBank.kick.kygo_minimal, { velocity: 0.74, gate: '16n' }),
          snare: toStepLane(patternBank.snare.kygo_snap, { velocity: 0.66, gate: '16n' }),
          hihat: toStepLane([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], { velocity: 0.48, gate: '16n' })
        };
      }

      return {
        kick: toStepLane(bar % 8 < 4 ? patternBank.kick.kygo_basic : patternBank.kick.kygo_bounce, { velocity: 0.78, gate: '16n' }),
        snare: toStepLane(bar % 4 === 0 ? patternBank.snare.kygo_clap : patternBank.snare.kygo_rim, { velocity: 0.7, gate: '16n' }),
        hihat: toStepLane([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], { velocity: 0.5, gate: '16n' })
      };
    },
    generateBass: ({ chordInfo, bar }) => toNoteLane([
      chordInfo.bass, null, null, chordInfo.bass,
      null, null, bar % 2 === 0 ? chordInfo.bass : null, null,
      chordInfo.bass, null, null, chordInfo.bass,
      null, null, chordInfo.bass, null
    ], { velocity: 0.76, gate: '8n' }),
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN') {
        return toStepLane(bar % 2 === 0
          ? [1,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,1,0]
          : [0,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0], { velocity: 0.72, gate: '8n' });
      }
      return getStabPattern(section, bar);
    }
  };
}

function createDubstepGenerator(patternBank) {
  return {
    generateDrums: ({ section }) => {
      if (section === 'DROP') {
        return {
          kick: toStepLane(patternBank.kick.dubstep_roll, { velocity: 0.9, gate: '16n' }),
          snare: toStepLane(patternBank.snare.dubstep_trap, { velocity: 0.9, gate: '16n', accentEvery: 3 }),
          hihat: toStepLane([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,0,0], { velocity: 0.56, gate: '16n' })
        };
      }

      if (section === 'BUILD') {
        return {
          kick: toStepLane(patternBank.kick.dubstep_half, { velocity: 0.8, gate: '16n' }),
          snare: toStepLane(patternBank.snare.dubstep_basic, { velocity: 0.82, gate: '16n' }),
          hihat: toStepLane([0,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], { velocity: 0.52, gate: '16n' })
        };
      }

      return {
        kick: toStepLane(patternBank.kick.dubstep_basic, { velocity: 0.82, gate: '16n' }),
        snare: toStepLane(patternBank.snare.dubstep_basic, { velocity: 0.82, gate: '16n' }),
        hihat: toStepLane([0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], { velocity: 0.5, gate: '16n' })
      };
    },
    generateBass: ({ chordInfo, section, bar }) => {
      const anchor = shiftOctave(chordInfo.bass, -1);
      if (section === 'DROP') {
        return toNoteLane([
          anchor, null, null, null,
          null, anchor, null, null,
          anchor, null, null, null,
          null, bar % 2 === 0 ? anchor : null, null, null
        ], { velocity: 0.9, gate: '8n', slideEvery: 3 });
      }
      return toNoteLane([
        anchor, null, null, null,
        null, null, null, null,
        anchor, null, null, null,
        null, null, null, null
      ], { velocity: 0.84, gate: '8n', slideEvery: 4 });
    },
    generateStabs: ({ section }) => {
      if (section === 'DROP') {
        return toStepLane([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], { velocity: 0.76, gate: '8n' });
      }
      return toStepLane(new Array(LEGACY_STEP_COUNT).fill(0), { velocity: 0.7, gate: '8n' });
    }
  };
}

function createTranceGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar }) => {
      if (section === 'BUILD') {
        return {
          kick: toStepLane(patternBank.kick.trance_build, { velocity: 0.85, gate: '16n' }),
          snare: toStepLane(patternBank.snare.trance_build, { velocity: 0.82, gate: '16n' }),
          hihat: toStepLane([1,0,1,0, 1,0,1,0, 1,0,1,1, 1,1,1,1], { velocity: 0.58, gate: '16n' })
        };
      }

      if (section === 'DROP') {
        return {
          kick: toStepLane(patternBank.kick.trance_uplifting, { velocity: 0.88, gate: '16n' }),
          snare: toStepLane(patternBank.snare.trance_uplift, { velocity: 0.82, gate: '16n' }),
          hihat: toStepLane([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], { velocity: 0.6, gate: '16n' })
        };
      }

      return {
        kick: toStepLane(patternBank.kick.trance_kick, { velocity: 0.83, gate: '16n' }),
        snare: toStepLane(bar % 8 < 4 ? patternBank.snare.trance_clap : patternBank.snare.trance_uplift, { velocity: 0.8, gate: '16n' }),
        hihat: toStepLane([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], { velocity: 0.58, gate: '16n' })
      };
    },
    generateBass: ({ chordInfo, bar }) => toNoteLane([
      chordInfo.bass, null, chordInfo.bass, null,
      chordInfo.bass, null, chordInfo.bass, null,
      chordInfo.bass, null, chordInfo.bass, null,
      bar % 2 === 0 ? chordInfo.bass : null, null, chordInfo.bass, null
    ], { velocity: 0.82, gate: '8n' }),
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN' || section === 'DROP') {
        return toStepLane(bar % 2 === 0
          ? [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0]
          : [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,0], { velocity: 0.78, gate: '8n' });
      }
      return getStabPattern(section, bar);
    }
  };
}

function createHouseGenerator(patternBank) {
  const houseKick = patternBank.kick.house_classic || patternBank.kick.fourOnFloor;
  const houseDrive = patternBank.kick.house_drive || patternBank.kick.chicago;
  const houseShuffle = patternBank.kick.house_shuffle || patternBank.kick.syncopated;
  const houseClap = patternBank.snare.house_clap || patternBank.snare.backbeat;
  const houseGhost = patternBank.snare.house_ghost || patternBank.snare.ghost || patternBank.snare.backbeat;

  return {
    generateDrums: ({ section, bar }) => {
      if (section === 'BREAK') {
        return {
          kick: toStepLane(houseKick, { velocity: 0.78, gate: '16n' }),
          snare: toStepLane(houseGhost, { velocity: 0.66, gate: '16n' }),
          hihat: toStepLane([0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], { velocity: 0.48, gate: '16n' })
        };
      }
      const kick = section === 'DROP' ? houseDrive : (bar % 8 < 4 ? houseKick : houseShuffle);
      return {
        kick: toStepLane(kick, { velocity: 0.84, gate: '16n' }),
        snare: toStepLane(section === 'DROP' ? houseClap : houseGhost, { velocity: 0.72, gate: '16n' }),
        hihat: toStepLane([0,1,0,1, 1,0,1,0, 0,1,0,1, 1,0,1,0], { velocity: 0.55, gate: '16n', accentEvery: 3 })
      };
    },
    generateBass: ({ chordInfo }) => toNoteLane([
      chordInfo.bass, null, null, null,
      null, chordInfo.bass, null, null,
      chordInfo.bass, null, null, null,
      null, chordInfo.bass, null, null
    ], { velocity: 0.8, gate: '8n' }),
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN' || section === 'DROP') {
        return toStepLane(bar % 2 === 0
          ? [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]
          : [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0], { velocity: 0.72, gate: '8n' });
      }
      return getStabPattern(section, bar);
    }
  };
}

function createGarageGenerator(patternBank) {
  const gKick = patternBank.kick.garage_2step || [1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,1,0];
  const gShuffle = patternBank.kick.garage_shuffle || [1,0,0,1, 0,0,1,0, 0,1,0,0, 0,0,1,0];
  const gSparse = patternBank.kick.garage_sparse || [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,1];
  const gSnare = patternBank.snare.garage_clap || [0,0,0,0, 1,0,0,0, 0,0,0,1, 1,0,0,0];
  const gGhost = patternBank.snare.garage_ghost || [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,1];

  return {
    generateDrums: ({ section, bar }) => {
      const kick = section === 'BREAK' ? gSparse : (bar % 8 < 4 ? gKick : gShuffle);
      return {
        kick: toStepLane(kick, { velocity: 0.82, gate: '16n' }),
        snare: toStepLane(section === 'DROP' ? gGhost : gSnare, { velocity: 0.76, gate: '16n' }),
        hihat: toStepLane([0,1,1,0, 1,0,1,0, 0,1,1,0, 1,0,1,0], { velocity: 0.56, gate: '16n', accentEvery: 3 })
      };
    },
    generateBass: ({ chordInfo, bar }) => toNoteLane([
      chordInfo.bass, null, null, bar % 2 === 0 ? chordInfo.bass : null,
      null, null, chordInfo.bass, null,
      chordInfo.bass, null, null, null,
      null, chordInfo.bass, null, null
    ], { velocity: 0.82, gate: '8n', slideEvery: 4 }),
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN' || section === 'DROP') {
        return toStepLane(bar % 2 === 0
          ? [0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,0,0]
          : [0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0], { velocity: 0.74, gate: '8n' });
      }
      return getStabPattern(section, bar);
    }
  };
}

export function createGenreGenerators(patternBank) {
  return {
    techno: createTechnoGenerator(patternBank),
    dnb: createDnbGenerator(patternBank),
    tropical: createTropicalGenerator(patternBank),
    dubstep: createDubstepGenerator(patternBank),
    trance: createTranceGenerator(patternBank),
    house: createHouseGenerator(patternBank),
    garage: createGarageGenerator(patternBank)
  };
}

export function generateGenrePatterns(genre, ctx, generators, patternBank) {
  const normalizedGenre = generators[genre] ? genre : 'techno';
  runtimeStepCount = getStepCountForGenre(normalizedGenre);

  if (isApproachingTransitionForGenre(normalizedGenre, ctx.bar)) {
    const fill = buildDrumFill(patternBank, normalizedGenre);
    return {
      kick: fill.kick,
      snare: fill.snare,
      hihat: fill.hihat,
      stab: getStabPattern(ctx.section, ctx.bar)
    };
  }

  const generator = generators[normalizedGenre];
  const drums = generator.generateDrums(ctx);

  return {
    kick: drums.kick,
    snare: drums.snare,
    hihat: drums.hihat,
    stab: generator.generateStabs(ctx)
  };
}

export function generateGenreSubPattern(genre, ctx, generators) {
  const normalizedGenre = generators[genre] ? genre : 'techno';
  runtimeStepCount = getStepCountForGenre(normalizedGenre);
  return generators[normalizedGenre].generateBass(ctx);
}
