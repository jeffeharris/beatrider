import * as Tone from 'tone';
import { savedData } from '../storage.js';

const hasSecureAudioWorklet = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof window.AudioWorkletNode !== 'undefined';

function createReverbOrBypass(options) {
  if (!hasSecureAudioWorklet()) {
    return new Tone.Gain(1);
  }
  return new Tone.Reverb(options);
}

// Master chain with sidechain compression
const masterLimiter = new Tone.Limiter(-3).toDestination();

// High-pass filter for tension building (cuts bass)
export const masterHighpass = new Tone.Filter({
  frequency: 20,
  type: "highpass",
  rolloff: -24
}).connect(masterLimiter);

export const sidechain = new Tone.Compressor({
  threshold: -20,
  ratio: 8,
  attack: 0.003,
  release: 0.1
}).connect(masterHighpass);

// Instruments
export const kick = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 10,
  oscillator: { type: "sine" },
  envelope: {
    attack: 0.001,
    decay: 0.4,
    sustain: 0.01,
    release: 1.4
  }
}).connect(masterHighpass); // Kick bypasses sidechain to keep punch

export const snare = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: {
    attack: 0.001,
    decay: 0.15,
    sustain: 0
  }
}).connect(sidechain);

// Hi-hat using filtered noise for more realistic sound
export const hihatFilter = new Tone.Filter({
  frequency: 10000,
  type: "highpass"
}).connect(sidechain);

export const hihat = new Tone.NoiseSynth({
  noise: {
    type: "white"
  },
  envelope: {
    attack: 0.001,
    decay: 0.02,
    sustain: 0,
    release: 0.03
  },
  volume: -10
}).connect(hihatFilter);

// Acid with automated filter - trying to approximate 18dB slope with cascaded filters
export const acidFilter1 = new Tone.Filter({
  frequency: 800,
  type: "lowpass",
  rolloff: -12,
  Q: 4
}).connect(sidechain);

export const acidFilter2 = new Tone.Filter({
  frequency: 800,
  type: "lowpass",
  rolloff: -12,  // Can't do -6, using -12 instead
  Q: 2
}).connect(acidFilter1);

// Add distortion for that overdriven 303 sound
export const acidDistortion = new Tone.Distortion(0.3).connect(acidFilter2);

export const acid = new Tone.MonoSynth({
  oscillator: { type: "sawtooth" },
  envelope: {
    attack: 0.003,  // Faster attack
    decay: 0.2,     // Shorter decay
    sustain: 0.1,   // Lower sustain for more plucky sound
    release: 0.1
  },
  filterEnvelope: {
    attack: 0.003,
    decay: 0.4,     // Longer filter decay for that sweep
    sustain: 0.2,
    release: 0.2,
    baseFrequency: 100,  // Start lower
    octaves: 4      // More dramatic sweep
  },
  portamento: 0.05  // Add glide between notes!
}).connect(acidDistortion);

// Rave stabs with filter and reverb for space
export const stabReverb = createReverbOrBypass({
  decay: 2,
  wet: 0.3
}).connect(sidechain);

export const stabFilter = new Tone.Filter({
  frequency: 3000,  // Open up the filter more
  type: "lowpass",
  rolloff: -12,
  Q: 2
}).connect(stabReverb);

// Genre-specific stab synths
export const technoStab = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "sawtooth",
    partialCount: 3  // Fewer harmonics = softer sound
  },
  envelope: {
    attack: 0.01,    // Quick attack
    decay: 0.15,     // Slightly longer decay
    sustain: 0,      // No sustain - just decay/release
    release: 0.2     // Moderate release - musical but won't overlap too much
  },
  volume: -2       // Boost volume back up
}).connect(stabFilter);

// D&B Reese bass-style synth (detuned saws)
export const dnbReese = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "sawtooth",
    detune: 7  // Slight detune for movement
  },
  envelope: {
    attack: 0.05,
    decay: 0.3,
    sustain: 0.7,
    release: 0.5
  },
  volume: -4
}).connect(stabFilter);

// Tropical steel drum-style synth (metallic, bright attack)
export const tropicalPluck = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "sine",  // Pure tone like steel drum
    modulationType: "triangle",  // Add some metallic harmonics
    modulationIndex: 2
  },
  envelope: {
    attack: 0.001,   // Very quick attack for that steel drum "ping"
    decay: 0.4,      // Let it ring a bit
    sustain: 0.1,    // Small sustain
    release: 0.3     // Natural ring-out
  },
  volume: 2  // Boost for presence
}).connect(stabFilter);

