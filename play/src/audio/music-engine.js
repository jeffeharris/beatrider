import * as Tone from 'tone';
import { savedData } from '../storage.js';
import {
  GENRE_CONFIGS as GENRE_CONFIGS_BASE,
  GENRE_SCENES,
  createGenreGenerators,
  generateGenrePatterns,
  generateGenreSubPattern,
  adaptBinaryPatternToStepCount,
  getStepCountForGenre,
  isNative24Enabled,
  setNative24Enabled,
  getSectionForGenre,
  getBarsUntilNextSectionForGenre,
  isApproachingTransitionForGenre,
  STEP_COUNT
} from './genres/genre-logic.js';
import { isAudioDebugEnabled, logAudioDebug } from './debug-log.js';

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
export const GENRE_CONFIGS = GENRE_CONFIGS_BASE;

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
    trance_uplifting: [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,0,1], // Uplifting variation
    // House patterns
    house_classic: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    house_drive: [1,0,0,1, 1,0,0,0, 1,0,0,1, 1,0,0,0],
    house_shuffle: [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],
    // UK Garage patterns
    garage_2step: [1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,1,0],
    garage_shuffle: [1,0,0,1, 0,0,1,0, 0,1,0,0, 0,0,1,0],
    garage_sparse: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,1]
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
    trance_uplift: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],  // Uplifting pattern
    // House/garage extras
    house_clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    house_ghost: [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
    garage_clap: [0,0,0,0, 1,0,0,0, 0,0,0,1, 1,0,0,0],
    garage_ghost: [0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,1]
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
const genreGenerators = createGenreGenerators(patternBank);

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
let currentSceneHumanize = { kick: 0.003, snare: 0.005, hihat: 0.008, acid: 0.004, stab: 0.006, sub: 0.002 };

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
export function setNative24ModeEnabled(v) { setNative24Enabled(v); }
export function isNative24ModeEnabled() { return isNative24Enabled(); }
let audioMetricsEnabled = false;
let lastMetricsLoggedBar = -1;
export function setAudioMetricsEnabled(v) { audioMetricsEnabled = !!v; }
export function isAudioMetricsEnabled() { return audioMetricsEnabled; }

function setParamAtTime(param, value, atTime) {
  if (!param || typeof value !== 'number') return;
  if (typeof atTime === 'number' && typeof param.setValueAtTime === 'function') {
    param.setValueAtTime(value, atTime);
    return;
  }
  param.value = value;
}

export function applyGenreScene(genre = currentGenre, atTime) {
  const scene = GENRE_SCENES[genre] || GENRE_SCENES.techno;
  const time = typeof atTime === 'number' ? atTime : undefined;

  if (scene.raveSynth === 'dnbReese') {
    setRaveSynth(dnbReese);
  } else if (scene.raveSynth === 'tropicalPluck') {
    setRaveSynth(tropicalPluck);
  } else {
    setRaveSynth(technoStab);
  }

  if (kick?.oscillator?.frequency) {
    setParamAtTime(kick.oscillator.frequency, scene.kick.frequency, time);
  }
  if (typeof scene.kick.octaves === 'number') {
    kick.octaves = scene.kick.octaves;
  }

  setParamAtTime(hihatFilter.frequency, scene.hihat.highpass, time);
  setParamAtTime(sidechain.ratio, scene.sidechain.ratio, time);
  setParamAtTime(sidechain.threshold, scene.sidechain.threshold, time);
  setParamAtTime(stabReverb.wet, scene.stab.wet, time);
  setParamAtTime(stabFilter.frequency, scene.stab.lowpass, time);
  setParamAtTime(acidDistortion.wet, scene.acid.drive, time);

  if (typeof scene.sub.low === 'number') subEQ.low.value = scene.sub.low;
  if (typeof scene.sub.mid === 'number') subEQ.mid.value = scene.sub.mid;
  if (typeof scene.sub.high === 'number') subEQ.high.value = scene.sub.high;
  if (typeof scene.sub.volume === 'number') subBass.volume.value = scene.sub.volume;

  currentSceneHumanize = scene.humanize || currentSceneHumanize;
}

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
  const pattern24 = adaptBinaryPatternToStepCount(rhythmPattern, activeStepCount);

  // Use chord tones as anchors
  const chordTones = chordInfo.melodicFocus;
  let lastNote = previousSequence.length > 0 ? previousSequence[previousSequence.length - 1] : null;

  for (let i = 0; i < activeStepCount; i++) {
    if (pattern24[i]) {
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
    hihat: new Array(activeStepCount).fill(1) // Rapid hi-hats
  };
}

// Get section
export function getSection(bar) {
  return getSectionForGenre(currentGenre, bar);
}

// Check if we're approaching a section change
export function isApproachingTransition(bar) {
  return isApproachingTransitionForGenre(currentGenre, bar);
}

// Generate patterns based on section and energy
export function generatePatterns(section, bar, energy) {
  return generateGenrePatterns(
    currentGenre,
    {
      section,
      bar,
      energy,
      tension: tensionLevel,
      chordInfo: currentChordInfo,
      acidSequence
    },
    genreGenerators,
    patternBank
  );
}

// Sequences
let kickLoop, snareLoop, hihatLoop, acidLoop, chordLoop, subLoop;
let loopsStarted = false;
let lastSequenceCallbackTime = 0;
let activeStepCount = STEP_COUNT;
let activeStepSubdivision = "16n";
let stepSequence = Array.from({ length: activeStepCount }, (_, i) => i);
let currentKickPattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '16n', accent: false, slide: false });
let currentSnarePattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '16n', accent: false, slide: false });
let currentHihatPattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '16n', accent: false, slide: false });
let currentStabPattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '8n', accent: false, slide: false });
let currentSubPattern = new Array(activeStepCount).fill({ note: null, velocity: 0, gate: '8n', accent: false, slide: false });
let currentChordInfo = { root: "C", chord: ["C4", "Eb4", "G4"], bass: "C1", melodicFocus: ["C", "Eb", "G"] };

