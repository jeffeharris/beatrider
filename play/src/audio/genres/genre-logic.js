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
  }
};

function clonePattern(pattern) {
  return [...pattern];
}

function shiftOctave(note, delta) {
  if (!note) return note;
  return note.replace(/(\d+)/, (value) => `${Math.max(0, parseInt(value, 10) + delta)}`);
}

function getStabPattern(section, bar) {
  const stabPatterns = {
    downbeat: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    midpoint: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    upbeat: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0],
    offbeat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    rest: new Array(16).fill(0)
  };

  if (section === 'BREAK') return stabPatterns.rest;
  if (section === 'DROP') return bar % 4 === 0 ? stabPatterns.downbeat : stabPatterns.rest;
  if (section === 'BUILD') return bar % 2 === 1 ? stabPatterns.upbeat : stabPatterns.rest;
  if (section === 'MAIN') return bar % 2 === 0 ? stabPatterns.midpoint : stabPatterns.rest;
  return bar % 4 === 0 ? stabPatterns.offbeat : stabPatterns.rest;
}

export function getSectionForGenre(genre, bar) {
  const arrangement = GENRE_ARRANGEMENTS[genre] || GENRE_ARRANGEMENTS.techno;
  const cycleLength = arrangement.reduce((acc, segment) => acc + segment.length, 0);
  const position = ((bar % cycleLength) + cycleLength) % cycleLength;

  let cursor = 0;
  for (const segment of arrangement) {
    if (position < cursor + segment.length) {
      return segment.name;
    }
    cursor += segment.length;
  }

  return arrangement[arrangement.length - 1].name;
}

export function isApproachingTransitionForGenre(genre, bar) {
  const arrangement = GENRE_ARRANGEMENTS[genre] || GENRE_ARRANGEMENTS.techno;
  const cycleLength = arrangement.reduce((acc, segment) => acc + segment.length, 0);
  const position = ((bar % cycleLength) + cycleLength) % cycleLength;

  let cursor = 0;
  for (const segment of arrangement) {
    const end = cursor + segment.length - 1;
    if (position === end) {
      return true;
    }
    cursor += segment.length;
  }
  return false;
}

function buildDrumFill(patternBank, genre, bar) {
  if (genre === 'dnb') {
    const hats = bar % 2 === 0
      ? [1,1,1,1, 1,0,1,1, 1,1,1,1, 1,0,1,1]
      : new Array(16).fill(1);
    return {
      kick: clonePattern(patternBank.kick.dnb_amen),
      snare: clonePattern(patternBank.snare.dnb_roll),
      hihat: hats
    };
  }

  if (genre === 'dubstep') {
    return {
      kick: clonePattern(patternBank.kick.dubstep_roll),
      snare: clonePattern(patternBank.snare.dubstep_roll),
      hihat: [0,1,1,0, 0,1,0,1, 0,1,1,0, 0,1,0,1]
    };
  }

  return {
    kick: clonePattern(patternBank.kick.fill),
    snare: clonePattern(patternBank.snare.fill),
    hihat: new Array(16).fill(1)
  };
}

function createTechnoGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar, energy, tension }) => {
      if (section === 'DROP') {
        return {
          kick: clonePattern(bar % 8 < 4 ? patternBank.kick.chicago : patternBank.kick.detroit),
          snare: clonePattern(energy > 70 ? patternBank.snare.detroit : patternBank.snare.backbeat),
          hihat: tension > 65
            ? [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1]
            : [1,0,0,1, 1,0,1,0, 1,0,0,1, 1,0,1,0]
        };
      }

      if (section === 'MAIN') {
        const kickStyles = [patternBank.kick.fourOnFloor, patternBank.kick.berlin, patternBank.kick.detroit];
        const kick = kickStyles[Math.floor((bar / 4) % kickStyles.length)];
        const density = (energy / 100) * 0.5 + (tension / 100) * 0.5;
        const hihat = Array.from({ length: 16 }, (_, i) => {
          if (tension > 70 && i % 2 === 1) return 1;
          const laneBias = i % 4 === 0 ? 0.2 : 0;
          return Math.random() < Math.min(0.95, density + laneBias) ? 1 : 0;
        });
        return {
          kick: clonePattern(kick),
          snare: clonePattern(patternBank.snare.backbeat),
          hihat
        };
      }

      if (section === 'BUILD') {
        return {
          kick: clonePattern(patternBank.kick.halfTime),
          snare: clonePattern(patternBank.snare.minimal),
          hihat: [0,1,0,1, 0,1,0,1, 0,1,1,1, 1,1,1,1]
        };
      }

      if (section === 'BREAK') {
        return {
          kick: clonePattern(patternBank.kick.minimal),
          snare: new Array(16).fill(0),
          hihat: [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1]
        };
      }

      return {
        kick: clonePattern(patternBank.kick.halfTime),
        snare: clonePattern(patternBank.snare.minimal),
        hihat: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
      };
    },
    generateBass: ({ chordInfo }) => [
      null, chordInfo.bass, null, null,
      null, null, null, null,
      null, chordInfo.bass, null, null,
      null, null, null, null
    ],
    generateStabs: ({ section, bar }) => getStabPattern(section, bar)
  };
}

function createDnbGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar, tension }) => {
      if (section === 'BREAK') {
        return {
          kick: clonePattern(patternBank.kick.dnb_basic),
          snare: clonePattern(patternBank.snare.dnb_basic),
          hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
        };
      }

      if (section === 'DROP') {
        return {
          kick: clonePattern(patternBank.kick.dnb_jump),
          snare: clonePattern(patternBank.snare.dnb_roll),
          hihat: tension > 70
            ? new Array(16).fill(1)
            : [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1]
        };
      }

      const kick = bar % 8 < 4 ? patternBank.kick.dnb_basic : patternBank.kick.dnb_amen;
      const snare = bar % 16 >= 8 ? patternBank.snare.dnb_amen : patternBank.snare.dnb_basic;
      return {
        kick: clonePattern(kick),
        snare: clonePattern(snare),
        hihat: [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0]
      };
    },
    generateBass: ({ chordInfo, bar }) => [
      chordInfo.bass, null, null, null,
      null, null, bar % 2 === 0 ? chordInfo.bass : null, null,
      null, null, null, null,
      chordInfo.bass, null, null, bar % 2 === 0 ? chordInfo.bass : null
    ],
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN' || section === 'DROP') {
        return bar % 2 === 0
          ? [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]
          : [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0];
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
          kick: clonePattern(patternBank.kick.kygo_bounce),
          snare: clonePattern(patternBank.snare.kygo_clap),
          hihat: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1]
        };
      }

      if (section === 'BREAK') {
        return {
          kick: clonePattern(patternBank.kick.kygo_minimal),
          snare: clonePattern(patternBank.snare.kygo_snap),
          hihat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
        };
      }

      return {
        kick: clonePattern(bar % 8 < 4 ? patternBank.kick.kygo_basic : patternBank.kick.kygo_bounce),
        snare: clonePattern(bar % 4 === 0 ? patternBank.snare.kygo_clap : patternBank.snare.kygo_rim),
        hihat: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]
      };
    },
    generateBass: ({ chordInfo, bar }) => [
      chordInfo.bass, null, null, chordInfo.bass,
      null, null, bar % 2 === 0 ? chordInfo.bass : null, null,
      chordInfo.bass, null, null, chordInfo.bass,
      null, null, chordInfo.bass, null
    ],
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN') {
        return bar % 2 === 0
          ? [1,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,1,0]
          : [0,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];
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
          kick: clonePattern(patternBank.kick.dubstep_roll),
          snare: clonePattern(patternBank.snare.dubstep_trap),
          hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,0,0]
        };
      }

      if (section === 'BUILD') {
        return {
          kick: clonePattern(patternBank.kick.dubstep_half),
          snare: clonePattern(patternBank.snare.dubstep_basic),
          hihat: [0,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]
        };
      }

      return {
        kick: clonePattern(patternBank.kick.dubstep_basic),
        snare: clonePattern(patternBank.snare.dubstep_basic),
        hihat: [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]
      };
    },
    generateBass: ({ chordInfo, section, bar }) => {
      const anchor = shiftOctave(chordInfo.bass, -1);
      if (section === 'DROP') {
        return [
          anchor, null, null, null,
          null, anchor, null, null,
          anchor, null, null, null,
          null, bar % 2 === 0 ? anchor : null, null, null
        ];
      }
      return [
        anchor, null, null, null,
        null, null, null, null,
        anchor, null, null, null,
        null, null, null, null
      ];
    },
    generateStabs: ({ section }) => {
      if (section === 'DROP') {
        return [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
      }
      return new Array(16).fill(0);
    }
  };
}

function createTranceGenerator(patternBank) {
  return {
    generateDrums: ({ section, bar }) => {
      if (section === 'BUILD') {
        return {
          kick: clonePattern(patternBank.kick.trance_build),
          snare: clonePattern(patternBank.snare.trance_build),
          hihat: [1,0,1,0, 1,0,1,0, 1,0,1,1, 1,1,1,1]
        };
      }

      if (section === 'DROP') {
        return {
          kick: clonePattern(patternBank.kick.trance_uplifting),
          snare: clonePattern(patternBank.snare.trance_uplift),
          hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
        };
      }

      return {
        kick: clonePattern(patternBank.kick.trance_kick),
        snare: clonePattern(bar % 8 < 4 ? patternBank.snare.trance_clap : patternBank.snare.trance_uplift),
        hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
      };
    },
    generateBass: ({ chordInfo, bar }) => [
      chordInfo.bass, null, chordInfo.bass, null,
      chordInfo.bass, null, chordInfo.bass, null,
      chordInfo.bass, null, chordInfo.bass, null,
      bar % 2 === 0 ? chordInfo.bass : null, null, chordInfo.bass, null
    ],
    generateStabs: ({ section, bar }) => {
      if (section === 'MAIN' || section === 'DROP') {
        return bar % 2 === 0
          ? [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0]
          : [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,0];
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
    trance: createTranceGenerator(patternBank)
  };
}

export function generateGenrePatterns(genre, ctx, generators, patternBank) {
  const normalizedGenre = generators[genre] ? genre : 'techno';
  if (isApproachingTransitionForGenre(normalizedGenre, ctx.bar)) {
    const fill = buildDrumFill(patternBank, normalizedGenre, ctx.bar);
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
  return generators[normalizedGenre].generateBass(ctx);
}
