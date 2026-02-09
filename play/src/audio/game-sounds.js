import * as Tone from 'tone';
import { sidechain, acidFilter1, stabReverb } from './music-engine.js';
import { savedData } from '../storage.js';

const hasSecureAudioWorklet = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof window.AudioWorkletNode !== 'undefined';

// Helper to get notes in current scale
export function getGameNote(index) {
  const scales = {
    minor: ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
    dorian: ["C", "D", "Eb", "F", "G", "A", "Bb"],
    phrygian: ["C", "Db", "Eb", "F", "G", "Ab", "Bb"]
  };
  const scale = scales.minor; // Default to minor
  return scale[index % scale.length];
}

// Create game sounds that blend with the music - route through sidechain for cohesion
// Accepts external audio nodes from the music engine so game sounds integrate with the mix
export function createGameSounds({ sidechain, acidFilter1, stabReverb, savedData }) {
  const allowWorkletNodes = hasSecureAudioWorklet();
  const gameReverb = (hasSecureAudioWorklet() ? new Tone.Reverb({
    decay: 0.5,
    wet: 0.2
  }) : new Tone.Gain(1)).connect(sidechain);

  // Game sound effects - musical and in-key
  // Create off-screen distortion effect chain
  const offScreenDistortion = new Tone.Distortion(0.8).connect(sidechain);
  const offScreenFilter = new Tone.AutoFilter({
    frequency: "8n",
    baseFrequency: 200,
    octaves: 3,
    depth: 0.8
  }).connect(offScreenDistortion);
  // Do not start LFOs at module load; this can trigger autoplay warnings before user gesture.
  if (Tone.context.state === 'running') {
    offScreenFilter.start();
  }

  const gameSounds = {
    // Movement - subtle filter sweep in key
    move: new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
      filter: { frequency: 2000, rolloff: -12, Q: 5 },
      filterEnvelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01, baseFrequency: 800, octaves: 1 },
      volume: -18
    }).connect(gameReverb),

    // Off-screen womp effect
    offScreenWomp: new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      filter: { frequency: 100, rolloff: -24, Q: 10 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.2,
        release: 0.5,
        baseFrequency: 100,
        octaves: 4
      },
      volume: -8
    }).connect(offScreenFilter),

    // Jump charge sound - rising pitch
    jumpCharge: new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.1 },
      filter: { frequency: 200, rolloff: -24, Q: 8 },
      filterEnvelope: { attack: 0, decay: 0, sustain: 1, release: 0.1 },
      volume: -12
    }).connect(gameReverb),

    // Multiple laser sounds that complement the music
    laserSounds: [
      // 0: Original - Triangle wave with filter sweep
      new Tone.MonoSynth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
        filter: { frequency: 3000, rolloff: -12 },
        filterEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01, baseFrequency: 1500, octaves: -1 },
        volume: -12
      }).connect(sidechain),

      // 1: Acid stab - mimics the 303 acid line
      new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
        filter: { frequency: 2000, rolloff: -24, Q: 8 },
        filterEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02, baseFrequency: 800, octaves: 2 },
        volume: -10
      }).connect(acidFilter1), // Route through acid filter for consistency

      // 2: Chord stab - harmonizes with the techno stabs
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square4" },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
        volume: -14
      }).connect(stabReverb), // Use the stab reverb for space

      // 3: Echo Pulse - metallic sound with delay
      new Tone.MonoSynth({
        oscillator: { type: "pulse", width: 0.2 },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0.2, release: 0.05 },
        filter: { frequency: 4000, rolloff: -12, Q: 3 },
        filterEnvelope: { attack: 0.001, decay: 0.02, sustain: 0.5, release: 0.02, baseFrequency: 2000, octaves: 2 },
        volume: -8
      }).connect(new Tone.FeedbackDelay("16n", 0.5).connect(gameReverb)), // Add echo effect

      // 4: Pluck - avoid PluckSynth in non-secure contexts (requires AudioWorklet)
      allowWorkletNodes
        ? new Tone.PluckSynth({
            attackNoise: 0.8,
            dampening: 4000,
            resonance: 0.9,
            volume: -10
          }).connect(gameReverb)
        : new Tone.MonoSynth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
            filter: { frequency: 3200, rolloff: -12, Q: 2 },
            volume: -10
          }).connect(gameReverb),

      // 5: Pew Pew - classic laser with pitch sweep
      new Tone.MonoSynth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
        portamento: 0.08, // Glide between pitches
        volume: -6
      }).connect(sidechain)
    ],

    currentLaserSound: savedData.settings?.laserSound || 0, // Load saved laser sound preference

    // Explosion - filtered noise burst that sounds like a snare hit
    explosion: new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
      volume: -8
    }).connect(new Tone.Filter(1200, "highpass").connect(sidechain)),

    // Enemy destroy - distorted version of the enemy spawn sound
    enemyDestroy: new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      filter: { frequency: 800, rolloff: -24, Q: 8 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1, baseFrequency: 200, octaves: 2 },
      volume: -10
    }).connect(new Tone.Distortion(0.8).connect(sidechain)),

    // Obstacle hit - low thud with pitch bend
    obstacleHit: new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 },
      portamento: 0.01,
      volume: -8
    }).connect(new Tone.Filter(400, "lowpass").connect(sidechain)),

    // Power-up - use same synth style as acid for consistency
    powerUp: new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 },
      filter: { frequency: 2000, rolloff: -12, Q: 3 },
      filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.3, release: 0.2, baseFrequency: 400, octaves: 3 },
      volume: -10
    }).connect(acidFilter1) // Route through acid filter for consistency
  };

  return gameSounds;
}

// Eagerly create the game sounds instance with imported dependencies
export const gameSounds = createGameSounds({ sidechain, acidFilter1, stabReverb, savedData });