function activeSubdivisionForStepCount(stepCount) {
  return stepCount === 24 ? "16t" : "16n";
}

function resetLoopGrid(stepCount) {
  const nextCount = typeof stepCount === 'number' && stepCount > 0 ? stepCount : STEP_COUNT;
  if (nextCount === activeStepCount) return;

  const stopAt = Tone.now() + 0.01;
  [kickLoop, snareLoop, hihatLoop, acidLoop, chordLoop, subLoop].forEach((loop) => {
    if (!loop) return;
    try {
      loop.stop(stopAt);
      loop.dispose();
    } catch (_e) {
      // Ignore disposal issues; loops will be recreated.
    }
  });

  kickLoop = null;
  snareLoop = null;
  hihatLoop = null;
  acidLoop = null;
  chordLoop = null;
  subLoop = null;
  loopsStarted = false;

  activeStepCount = nextCount;
  activeStepSubdivision = activeSubdivisionForStepCount(activeStepCount);
  stepSequence = Array.from({ length: activeStepCount }, (_, i) => i);
  currentKickPattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '16n', accent: false, slide: false });
  currentSnarePattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '16n', accent: false, slide: false });
  currentHihatPattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '16n', accent: false, slide: false });
  currentStabPattern = new Array(activeStepCount).fill({ on: false, velocity: 0, gate: '8n', accent: false, slide: false });
  currentSubPattern = new Array(activeStepCount).fill({ note: null, velocity: 0, gate: '8n', accent: false, slide: false });
}

function toStepEvent(step) {
  if (step && typeof step === 'object' && Object.prototype.hasOwnProperty.call(step, 'on')) {
    return {
      on: !!step.on,
      velocity: typeof step.velocity === 'number' ? Math.max(0, Math.min(1, step.velocity)) : 0.75,
      gate: typeof step.gate === 'string' ? step.gate : '16n',
      accent: !!step.accent,
      slide: !!step.slide
    };
  }
  if (typeof step === 'number') {
    return { on: !!step, velocity: step ? 0.75 : 0, gate: '16n', accent: false, slide: false };
  }
  return { on: false, velocity: 0, gate: '16n', accent: false, slide: false };
}

function toSubEvent(step) {
  if (step && typeof step === 'object' && Object.prototype.hasOwnProperty.call(step, 'note')) {
    return {
      note: step.note || null,
      velocity: typeof step.velocity === 'number' ? Math.max(0, Math.min(1, step.velocity)) : 0.8,
      gate: typeof step.gate === 'string' ? step.gate : '8n',
      accent: !!step.accent,
      slide: !!step.slide
    };
  }
  if (typeof step === 'string') {
    return { note: step, velocity: 0.8, gate: '8n', accent: false, slide: false };
  }
  return { note: null, velocity: 0, gate: '8n', accent: false, slide: false };
}