// Current active stab synth (will switch based on genre)
export let raveSynth = technoStab;  // Default to techno

// Sub bass with EQ to prevent mud
export const subEQ = new Tone.EQ3({
  low: 3,        // Boost the deep sub frequencies
  mid: -6,       // Cut the muddy mids (100-200Hz)
  high: -12,     // Remove any high frequency content
  lowFrequency: 60,
  highFrequency: 200
}).connect(sidechain);  // Now goes through sidechain for ducking!

// Sub bass - controlled power
export const subBass = new Tone.MonoSynth({
  oscillator: { type: "sine" },
  envelope: {
    attack: 0.01,   // Faster attack for more punch
    decay: 0.3,     // Longer decay
    sustain: 0.6,   // Bit less sustain
    release: 0.5
  },
  volume: -6      // Compromise between -12 and 0
}).connect(subEQ);

// Noise riser for tension
export const noiseRiser = new Tone.Noise("white").connect(
  new Tone.Filter({
    frequency: 200,
    type: "highpass",
    rolloff: -24
  }).connect(
    new Tone.Volume(-20).connect(sidechain)
  )
);
export const riserEnvelope = new Tone.Envelope({
  attack: 8,
  decay: 0,
  sustain: 1,
  release: 0.5
});

// Musical structures
export const scale = {
  C: ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
  indices: { C: 0, D: 1, Eb: 2, F: 3, G: 4, Ab: 5, Bb: 6 }
};

// Extended chord progression with variations
export const chordProgressions = {
  main: [
    { root: "C", chord: ["C4", "Eb4", "G4"], bass: "C1", melodicFocus: ["C", "Eb", "G"] },
    { root: "C", chord: ["C4", "Eb4", "G4"], bass: "C1", melodicFocus: ["G", "Eb", "C"] },
    { root: "Bb", chord: ["Bb3", "D4", "F4"], bass: "Bb0", melodicFocus: ["Bb", "F", "D"] },
    { root: "Ab", chord: ["Ab3", "C4", "Eb4"], bass: "Ab0", melodicFocus: ["Ab", "Eb", "C"] }
  ],
  variation1: [
    { root: "C", chord: ["C4", "Eb4", "G4"], bass: "C1", melodicFocus: ["C", "G", "Eb"] },
    { root: "F", chord: ["F3", "Ab3", "C4"], bass: "F0", melodicFocus: ["F", "Ab", "C"] },
    { root: "G", chord: ["G3", "Bb3", "D4"], bass: "G0", melodicFocus: ["G", "D", "Bb"] },
    { root: "C", chord: ["C4", "Eb4", "G4"], bass: "C1", melodicFocus: ["C", "Eb", "G"] }
  ],
  variation2: [
    { root: "C", chord: ["C4", "Eb4", "G4", "Bb4"], bass: "C1", melodicFocus: ["C", "Bb", "G"] }, // Cm7
    { root: "Ab", chord: ["Ab3", "C4", "Eb4", "G4"], bass: "Ab0", melodicFocus: ["Ab", "Eb", "G"] }, // Abmaj7
    { root: "F", chord: ["F3", "Ab3", "C4", "Eb4"], bass: "F0", melodicFocus: ["F", "C", "Ab"] }, // Fm7
    { root: "G", chord: ["G3", "B3", "D4", "F4"], bass: "G0", melodicFocus: ["G", "B", "F"] } // G7
  ],
  breakdown: [
    { root: "C", chord: ["C3"], bass: "C1", melodicFocus: ["C"] }, // Just root
    { root: "C", chord: ["C3", "G3"], bass: "C1", melodicFocus: ["C", "G"] }, // Power chord
    { root: "Ab", chord: ["Ab2"], bass: "Ab0", melodicFocus: ["Ab"] }, // Just root
    { root: "G", chord: ["G2", "D3"], bass: "G0", melodicFocus: ["G", "D"] } // Power chord
  ]
};

// Select progression based on section
function getChordProgression(section) {
  if (section === 'BREAK') return chordProgressions.breakdown;
  if (section === 'DROP') return chordProgressions.variation2;
  if (currentBar % 16 < 8) return chordProgressions.main;
  return Math.random() > 0.5 ? chordProgressions.variation1 : chordProgressions.variation2;
}

// Genre configurations with appropriate BPM ranges and pattern sets
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

// Current genre (can be changed via UI)
export let currentGenre = 'techno';

