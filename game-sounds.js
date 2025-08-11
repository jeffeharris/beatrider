// Game Sound Effects Module
// Manages shooting sounds and other game audio effects

import { CONFIG } from './config.js';

class GameSounds {
  constructor() {
    this.currentLaserSound = 0;
    this.initialized = false;
    this.reverb = null;
    this.sounds = {};
  }
  
  async init() {
    if (this.initialized) return;
    
    // Create reverb for spatial effect
    this.reverb = new Tone.Reverb({
      decay: 1.5,
      wet: 0.2
    }).toDestination();
    
    await this.reverb.generate();
    
    // Create laser sound variants
    this.sounds.laser = [];
    
    // Sound 0: Classic triangle wave laser
    this.sounds.laser[0] = new Tone.MonoSynth({
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      }
    }).connect(this.reverb);
    
    // Sound 1: Acid-style laser
    this.sounds.laser[1] = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05
      },
      filterEnvelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0.1,
        release: 0.1,
        baseFrequency: 200,
        octaves: 3
      }
    }).connect(this.reverb);
    
    // Sound 2: Chord shot
    this.sounds.laser[2] = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.1
      }
    }).connect(this.reverb);
    
    // Sound 3: Echo/delay shot
    const delay = new Tone.PingPongDelay("8n", 0.3).connect(this.reverb);
    this.sounds.laser[3] = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05
      }
    }).connect(delay);
    
    // Sound 4: Pluck
    this.sounds.laser[4] = new Tone.PluckSynth({
      attackNoise: 3,
      dampening: 4000,
      resonance: 0.9
    }).connect(this.reverb);
    
    // Sound 5: Pew Pew (FM synthesis)
    this.sounds.laser[5] = new Tone.FMSynth({
      harmonicity: 8,
      modulationIndex: 2,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.1
      },
      modulation: { type: "square" },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0,
        release: 0.1
      }
    }).connect(this.reverb);
    
    // Explosion sound
    const explosionFilter = new Tone.Filter({
      frequency: 200,
      type: "lowpass"
    }).connect(this.reverb);
    
    this.sounds.explosion = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.2
      }
    }).connect(explosionFilter);
    
    // Pickup sound
    this.sounds.pickup = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      }
    }).connect(this.reverb);
    
    // Hit/damage sound
    this.sounds.hit = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05
      }
    }).connect(this.reverb);
    
    // Jump sound
    this.sounds.jump = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.1,
        release: 0.2
      },
      portamento: 0.1
    }).connect(this.reverb);
    
    this.initialized = true;
  }
  
  playLaser(isArcShot = false) {
    const sound = this.sounds.laser[this.currentLaserSound];
    const baseNote = isArcShot ? "G5" : "C5";
    
    if (this.currentLaserSound === 2) {
      // Chord shot
      sound.triggerAttackRelease(["C5", "E5", "G5"], "8n");
    } else if (this.currentLaserSound === 4) {
      // Pluck needs frequency
      sound.triggerAttackRelease(Tone.Frequency(baseNote), "8n");
    } else {
      // Regular synth
      sound.triggerAttackRelease(baseNote, "8n");
    }
  }
  
  playExplosion() {
    this.sounds.explosion.triggerAttackRelease("8n");
  }
  
  playPickup(type = 'default') {
    const notes = {
      'default': "C6",
      'rapidfire': "E6",
      'shield': "G6",
      'multishot': "A6"
    };
    this.sounds.pickup.triggerAttackRelease(notes[type] || notes.default, "8n");
  }
  
  playHit() {
    this.sounds.hit.triggerAttackRelease("16n");
  }
  
  playJump() {
    // Ascending glide
    this.sounds.jump.frequency.setValueAtTime(200, Tone.now());
    this.sounds.jump.frequency.exponentialRampToValueAtTime(400, Tone.now() + 0.2);
    this.sounds.jump.triggerAttackRelease("16n");
  }
  
  setLaserSound(index) {
    if (index >= 0 && index < this.sounds.laser.length) {
      this.currentLaserSound = index;
    }
  }
  
  getLaserSoundName() {
    const names = ['Triangle', 'Acid', 'Chord', 'Echo', 'Pluck', 'Pew Pew'];
    return names[this.currentLaserSound] || 'Unknown';
  }
}

// Export singleton
const gameSounds = new GameSounds();
export default gameSounds;