function computeSubPattern(chordInfo) {
  return generateGenreSubPattern(
    currentGenre,
    {
      section: getSection(currentBar),
      bar: currentBar,
      chordInfo
    },
    genreGenerators
  );
}

function ensureLoopsCreated() {
  if (kickLoop && snareLoop && hihatLoop && acidLoop && chordLoop && subLoop) {
    return;
  }

  // Kick with micro-timing
  kickLoop = new Tone.Sequence((time, step) => {
    lastSequenceCallbackTime = time;
    const event = toStepEvent(currentKickPattern[step]);
    if (event.on && !muteStates.kick) {
      const humanTime = humanize(time, currentSceneHumanize.kick);
      kick.triggerAttackRelease("C1", event.gate || "16n", humanTime, event.velocity || 0.8);
      sidechain.ratio.setValueAtTime(20, humanTime);
      sidechain.ratio.linearRampToValueAtTime(8, humanTime + 0.1);
      Tone.Draw.schedule(() => {
        flashIndicator('kickIndicator');
        if (window.GameAPI && window.GameAPI.onBeat) {
          window.GameAPI.onBeat();
        }
      }, humanTime);
    }
  }, stepSequence, activeStepSubdivision);

  // Snare with more looseness
  snareLoop = new Tone.Sequence((time, step) => {
    lastSequenceCallbackTime = time;
    const event = toStepEvent(currentSnarePattern[step]);
    if (event.on && !muteStates.snare) {
      const humanTime = humanize(time, currentSceneHumanize.snare);
      snare.triggerAttackRelease(event.gate || "16n", humanTime, event.velocity || 0.75);
      Tone.Draw.schedule(() => {
        flashIndicator('snareIndicator');
        if (window.GameAPI && window.GameAPI.onSnare) {
          window.GameAPI.onSnare();
        }
      }, humanTime);
    }
  }, stepSequence, activeStepSubdivision);

  // Hi-hat with most variation
  hihatLoop = new Tone.Sequence((time, step) => {
    lastSequenceCallbackTime = time;
    const event = toStepEvent(currentHihatPattern[step]);
    if (event.on && !muteStates.hat) {
      const humanTime = humanize(time, currentSceneHumanize.hihat);
      const velocity = Math.max(0.2, event.velocity || 0.5);
      const duration = event.gate || "16n";
      hihat.triggerAttackRelease(duration, humanTime);
      hihat.volume.setValueAtTime(-15 + (velocity * 10), humanTime);
      Tone.Draw.schedule(() => {
        flashIndicator('hatIndicator');
        if (Math.random() < 0.2 && window.GameAPI && window.GameAPI.onHihat) {
          window.GameAPI.onHihat();
        }
      }, humanTime);
    }
  }, stepSequence, activeStepSubdivision);

  // Acid with melodic sequence - slight timing variations and accent
  acidLoop = new Tone.Sequence((time, step) => {
    lastSequenceCallbackTime = time;
    const note = acidSequence[step];
    if (note && !muteStates.acid) {
      const humanTime = humanize(time, currentSceneHumanize.acid);
      const isAccent = step % 4 === 0 || (Math.random() > 0.85 && tensionLevel > 50);

      if (isAccent) {
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
        if (Math.random() < 0.1 && window.GameAPI && window.GameAPI.onAcid) {
          window.GameAPI.onAcid();
        }
      }, humanTime);
    }
  }, stepSequence, activeStepSubdivision);

  // Stabs with slight spread and filter variation
  chordLoop = new Tone.Sequence((time, step) => {
    lastSequenceCallbackTime = time;
    const event = toStepEvent(currentStabPattern[step]);
    if (event.on && !muteStates.stab) {
      const humanTime = humanize(time, currentSceneHumanize.stab);
      const currentSection = getSection(currentBar);
      if (currentSection === 'DROP') {
        stabFilter.frequency.setValueAtTime(3500, humanTime);
      } else if (currentSection === 'BUILD') {
        stabFilter.frequency.exponentialRampToValueAtTime(2500, humanTime + 0.2);
      } else {
        stabFilter.frequency.setValueAtTime(2000, humanTime);
      }

      const acidNote = acidSequence[step];
      let chordToPlay = currentChordInfo.chord;

      if (acidNote && acidNote.includes('3')) {
        chordToPlay = currentChordInfo.chord.map(note =>
          note.replace(/(\d)/, (match) => parseInt(match) - 1)
        );
      }

      chordToPlay.forEach((note, i) => {
        const noteTime = humanTime + i * 0.015;
        raveSynth.triggerAttackRelease(note, event.gate || "8n", noteTime, event.velocity || 0.72);
      });

      Tone.Draw.schedule(() => {
        flashIndicator('stabIndicator');
        if (window.GameAPI && window.GameAPI.onStab) {
          window.GameAPI.onStab();
        }
      }, humanTime);
    }
  }, stepSequence, activeStepSubdivision);

  // Sub bass pattern - genre-specific
  subLoop = new Tone.Sequence((time, step) => {
    lastSequenceCallbackTime = time;
    const event = toSubEvent(currentSubPattern[step]);
    if (event.note && !muteStates.sub) {
      const humanTime = humanize(time, currentSceneHumanize.sub);
      subBass.portamento = event.slide ? 0.06 : 0.01;
      subBass.triggerAttackRelease(event.note, event.gate || "8n", humanTime, event.velocity || 0.8);
      const currentSection = getSection(currentBar);
      if (currentSection === 'DROP' || currentSection === 'MAIN') {
        const octaveUp = event.note.replace(/\d/, (match) => parseInt(match) + 1);
        subBass.triggerAttackRelease(octaveUp, event.gate || "8n", humanTime + 0.01, Math.min(1, (event.velocity || 0.8) * 0.4));
      }
      Tone.Draw.schedule(() => {
        flashIndicator('subIndicator');
        if (window.GameAPI && window.GameAPI.onSub) {
          window.GameAPI.onSub();
        }
      }, humanTime);
    }
  }, stepSequence, activeStepSubdivision);
}