// Pattern bank with classic techno/acid patterns
export const patternBank = {
  kick: {
    fourOnFloor: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    halfTime: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    syncopated: [1,0,0,0, 1,0,0,1, 0,0,1,0, 1,0,0,0],
    minimal: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    // Classic 909 kick patterns
    detroit: [1,0,0,1, 1,0,0,0, 1,0,1,0, 1,0,0,0],  // Detroit techno style
    berlin: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,0,0],   // Berlin minimal
    chicago: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],  // Chicago acid house
    fill: [1,0,1,0, 1,0,1,1, 1,1,1,0, 1,1,1,1],
    // Drum & Bass patterns (breakbeat style)
    dnb_basic: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // Basic D&B kick
    dnb_amen: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],   // Amen-inspired
    dnb_jump: [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,1],    // Jump-up style
    // Tropical/Kygo patterns (dembow/reggaeton influenced)
    kygo_basic: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],  // Basic tropical house
    kygo_bounce: [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,1,0,0], // Bouncy Kygo style
    kygo_minimal: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], // Sparse tropical
    // Dubstep patterns (half-time feel at 140 BPM)
    dubstep_basic: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], // Classic dubstep
    dubstep_half: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],  // Ultra minimal
    dubstep_roll: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],  // Rolling subs
    // Trance patterns (driving four-on-floor)
    trance_kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],   // Classic trance
    trance_build: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],  // Build-up pattern
    trance_uplifting: [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,0,1] // Uplifting variation
  },
  snare: {
    backbeat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    ghost: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
    detroit: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],  // Off-beat snare
    fill: [0,0,0,0, 1,0,1,0, 1,0,1,1, 1,1,1,1],
    minimal: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    // Drum & Bass snare patterns (heavy on 2 and 4)
    dnb_basic: [0,0,1,0, 1,0,0,0, 0,1,0,0, 1,0,0,0],   // Classic D&B snare
    dnb_amen: [0,0,1,0, 1,0,0,1, 0,0,1,0, 1,0,1,0],    // Amen break style
    dnb_roll: [0,0,1,0, 1,0,1,1, 0,0,1,0, 1,1,1,1],    // Rolling snares
    // Tropical/Kygo snare patterns (lighter, more sparse)
    kygo_clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],   // Simple clap on 2&4
    kygo_snap: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],   // Finger snaps
    kygo_rim: [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0],    // Rimshot pattern
    // Dubstep snare patterns (heavy on the 3)
    dubstep_basic: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Classic dubstep snare
    dubstep_trap: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],  // Trap-influenced
    dubstep_roll: [0,0,0,0, 0,0,0,0, 1,0,1,1, 0,0,0,0],  // Snare rolls
    // Trance snare patterns (uplifting, driving)
    trance_clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],   // Standard clap
    trance_build: [0,0,0,0, 1,0,0,1, 0,0,1,0, 1,0,1,1],  // Building energy
    trance_uplift: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0]  // Uplifting pattern
  },
  // Classic acid bassline patterns (rhythm only, notes added later)
  acid: {
    // Phuture - Acid Tracks style
    phuture: [1,0,1,0, 1,0,0,1, 1,0,1,0, 0,1,0,1],
    // Josh Wink - Higher State of Consciousness style
    wink: [1,1,0,1, 0,1,1,0, 1,0,1,1, 0,0,1,0],
    // Hardfloor style
    hardfloor: [1,0,0,1, 1,0,1,0, 0,1,0,1, 1,0,0,0],
    // DJ Pierre style
    pierre: [1,0,1,1, 0,0,1,0, 1,1,0,1, 0,0,1,0],
    // Minimal acid
    minimal: [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
    // Random busy pattern
    busy: [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,0,1,1]
  }
};

// State
export let currentBar = 0;
window.currentBar = 0; // Expose globally for game
export let currentChordIndex = 0;
export let currentProgression = null;
export let acidSequence = [];
export let energyLevel = 50;
export let tensionLevel = 30;
export let lastSection = '';
export let isTransitioning = false;
export let riserActive = false;

// Setter functions for mutable state (needed because ES module live bindings
// can only be reassigned from within the module that declares them)
export function setCurrentBar(v) { currentBar = v; window.currentBar = v; }
export function setCurrentChordIndex(v) { currentChordIndex = v; }
export function setCurrentProgression(v) { currentProgression = v; }
export function setEnergyLevel(v) { energyLevel = v; }
export function setTensionLevel(v) { tensionLevel = v; }
export function setLastSection(v) { lastSection = v; }
export function setCurrentGenre(v) { currentGenre = v; }
export function setRaveSynth(v) { raveSynth = v; }
export function setRiserActive(v) { riserActive = v; }

// Mute states - initialized from saved data
export const muteStates = {
  kick: savedData.settings?.trackMutes?.kick || false,
  snare: savedData.settings?.trackMutes?.snare || false,
  hat: savedData.settings?.trackMutes?.hat || false,
  acid: savedData.settings?.trackMutes?.acid || false,
  stab: savedData.settings?.trackMutes?.stab || false,
  sub: savedData.settings?.trackMutes?.sub || false
};

// Humanization - adds micro-timing variations
export function humanize(time, amount = 0.01) {
  // Add random timing offset between -amount and +amount seconds
  return time + (Math.random() - 0.5) * amount * 2;
}

// Visual feedback
export function flashIndicator(id) {
  // Flash the minimized track square
  const trackName = id.replace('Indicator', '');
  const square = document.getElementById(trackName + 'Square');
  if (square && !muteStates[trackName]) {
    square.classList.add('flash');
    setTimeout(() => square.classList.remove('flash'), 100);
  }
}

// Generate melodic acid sequence using classic patterns
export function generateMelodicAcidSequence(chordInfo, section, previousSequence = []) {
  const sequence = [];
  const octave = section === 'DROP' ? 3 : 2;

  // Select rhythm pattern based on section
  let rhythmPattern;
  if (section === 'DROP') {
    // Use classic acid patterns for drops
    const patterns = [patternBank.acid.phuture, patternBank.acid.wink, patternBank.acid.hardfloor];
    rhythmPattern = patterns[Math.floor(Math.random() * patterns.length)];
  } else if (section === 'BUILD') {
    rhythmPattern = patternBank.acid.pierre;
  } else if (section === 'BREAK') {
    rhythmPattern = patternBank.acid.minimal;
  } else {
    // Main section varies
    rhythmPattern = Math.random() > 0.5 ? patternBank.acid.hardfloor : patternBank.acid.phuture;
  }

  // Use chord tones as anchors
  const chordTones = chordInfo.melodicFocus;
  let lastNote = previousSequence.length > 0 ? previousSequence[previousSequence.length - 1] : null;

  for (let i = 0; i < 16; i++) {
    if (rhythmPattern[i]) {
      let note;

      // Strong beats (0, 4, 8, 12) favor chord tones
      if (i % 4 === 0) {
        note = chordTones[Math.floor(Math.random() * chordTones.length)] + octave;
      } else if (lastNote && Math.random() > 0.3) {
        // Stepwise motion from last note for that 303 feel
        const lastPitch = lastNote.replace(/\d/, '');
        const lastOctave = parseInt(lastNote.replace(/\D/g, ''));
        const scaleIndex = scale.indices[lastPitch];

        if (scaleIndex !== undefined) {
          // Classic 303 often moves in small steps
          const direction = Math.random() > 0.5 ? 1 : -1;
          const stepSize = Math.random() > 0.7 ? 2 : 1; // Occasionally jump a third
          const newIndex = (scaleIndex + direction * stepSize + 7) % 7;
          note = scale.C[newIndex] + lastOctave;
        } else {
          note = chordTones[Math.floor(Math.random() * chordTones.length)] + octave;
        }
      } else {
        // Random scale note
        note = scale.C[Math.floor(Math.random() * scale.C.length)] + octave;
      }

      sequence.push(note);
      lastNote = note;
    } else {
      sequence.push(null);
    }
  }

  return sequence;
}

// Generate drum fill
export function generateDrumFill() {
  return {
    kick: patternBank.kick.fill,
    snare: patternBank.snare.fill,
    hihat: new Array(16).fill(1) // Rapid hi-hats
  };
}

// Get section
export function getSection(bar) {
  const pos = bar % 64;
  if (pos < 8) return 'INTRO';
  if (pos < 16) return 'BUILD';
  if (pos < 32) return 'MAIN';
  if (pos < 40) return 'BREAK';
  if (pos < 56) return 'DROP';
  return 'OUTRO';
}

// Check if we're approaching a section change
export function isApproachingTransition(bar) {
  const pos = bar % 64;
  const transitionBars = [7, 15, 31, 39, 55, 63];
  return transitionBars.includes(pos);
}