function laneStats(lane = []) {
  let hits = 0;
  let velocitySum = 0;
  for (const step of lane) {
    if (step?.on) {
      hits += 1;
      velocitySum += step.velocity || 0;
    }
  }
  return {
    hits,
    avgVelocity: hits > 0 ? velocitySum / hits : 0
  };
}

function bassStats(lane = []) {
  let notes = 0;
  let velocitySum = 0;
  for (const step of lane) {
    if (step?.note) {
      notes += 1;
      velocitySum += step.velocity || 0;
    }
  }
  return {
    notes,
    avgVelocity: notes > 0 ? velocitySum / notes : 0
  };
}

function logAudioMetricsForBar() {
  if (!audioMetricsEnabled) return;
  if (lastMetricsLoggedBar === currentBar) return;
  lastMetricsLoggedBar = currentBar;

  const kick = laneStats(currentKickPattern);
  const snare = laneStats(currentSnarePattern);
  const hihat = laneStats(currentHihatPattern);
  const stab = laneStats(currentStabPattern);
  const sub = bassStats(currentSubPattern);
  const mode = isNative24ModeEnabled() ? 'N24' : 'N16';

  console.log(
    `[audio-metrics] genre=${currentGenre} mode=${mode} bar=${currentBar} ` +
    `k=${kick.hits}/${kick.avgVelocity.toFixed(2)} s=${snare.hits}/${snare.avgVelocity.toFixed(2)} ` +
    `h=${hihat.hits}/${hihat.avgVelocity.toFixed(2)} stab=${stab.hits}/${stab.avgVelocity.toFixed(2)} ` +
    `sub=${sub.notes}/${sub.avgVelocity.toFixed(2)}`
  );
}

export function updatePatterns(startTime = 0) {
  const targetStepCount = getStepCountForGenre(currentGenre);
  resetLoopGrid(targetStepCount);
  const section = getSection(currentBar);

  // Update progression if needed
  if (!currentProgression || currentBar % 8 === 0) {
    currentProgression = getChordProgression(section);
  }
  const chordInfo = currentProgression[currentChordIndex % currentProgression.length];
  currentChordInfo = chordInfo;

  // Generate melodic acid sequence FIRST
  if (currentBar % 2 === 0) {
    acidSequence = generateMelodicAcidSequence(chordInfo, section, acidSequence);
    if (acidSequence.length !== activeStepCount) {
      const mapped = new Array(activeStepCount).fill(null);
      for (let i = 0; i < acidSequence.length; i++) {
        if (!acidSequence[i]) continue;
        const idx = Math.min(activeStepCount - 1, Math.floor((i * activeStepCount) / acidSequence.length));
        mapped[idx] = acidSequence[i];
      }
      acidSequence = mapped;
    }
    // Pattern displays were removed with minimized UI
  }

  // THEN generate patterns (so stabs can respond to acid)
  const patterns = generatePatterns(section, currentBar, energyLevel);
  currentKickPattern = patterns.kick;
  currentSnarePattern = patterns.snare;
  currentHihatPattern = patterns.hihat;
  currentStabPattern = patterns.stab;
  currentSubPattern = computeSubPattern(chordInfo);

  ensureLoopsCreated();

  if (loopsStarted) {
    return;
  }

  // When rebuilding inside a Transport callback, start slightly ahead to avoid
  // same-tick race conditions that can drop subsequent loop scheduling.
  const safeStartTime = typeof startTime === 'number' && startTime > 0
    ? startTime + 0.001
    : startTime;

  kickLoop.start(safeStartTime);
  snareLoop.start(safeStartTime);
  hihatLoop.start(safeStartTime);
  acidLoop.start(safeStartTime);
  chordLoop.start(safeStartTime);
  subLoop.start(safeStartTime);
  loopsStarted = true;
}