// Generate patterns based on section and energy
export function generatePatterns(section, bar, energy) {
  const patterns = {};
  const isFill = isApproachingTransition(bar);

  if (isFill) {
    // Drum fill before section change
    const fill = generateDrumFill();
    patterns.kick = fill.kick;
    patterns.snare = fill.snare;
    patterns.hihat = fill.hihat;
  } else {
    // Use genre-specific patterns based on section
    const genreConfig = GENRE_CONFIGS[currentGenre];

    if (section === 'DROP') {
      // Drop section - use genre-specific intense patterns
      if (currentGenre === 'dnb') {
        patterns.kick = patternBank.kick.dnb_jump;
        patterns.snare = patternBank.snare.dnb_roll;
      } else if (currentGenre === 'tropical') {
        patterns.kick = patternBank.kick.kygo_bounce;
        patterns.snare = patternBank.snare.kygo_clap;
      } else {
        patterns.kick = Math.random() > 0.5 ? patternBank.kick.chicago : patternBank.kick.detroit;
        patterns.snare = energy > 70 ? patternBank.snare.detroit : patternBank.snare.backbeat;
      }
    } else if (section === 'MAIN') {
      // Main section - rotate through genre patterns
      if (currentGenre === 'dnb') {
        const dnbKicks = [patternBank.kick.dnb_basic, patternBank.kick.dnb_amen];
        patterns.kick = dnbKicks[Math.floor((bar / 4) % dnbKicks.length)];
        patterns.snare = patternBank.snare.dnb_basic;
      } else if (currentGenre === 'tropical') {
        patterns.kick = patternBank.kick.kygo_basic;
        patterns.snare = patternBank.snare.kygo_rim;
      } else if (currentGenre === 'dubstep') {
        patterns.kick = patternBank.kick.dubstep_basic;
        patterns.snare = patternBank.snare.dubstep_basic;
      } else if (currentGenre === 'trance') {
        patterns.kick = patternBank.kick.trance_kick;
        patterns.snare = patternBank.snare.trance_clap;
      } else {
        const kickStyles = [patternBank.kick.fourOnFloor, patternBank.kick.berlin, patternBank.kick.detroit];
        patterns.kick = kickStyles[Math.floor((bar / 4) % kickStyles.length)];
        patterns.snare = patternBank.snare.backbeat;
      }
    } else if (section === 'BUILD') {
      patterns.kick = patternBank.kick.halfTime;
      patterns.snare = patternBank.snare.minimal;
    } else if (section === 'BREAK') {
      patterns.kick = patternBank.kick.minimal;
      patterns.snare = new Array(16).fill(0);
    } else {
      patterns.kick = patternBank.kick.halfTime;
      patterns.snare = patternBank.snare.minimal;
    }

    // Hi-hat patterns based on genre
    if (currentGenre === 'dnb') {
      // D&B has rapid, intricate hi-hats
      if (tensionLevel > 70) {
        patterns.hihat = new Array(16).fill(1); // Constant ride at high tension
      } else {
        patterns.hihat = [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1]; // D&B shuffle
      }
    } else if (currentGenre === 'tropical') {
      // Tropical has sparse, laid-back hi-hats
      if (section === 'DROP') {
        patterns.hihat = [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1]; // Shaker pattern
      } else {
        patterns.hihat = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]; // Quarter notes
      }
    } else if (currentGenre === 'dubstep') {
      // Dubstep has minimal, sparse hi-hats
      patterns.hihat = [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]; // Very sparse
    } else if (currentGenre === 'trance') {
      // Trance has steady, driving hi-hats
      patterns.hihat = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]; // Steady 8ths
    } else {
      // Techno - dynamic based on energy AND tension
      patterns.hihat = [];
      const hihatDensity = (energy / 100) * 0.5 + (tensionLevel / 100) * 0.5;
      for (let i = 0; i < 16; i++) {
        // More rapid hits at high tension
        if (tensionLevel > 70 && i % 2 === 1) {
          patterns.hihat[i] = 1; // Constant 16ths at high tension
        } else {
          patterns.hihat[i] = Math.random() < hihatDensity ? 1 : 0;
        }
      }
    }
  }

  // Stab patterns that complement the acid line
  // Look at where acid pattern has gaps and fill them
  const acidDensity = acidSequence ? acidSequence.filter(n => n).length : 8;

  const stabPatterns = [
    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // Single hit on downbeat
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Single hit midway
    [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0], // Single hit on upbeat
    new Array(16).fill(0) // Rest
  ];

  // Simplified - sparse stabs for impact
  if (section === 'BREAK') {
    patterns.stab = stabPatterns[3]; // No stabs in break
  } else if (section === 'DROP') {
    // Hit on first bar of drop for impact
    patterns.stab = (bar % 4 === 0) ? stabPatterns[0] : stabPatterns[3];
  } else if (section === 'BUILD') {
    // Occasional stab to build tension
    patterns.stab = (bar % 2 === 1) ? stabPatterns[2] : stabPatterns[3];
  } else if (section === 'MAIN') {
    // Every other bar
    patterns.stab = (bar % 2 === 0) ? stabPatterns[1] : stabPatterns[3];
  } else {
    // INTRO/OUTRO - very minimal
    patterns.stab = (bar % 4 === 0) ? stabPatterns[1] : stabPatterns[3];
  }

  return patterns;
}