export function getMusicWatchdogStatus(now = Tone.now()) {
  return {
    transportState: Tone.Transport.state,
    transportSeconds: Tone.Transport.seconds,
    lastSequenceCallbackTime,
    secondsSinceSequenceCallback: lastSequenceCallbackTime > 0 ? Math.max(0, now - lastSequenceCallbackTime) : Infinity
  };
}

export function recoverMusicLoops(now = Tone.now()) {
  ensureLoopsCreated();
  updatePatterns(now);

  if (Tone.Transport.state !== 'started') {
    loopsStarted = false;
    return false;
  }

  const restartAt = now + 0.02;
  kickLoop.stop(restartAt);
  snareLoop.stop(restartAt);
  hihatLoop.stop(restartAt);
  acidLoop.stop(restartAt);
  chordLoop.stop(restartAt);
  subLoop.stop(restartAt);

  kickLoop.start(restartAt + 0.001);
  snareLoop.start(restartAt + 0.001);
  hihatLoop.start(restartAt + 0.001);
  acidLoop.start(restartAt + 0.001);
  chordLoop.start(restartAt + 0.001);
  subLoop.start(restartAt + 0.001);
  loopsStarted = true;
  return true;
}

// Apply tension to parameters
export function applyTension(scheduleTime) {
  const now = typeof scheduleTime === 'number' ? scheduleTime : Tone.now();

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
    const highpassTarget = currentGenre === 'dubstep'
      ? 35 + (tensionLevel - 80) * 2
      : 100 + (tensionLevel - 80) * 10;
    masterHighpass.frequency.exponentialRampToValueAtTime(highpassTarget, now + 0.5);
  } else {
    masterHighpass.frequency.exponentialRampToValueAtTime(20, now + 0.5);
  }

  // Sidechain gets more aggressive
  sidechain.ratio.value = 8 + (tensionLevel / 100) * 12;

  // Start/stop noise riser
  if (tensionLevel > 60 && !riserActive) {
    noiseRiser.start(now);
    riserEnvelope.triggerAttack();
    riserActive = true;
  } else if (tensionLevel <= 60 && riserActive) {
    riserEnvelope.triggerRelease();
    noiseRiser.stop(now + 0.5);
    riserActive = false;
  }

  // Riser volume follows tension
  if (riserActive) {
    noiseRiser.volume.value = -40 + (tensionLevel - 60) * 0.5;
  }

  if (isAudioDebugEnabled() && currentBar % 8 === 0) {
    logAudioDebug(
      `tension genre=${currentGenre} bar=${currentBar} tension=${tensionLevel} energy=${energyLevel}`
    );
  }
}

// Automation curves for smooth transitions
function applyAutomation(section, prevSection, scheduleTime) {
  const now = typeof scheduleTime === 'number' ? scheduleTime : Tone.now();

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
  const barsUntilNext = getBarsUntilNextSectionForGenre(currentGenre, currentBar);
  document.getElementById('nextSection').textContent =
    nextSection !== section ? `${nextSection} next bar` :
    `${getSection(currentBar + barsUntilNext)} in ${barsUntilNext} bars`;

  // Apply automation on section changes
  if (section !== lastSection) {
    applyAutomation(section, lastSection, scheduleTime);
    logAudioDebug(
      `section ${lastSection || 'INIT'} -> ${section} @bar=${currentBar} genre=${currentGenre}`
    );
    lastSection = section;
  }

  // Update patterns every bar
  if (currentBar % 1 === 0) {
    updatePatterns(scheduleTime ?? 0);
    logAudioMetricsForBar();
  }

  // Apply tension continuously
  applyTension(scheduleTime);

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