// Sequences
let kickLoop, snareLoop, hihatLoop, acidLoop, chordLoop, subLoop;

export function updatePatterns(startTime = 0) {
  const section = getSection(currentBar);

  // Update progression if needed
  if (!currentProgression || currentBar % 8 === 0) {
    currentProgression = getChordProgression(section);
  }
  const chordInfo = currentProgression[currentChordIndex % currentProgression.length];

  // Generate melodic acid sequence FIRST
  if (currentBar % 2 === 0) {
    acidSequence = generateMelodicAcidSequence(chordInfo, section, acidSequence);
    // Pattern displays were removed with minimized UI
  }

  // THEN generate patterns (so stabs can respond to acid)
  const patterns = generatePatterns(section, currentBar, energyLevel);

  // Clear and recreate sequences
  if (kickLoop) kickLoop.dispose();
  if (snareLoop) snareLoop.dispose();
  if (hihatLoop) hihatLoop.dispose();
  if (acidLoop) acidLoop.dispose();
  if (chordLoop) chordLoop.dispose();
  if (subLoop) subLoop.dispose();

  // Kick with micro-timing
  kickLoop = new Tone.Sequence((time, note) => {
    if (note && !muteStates.kick) {
      // Slight timing variation, but keep kick more stable
      const humanTime = humanize(time, 0.003);
      kick.triggerAttackRelease("C1", "8n", humanTime);
      sidechain.ratio.setValueAtTime(20, humanTime);
      sidechain.ratio.linearRampToValueAtTime(8, humanTime + 0.1);
      Tone.Draw.schedule(() => {
        flashIndicator('kickIndicator');
        // Trigger game beat event
        if (window.GameAPI && window.GameAPI.onBeat) {
          window.GameAPI.onBeat();
        }
      }, humanTime);
    }
  }, patterns.kick, "16n");

  // Snare with more looseness
  snareLoop = new Tone.Sequence((time, note) => {
    if (note && !muteStates.snare) {
      const humanTime = humanize(time, 0.005);
      snare.triggerAttackRelease("8n", humanTime);
      Tone.Draw.schedule(() => {
        flashIndicator('snareIndicator');
        // Trigger different enemy type on snare
        if (window.GameAPI && window.GameAPI.onSnare) {
          window.GameAPI.onSnare();
        }
      }, humanTime);
    }
  }, patterns.snare, "16n");

  // Hi-hat with most variation
  hihatLoop = new Tone.Sequence((time, note) => {
    if (note && !muteStates.hat) {
      const humanTime = humanize(time, 0.008);
      // Vary between closed and open hi-hats
      const velocity = 0.3 + Math.random() * 0.4;
      const duration = Math.random() > 0.8 ? "16n" : "32n"; // Occasional longer hat
      hihat.triggerAttackRelease(duration, humanTime);
      hihat.volume.setValueAtTime(-15 + (velocity * 10), humanTime); // Subtle volume variation
      Tone.Draw.schedule(() => {
        flashIndicator('hatIndicator');
        // Spawn obstacles on some hi-hat hits
        if (Math.random() < 0.2 && window.GameAPI && window.GameAPI.onHihat) {
          window.GameAPI.onHihat();
        }
      }, humanTime);
    }
  }, patterns.hihat, "16n");

  // Acid with melodic sequence - slight timing variations and accent
  acidLoop = new Tone.Sequence((time, note, index) => {
    if (note && !muteStates.acid) {
      const humanTime = humanize(time, 0.004);
      // Add accent to some notes (first beat of each group and random others)
      const isAccent = index % 4 === 0 || (Math.random() > 0.85 && tensionLevel > 50);

      if (isAccent) {
        // Accent: louder with more filter modulation
        acid.volume.value = 3;
        acid.filterEnvelope.octaves = 5;
        acidDistortion.wet.value = 0.7;
      } else {
        acid.volume.value = 0;
        acid.filterEnvelope.octaves = 4;
        acidDistortion.wet.value = 0.5;
      }

      acid.triggerAttackRelease(note, "16n", humanTime);
      Tone.Draw.schedule(() => {
        flashIndicator('acidIndicator');
        // Spawn power-up occasionally
        if (Math.random() < 0.1 && window.GameAPI && window.GameAPI.onAcid) {
          window.GameAPI.onAcid();
        }
      }, humanTime);
    }
  }, acidSequence, "16n");

  // Stabs with slight spread and filter variation
  chordLoop = new Tone.Sequence((time, hit, index) => {
    if (hit && !muteStates.stab) {
      const humanTime = humanize(time, 0.006);

      // Vary the filter based on section
      const currentSection = getSection(currentBar);
      if (currentSection === 'DROP') {
        stabFilter.frequency.setValueAtTime(3500, humanTime);
      } else if (currentSection === 'BUILD') {
        // Gradually open filter in builds
        stabFilter.frequency.exponentialRampToValueAtTime(2500, humanTime + 0.2);
      } else {
        stabFilter.frequency.setValueAtTime(2000, humanTime);
      }

      // Choose chord voicing based on what acid is doing
      // If acid is playing high, play stabs lower and vice versa
      const acidNote = acidSequence[index];
      let chordToPlay = chordInfo.chord;

      if (acidNote && acidNote.includes('3')) {
        // Acid is high, play stabs an octave lower
        chordToPlay = chordInfo.chord.map(note =>
          note.replace(/(\d)/, (match) => parseInt(match) - 1)
        );
      }

      // Simple - just play the chord once with slight strum
      chordToPlay.forEach((note, i) => {
        const noteTime = humanTime + i * 0.015; // Slight strum
        raveSynth.triggerAttackRelease(note, "4n", noteTime); // Longer note for reverb tail
      });

      Tone.Draw.schedule(() => {
        flashIndicator('stabIndicator');
        // Spawn drifter enemy
        if (window.GameAPI && window.GameAPI.onStab) {
          window.GameAPI.onStab();
        }
      }, humanTime);
    }
  }, patterns.stab, "16n");

  // Sub bass pattern - genre-specific
  let subPattern;
  if (currentGenre === 'dnb') {
    // D&B: Long sustained sub-bass notes, often sliding
    subPattern = [
      chordInfo.bass, null, null, null,
      null, null, null, null,
      null, null, null, null,
      chordInfo.bass, null, null, null
    ];
  } else if (currentGenre === 'tropical') {
    // Tropical: Bouncing, syncopated bass following dembow rhythm
    subPattern = [
      chordInfo.bass, null, null, chordInfo.bass,
      null, null, chordInfo.bass, null,
      chordInfo.bass, null, null, chordInfo.bass,
      null, null, chordInfo.bass, null
    ];
  } else {
    // Techno: Offset from kick to avoid mud
    subPattern = [
      null, chordInfo.bass, null, null,  // Offset by one 16th
      null, null, null, null,
      null, chordInfo.bass, null, null,  // Offset by one 16th
      null, null, null, null
    ];
  }
  subLoop = new Tone.Sequence((time, note) => {
    if (note && !muteStates.sub) {
      const humanTime = humanize(time, 0.002); // Very slight timing variation
      // Play longer note that sustains
      subBass.triggerAttackRelease(note, "2n", humanTime);
      // Add a subtle octave above for presence (only in drops)
      const currentSection = getSection(currentBar);
      if (currentSection === 'DROP' || currentSection === 'MAIN') {
        const octaveUp = note.replace(/\d/, (match) => parseInt(match) + 1);
        subBass.triggerAttackRelease(octaveUp, "2n", humanTime + 0.01, 0.3); // Quieter octave
      }
      Tone.Draw.schedule(() => {
        flashIndicator('subIndicator');
        // Pulse the grid
        if (window.GameAPI && window.GameAPI.onSub) {
          window.GameAPI.onSub();
        }
      }, humanTime);
    }
  }, subPattern, "16n");

  kickLoop.start(startTime);
  snareLoop.start(startTime);
  hihatLoop.start(startTime);
  acidLoop.start(startTime);
  chordLoop.start(startTime);
  subLoop.start(startTime);
}

// Apply tension to parameters
export function applyTension() {
  const now = Tone.now();

  // Both acid filters open with tension
  const baseFreq = 300 + (tensionLevel * 15);
  const targetFreq = baseFreq + (tensionLevel * 25);
  acidFilter1.frequency.linearRampToValueAtTime(targetFreq, now + 0.5);
  acidFilter2.frequency.linearRampToValueAtTime(targetFreq * 0.9, now + 0.5);  // Slightly offset
  acidFilter1.Q.value = 4 + (tensionLevel / 100) * 12;
  acidFilter2.Q.value = 2 + (tensionLevel / 100) * 4;

  // Increase distortion with tension
  acidDistortion.distortion = 0.3 + (tensionLevel / 100) * 0.4;

  // Master highpass rises with extreme tension
  if (tensionLevel > 80) {
    masterHighpass.frequency.exponentialRampToValueAtTime(100 + (tensionLevel - 80) * 10, now + 0.5);
  } else {
    masterHighpass.frequency.exponentialRampToValueAtTime(20, now + 0.5);
  }

  // Sidechain gets more aggressive
  sidechain.ratio.value = 8 + (tensionLevel / 100) * 12;

  // Start/stop noise riser
  if (tensionLevel > 60 && !riserActive) {
    noiseRiser.start();
    riserEnvelope.triggerAttack();
    riserActive = true;
  } else if (tensionLevel <= 60 && riserActive) {
    riserEnvelope.triggerRelease();
    setTimeout(() => noiseRiser.stop(), 500);
    riserActive = false;
  }

  // Riser volume follows tension
  if (riserActive) {
    noiseRiser.volume.value = -40 + (tensionLevel - 60) * 0.5;
  }
}

// Automation curves for smooth transitions
function applyAutomation(section, prevSection) {
  const now = Tone.now();

  // Filter automation for both cascaded filters
  if (section === 'DROP' && prevSection !== 'DROP') {
    acidFilter1.frequency.exponentialRampToValueAtTime(2000, now + 2);
    acidFilter2.frequency.exponentialRampToValueAtTime(1800, now + 2);
    acidFilter1.Q.linearRampToValueAtTime(15, now + 2);
    acidDistortion.distortion = 0.6;
  } else if (section === 'BREAK') {
    acidFilter1.frequency.exponentialRampToValueAtTime(400, now + 1);
    acidFilter2.frequency.exponentialRampToValueAtTime(400, now + 1);
    acidFilter1.Q.linearRampToValueAtTime(5, now + 1);
    acidDistortion.distortion = 0.2;
  } else if (section === 'BUILD') {
    acidFilter1.frequency.exponentialRampToValueAtTime(1200, now + 4);
    acidFilter2.frequency.exponentialRampToValueAtTime(1100, now + 4);
  }
}

// Main evolution function
export function evolve(scheduleTime) {
  const section = getSection(currentBar);
  const nextBar = (currentBar + 1) % 64;
  const nextSection = getSection(nextBar);

  // Update displays
  document.getElementById('section').textContent = section;
  document.getElementById('bar').textContent = currentBar;
  const currentChord = currentProgression ? currentProgression[currentChordIndex % currentProgression.length] : { root: 'C' };
  document.getElementById('chord').textContent = currentChord.root + (currentChord.chord.length > 3 ? '7' : 'm');

  // Calculate next transition
  const barsUntilNext = nextSection !== section ? 1 :
    nextBar < 8 ? 8 - nextBar :
    nextBar < 16 ? 16 - nextBar :
    nextBar < 32 ? 32 - nextBar :
    nextBar < 40 ? 40 - nextBar :
    nextBar < 56 ? 56 - nextBar :
    64 - nextBar;
  document.getElementById('nextSection').textContent =
    nextSection !== section ? `${nextSection} next bar` :
    `${getSection(currentBar + barsUntilNext)} in ${barsUntilNext} bars`;

  // Apply automation on section changes
  if (section !== lastSection) {
    applyAutomation(section, lastSection);
    lastSection = section;
  }

  // Update patterns every bar
  if (currentBar % 1 === 0) {
    updatePatterns(scheduleTime ?? 0);
  }

  // Apply tension continuously
  applyTension();

  // Vary chord progression rate based on section (already declared above)
  if (section === 'DROP' || section === 'MAIN') {
    // Change chord every 2 bars for more movement
    if (currentBar % 2 === 0) {
      currentChordIndex = (currentChordIndex + 1) % (currentProgression ? currentProgression.length : 4);
    }
  } else if (section === 'BREAK') {
    // Stay on same chord for whole break - hypnotic
    currentChordIndex = 0;
  } else {
    // Normal progression every 4 bars
    if (currentBar % 4 === 0) {
      currentChordIndex = (currentChordIndex + 1) % (currentProgression ? currentProgression.length : 4);
    }
  }

  currentBar = (currentBar + 1) % 64;
  window.currentBar = currentBar;
}

let transportScheduled = false;
export function ensureTransportScheduled() {
  if (transportScheduled) return;
  Tone.Transport.scheduleRepeat((time) => evolve(time), "1m");
  transportScheduled = true;
}
