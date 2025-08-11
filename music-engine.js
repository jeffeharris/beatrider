// Music Engine - Procedural Melodic Techno Generator
// Manages all Tone.js instruments and sequencing

import { CONFIG } from './config.js';
import eventBus, { EVENTS } from './event-bus.js';

class MusicEngine {
  constructor() {
    // State
    this.state = {
      currentBar: 0,
      currentChordIndex: 0,
      currentProgression: null,
      acidSequence: [],
      energyLevel: 50,
      tensionLevel: 30,
      lastSection: '',
      isTransitioning: false,
      riserActive: false,
      isPlaying: false,
      bpm: CONFIG.audio.bpm.default
    };
    
    // Mute states
    this.muteStates = {
      kick: false,
      snare: false,
      hat: false,
      acid: false,
      stab: false,
      sub: false
    };
    
    // Musical structures
    this.scale = {
      C: ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
      indices: { C: 0, D: 1, Eb: 2, F: 3, G: 4, Ab: 5, Bb: 6 }
    };
    
    // Chord progressions
    this.chordProgressions = {
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
        { root: "C", chord: ["C4", "Eb4", "G4", "Bb4"], bass: "C1", melodicFocus: ["C", "Bb", "G"] },
        { root: "Ab", chord: ["Ab3", "C4", "Eb4", "G4"], bass: "Ab0", melodicFocus: ["Ab", "Eb", "G"] },
        { root: "F", chord: ["F3", "Ab3", "C4", "Eb4"], bass: "F0", melodicFocus: ["F", "C", "Ab"] },
        { root: "G", chord: ["G3", "B3", "D4", "F4"], bass: "G0", melodicFocus: ["G", "B", "F"] }
      ],
      breakdown: [
        { root: "C", chord: ["C3"], bass: "C1", melodicFocus: ["C"] },
        { root: "C", chord: ["C3", "G3"], bass: "C1", melodicFocus: ["C", "G"] },
        { root: "Ab", chord: ["Ab2"], bass: "Ab0", melodicFocus: ["Ab"] },
        { root: "G", chord: ["G2", "D3"], bass: "G0", melodicFocus: ["G", "D"] }
      ]
    };
    
    // Pattern bank
    this.patternBank = {
      kick: {
        fourOnFloor: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        halfTime: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
        syncopated: [1,0,0,0, 1,0,0,1, 0,0,1,0, 1,0,0,0],
        minimal: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        detroit: [1,0,0,1, 1,0,0,0, 1,0,1,0, 1,0,0,0],
        berlin: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,0,0],
        chicago: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
        fill: [1,0,1,0, 1,0,1,1, 1,1,1,0, 1,1,1,1]
      },
      snare: {
        backbeat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        ghost: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
        detroit: [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
        fill: [0,0,0,0, 1,0,1,0, 1,0,1,1, 1,1,1,1],
        minimal: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0]
      },
      acid: {
        phuture: [1,0,1,0, 1,0,0,1, 1,0,1,0, 0,1,0,1],
        wink: [1,1,0,1, 0,1,1,0, 1,0,1,1, 0,0,1,0],
        hardfloor: [1,0,0,1, 1,0,1,0, 0,1,0,1, 1,0,0,0],
        pierre: [1,0,1,1, 0,0,1,0, 1,1,0,1, 0,0,1,0],
        minimal: [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
        busy: [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,0,1,1]
      }
    };
    
    // Sequences (will be initialized when instruments are created)
    this.sequences = {};
    
    // Instruments (will be initialized in init())
    this.instruments = {};
    this.effects = {};
  }
  
  async init() {
    // Initialize Tone.js instruments and effects
    await this.createInstruments();
    await this.createSequences();
    return this;
  }
  
  async createInstruments() {
    const cfg = CONFIG.audio;
    
    // Master chain
    this.effects.masterLimiter = new Tone.Limiter(cfg.master.limiter).toDestination();
    
    this.effects.masterHighpass = new Tone.Filter(cfg.master.highpass)
      .connect(this.effects.masterLimiter);
    
    this.effects.sidechain = new Tone.Compressor(cfg.sidechain)
      .connect(this.effects.masterHighpass);
    
    // Kick (bypasses sidechain for punch)
    this.instruments.kick = new Tone.MembraneSynth({
      pitchDecay: cfg.instruments.kick.pitchDecay,
      octaves: cfg.instruments.kick.octaves,
      oscillator: { type: "sine" },
      envelope: cfg.instruments.kick.envelope
    }).connect(this.effects.masterHighpass);
    
    // Snare
    this.instruments.snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: cfg.instruments.snare.envelope
    }).connect(this.effects.sidechain);
    
    // Hi-hat
    this.effects.hihatFilter = new Tone.Filter({
      frequency: cfg.instruments.hihat.filterFreq,
      type: "highpass"
    }).connect(this.effects.sidechain);
    
    this.instruments.hihat = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: cfg.instruments.hihat.envelope,
      volume: cfg.instruments.hihat.volume
    }).connect(this.effects.hihatFilter);
    
    // Acid bass
    this.effects.acidFilter1 = new Tone.Filter({
      frequency: cfg.instruments.acid.filter.frequency,
      type: "lowpass",
      rolloff: cfg.instruments.acid.filter.rolloff,
      Q: cfg.instruments.acid.filter.Q
    }).connect(this.effects.sidechain);
    
    this.effects.acidFilter2 = new Tone.Filter({
      frequency: cfg.instruments.acid.filter.frequency,
      type: "lowpass",
      rolloff: cfg.instruments.acid.filter.rolloff,
      Q: 2
    }).connect(this.effects.acidFilter1);
    
    this.effects.acidDistortion = new Tone.Distortion(cfg.instruments.acid.distortion)
      .connect(this.effects.acidFilter2);
    
    this.instruments.acid = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: cfg.instruments.acid.envelope,
      filterEnvelope: cfg.instruments.acid.filterEnvelope,
      portamento: cfg.instruments.acid.portamento
    }).connect(this.effects.acidDistortion);
    
    // Rave stabs
    this.effects.stabReverb = new Tone.Reverb({
      decay: cfg.instruments.stab.reverb.decay,
      wet: cfg.instruments.stab.reverb.wet
    }).connect(this.effects.sidechain);
    
    this.effects.stabFilter = new Tone.Filter({
      frequency: cfg.instruments.stab.filter.frequency,
      type: "lowpass",
      rolloff: cfg.instruments.stab.filter.rolloff,
      Q: cfg.instruments.stab.filter.Q
    }).connect(this.effects.stabReverb);
    
    this.instruments.stab = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth", partialCount: 3 },
      envelope: cfg.instruments.stab.envelope,
      volume: cfg.instruments.stab.volume
    }).connect(this.effects.stabFilter);
    
    // Sub bass
    this.effects.subEQ = new Tone.EQ3(cfg.instruments.sub.eq)
      .connect(this.effects.sidechain);
    
    this.instruments.sub = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: cfg.instruments.sub.envelope,
      volume: -8
    }).connect(this.effects.subEQ);
    
    // Riser
    this.instruments.riser = new Tone.Noise("white").connect(
      new Tone.Filter({
        frequency: cfg.instruments.riser.filter.minFreq,
        type: "highpass"
      }).connect(this.effects.sidechain)
    );
    
    this.effects.riserEnvelope = new Tone.Envelope(cfg.instruments.riser.envelope)
      .connect(this.instruments.riser.volume);
  }
  
  async createSequences() {
    const sixteenth = "16n";
    
    // Kick sequence
    this.sequences.kick = new Tone.Sequence((time, note) => {
      if (note && !this.muteStates.kick) {
        this.instruments.kick.triggerAttackRelease("C1", "8n", this.humanize(time));
        eventBus.emit(EVENTS.KICK, { time });
        this.flashIndicator('kick');
      }
    }, new Array(16).fill(0), sixteenth);
    
    // Snare sequence
    this.sequences.snare = new Tone.Sequence((time, note) => {
      if (note && !this.muteStates.snare) {
        this.instruments.snare.triggerAttackRelease("8n", this.humanize(time));
        eventBus.emit(EVENTS.SNARE, { time });
        this.flashIndicator('snare');
      }
    }, new Array(16).fill(0), sixteenth);
    
    // Hi-hat sequence
    this.sequences.hihat = new Tone.Sequence((time, note) => {
      if (note && !this.muteStates.hat) {
        const velocity = 0.4 + Math.random() * 0.3;
        this.instruments.hihat.triggerAttackRelease("32n", this.humanize(time), velocity);
        eventBus.emit(EVENTS.HIHAT, { time });
        this.flashIndicator('hat');
      }
    }, new Array(16).fill(0), sixteenth);
    
    // Acid sequence
    this.sequences.acid = new Tone.Sequence((time, note) => {
      if (note && !this.muteStates.acid) {
        const octaveShift = Math.random() > 0.9 ? 12 : 0;
        const frequency = Tone.Frequency(note).transpose(octaveShift);
        this.instruments.acid.triggerAttackRelease(frequency, "16n", this.humanize(time));
        eventBus.emit(EVENTS.ACID, { time, note });
        this.flashIndicator('acid');
      }
    }, new Array(16).fill(null), sixteenth);
    
    // Chord/stab loop (every bar)
    this.sequences.chord = new Tone.Loop((time) => {
      if (!this.state.currentProgression) return;
      
      const chordInfo = this.state.currentProgression[this.state.currentChordIndex % this.state.currentProgression.length];
      const patterns = this.generatePatterns(this.getSection(this.state.currentBar), this.state.currentBar, this.state.energyLevel);
      
      // Schedule stabs for this bar
      patterns.stab.forEach((hit, i) => {
        if (hit && !this.muteStates.stab) {
          const stabTime = time + i * Tone.Time("16n");
          const velocity = 0.6 + Math.random() * 0.3;
          this.instruments.stab.triggerAttackRelease(chordInfo.chord, "8n", this.humanize(stabTime), velocity);
          
          Tone.Draw.schedule(() => {
            eventBus.emit(EVENTS.STAB, { time: stabTime });
            this.flashIndicator('stab');
          }, stabTime);
        }
      });
      
      this.state.currentChordIndex++;
    }, "1m");
    
    // Sub bass loop
    this.sequences.sub = new Tone.Loop((time) => {
      if (!this.state.currentProgression || this.muteStates.sub) return;
      
      const chordInfo = this.state.currentProgression[(this.state.currentChordIndex - 1) % this.state.currentProgression.length];
      const section = this.getSection(this.state.currentBar);
      
      if (section !== 'INTRO' && section !== 'BREAK') {
        this.instruments.sub.triggerAttackRelease(chordInfo.bass, "1m", time);
        eventBus.emit(EVENTS.SUB, { time, note: chordInfo.bass });
        this.flashIndicator('sub');
      }
    }, "1m");
  }
  
  // Humanization
  humanize(time, amount = 0.01) {
    return time + (Math.random() - 0.5) * amount * 2;
  }
  
  // Visual feedback (temporary until UI is fully separated)
  flashIndicator(trackName) {
    const square = document.getElementById(trackName + 'Square');
    if (square && !this.muteStates[trackName]) {
      square.classList.add('flash');
      setTimeout(() => square.classList.remove('flash'), 100);
    }
  }
  
  // Section management
  getSection(bar) {
    const pos = bar % 64;
    if (pos < 8) return 'INTRO';
    if (pos < 16) return 'BUILD';
    if (pos < 32) return 'MAIN';
    if (pos < 40) return 'BREAK';
    if (pos < 56) return 'DROP';
    return 'OUTRO';
  }
  
  isApproachingTransition(bar) {
    const pos = bar % 64;
    const transitionBars = [7, 15, 31, 39, 55, 63];
    return transitionBars.includes(pos);
  }
  
  getChordProgression(section) {
    if (section === 'BREAK') return this.chordProgressions.breakdown;
    if (section === 'DROP') return this.chordProgressions.variation2;
    if (this.state.currentBar % 16 < 8) return this.chordProgressions.main;
    return Math.random() > 0.5 ? this.chordProgressions.variation1 : this.chordProgressions.variation2;
  }
  
  // Pattern generation
  generatePatterns(section, bar, energy) {
    const patterns = {};
    const isFill = this.isApproachingTransition(bar);
    
    if (isFill) {
      // Drum fill
      patterns.kick = this.patternBank.kick.fill;
      patterns.snare = this.patternBank.snare.fill;
      patterns.hihat = new Array(16).fill(1);
    } else {
      // Regular patterns based on section
      if (section === 'DROP') {
        patterns.kick = Math.random() > 0.5 ? this.patternBank.kick.chicago : this.patternBank.kick.detroit;
        patterns.snare = energy > 70 ? this.patternBank.snare.detroit : this.patternBank.snare.backbeat;
      } else if (section === 'MAIN') {
        const kickStyles = [this.patternBank.kick.fourOnFloor, this.patternBank.kick.berlin, this.patternBank.kick.detroit];
        patterns.kick = kickStyles[Math.floor((bar / 4) % kickStyles.length)];
        patterns.snare = this.patternBank.snare.backbeat;
      } else if (section === 'BUILD') {
        patterns.kick = this.patternBank.kick.halfTime;
        patterns.snare = this.patternBank.snare.minimal;
      } else if (section === 'BREAK') {
        patterns.kick = this.patternBank.kick.minimal;
        patterns.snare = new Array(16).fill(0);
      } else {
        patterns.kick = this.patternBank.kick.halfTime;
        patterns.snare = this.patternBank.snare.minimal;
      }
      
      // Hi-hat based on energy and tension
      patterns.hihat = [];
      const hihatDensity = (energy / 100) * 0.5 + (this.state.tensionLevel / 100) * 0.5;
      for (let i = 0; i < 16; i++) {
        if (this.state.tensionLevel > 70 && i % 2 === 1) {
          patterns.hihat[i] = 1;
        } else {
          patterns.hihat[i] = Math.random() < hihatDensity ? 1 : 0;
        }
      }
    }
    
    // Stab patterns
    const stabPatterns = [
      [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0],
      new Array(16).fill(0)
    ];
    
    if (section === 'BREAK') {
      patterns.stab = stabPatterns[3];
    } else if (section === 'DROP') {
      patterns.stab = (bar % 4 === 0) ? stabPatterns[0] : stabPatterns[3];
    } else if (section === 'BUILD') {
      patterns.stab = (bar % 2 === 1) ? stabPatterns[2] : stabPatterns[3];
    } else if (section === 'MAIN') {
      patterns.stab = (bar % 2 === 0) ? stabPatterns[1] : stabPatterns[3];
    } else {
      patterns.stab = (bar % 4 === 0) ? stabPatterns[1] : stabPatterns[3];
    }
    
    return patterns;
  }
  
  // Acid sequence generation
  generateMelodicAcidSequence(chordInfo, section, previousSequence = []) {
    const sequence = [];
    const octave = section === 'DROP' ? 3 : 2;
    
    // Select rhythm pattern
    let rhythmPattern;
    if (section === 'DROP') {
      const patterns = [this.patternBank.acid.phuture, this.patternBank.acid.wink, this.patternBank.acid.hardfloor];
      rhythmPattern = patterns[Math.floor(Math.random() * patterns.length)];
    } else if (section === 'BUILD') {
      rhythmPattern = this.patternBank.acid.pierre;
    } else if (section === 'BREAK') {
      rhythmPattern = this.patternBank.acid.minimal;
    } else {
      rhythmPattern = Math.random() > 0.5 ? this.patternBank.acid.hardfloor : this.patternBank.acid.phuture;
    }
    
    const chordTones = chordInfo.melodicFocus;
    let lastNote = previousSequence.length > 0 ? previousSequence[previousSequence.length - 1] : null;
    
    for (let i = 0; i < 16; i++) {
      if (rhythmPattern[i]) {
        let note;
        
        if (i % 4 === 0) {
          note = chordTones[Math.floor(Math.random() * chordTones.length)] + octave;
        } else if (lastNote && Math.random() > 0.3) {
          const lastPitch = lastNote.replace(/\d/, '');
          const lastOctave = parseInt(lastNote.replace(/\D/g, ''));
          const scaleIndex = this.scale.indices[lastPitch];
          
          if (scaleIndex !== undefined) {
            const direction = Math.random() > 0.5 ? 1 : -1;
            const stepSize = Math.random() > 0.7 ? 2 : 1;
            const newIndex = (scaleIndex + direction * stepSize + 7) % 7;
            note = this.scale.C[newIndex] + lastOctave;
          } else {
            note = chordTones[Math.floor(Math.random() * chordTones.length)] + octave;
          }
        } else {
          note = this.scale.C[Math.floor(Math.random() * this.scale.C.length)] + octave;
        }
        
        sequence.push(note);
        lastNote = note;
      } else {
        sequence.push(null);
      }
    }
    
    return sequence;
  }
  
  // Update patterns (called every bar)
  updatePatterns() {
    const section = this.getSection(this.state.currentBar);
    
    // Update progression if needed
    if (!this.state.currentProgression || this.state.currentBar % 8 === 0) {
      this.state.currentProgression = this.getChordProgression(section);
    }
    
    const chordInfo = this.state.currentProgression[this.state.currentChordIndex % this.state.currentProgression.length];
    
    // Generate acid sequence
    if (this.state.currentBar % 2 === 0) {
      this.state.acidSequence = this.generateMelodicAcidSequence(chordInfo, section, this.state.acidSequence);
    }
    
    // Generate patterns
    const patterns = this.generatePatterns(section, this.state.currentBar, this.state.energyLevel);
    
    // Update sequences
    this.sequences.kick.events = patterns.kick;
    this.sequences.snare.events = patterns.snare;
    this.sequences.hihat.events = patterns.hihat;
    this.sequences.acid.events = this.state.acidSequence;
    
    // Emit section change
    if (section !== this.state.lastSection) {
      this.state.lastSection = section;
      eventBus.emit(EVENTS.SECTION, { section });
    }
    
    // Update UI (temporary)
    this.updateProgressionDisplay();
    
    this.state.currentBar++;
    eventBus.emit(EVENTS.BAR, { bar: this.state.currentBar });
  }
  
  // Temporary UI update (will be moved to UI module)
  updateProgressionDisplay() {
    const section = this.getSection(this.state.currentBar);
    const chord = this.state.currentProgression ? 
      this.state.currentProgression[this.state.currentChordIndex % this.state.currentProgression.length].root + 'm' : '';
    
    const nextTransition = [8, 16, 32, 40, 56, 64].find(b => b > (this.state.currentBar % 64));
    const barsUntil = nextTransition - (this.state.currentBar % 64);
    const sections = ['BUILD', 'MAIN', 'BREAK', 'DROP', 'OUTRO', 'INTRO'];
    const nextSection = sections[[8, 16, 32, 40, 56, 64].indexOf(nextTransition)];
    
    const sectionEl = document.getElementById('section');
    const barEl = document.getElementById('bar');
    const chordEl = document.getElementById('chord');
    const nextEl = document.getElementById('nextSection');
    
    if (sectionEl) sectionEl.textContent = section;
    if (barEl) barEl.textContent = this.state.currentBar % 64;
    if (chordEl) chordEl.textContent = chord;
    if (nextEl) nextEl.textContent = `${nextSection} in ${barsUntil} bars`;
  }
  
  // Control methods
  async start() {
    if (this.state.isPlaying) return;
    
    await Tone.start();
    
    // Reset state
    this.state.currentBar = 0;
    this.state.currentChordIndex = 0;
    this.updatePatterns();
    
    // Start transport
    Tone.Transport.bpm.value = this.state.bpm;
    
    // Schedule pattern updates
    Tone.Transport.scheduleRepeat((time) => {
      this.updatePatterns();
    }, "1m");
    
    // Start sequences
    Object.values(this.sequences).forEach(seq => seq.start(0));
    
    Tone.Transport.start();
    this.state.isPlaying = true;
    
    eventBus.emit(EVENTS.GAME_START);
  }
  
  stop() {
    if (!this.state.isPlaying) return;
    
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Object.values(this.sequences).forEach(seq => seq.stop());
    
    this.state.isPlaying = false;
  }
  
  // Parameter controls
  setBPM(bpm) {
    this.state.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
    eventBus.emit(EVENTS.TEMPO_CHANGE, { bpm });
  }
  
  setEnergy(level) {
    this.state.energyLevel = level;
    eventBus.emit(EVENTS.ENERGY_CHANGE, { level });
  }
  
  setTension(level) {
    this.state.tensionLevel = level;
    
    // Update highpass filter for tension
    const minFreq = 20;
    const maxFreq = 2000;
    const freq = minFreq + (level / 100) * (maxFreq - minFreq);
    this.effects.masterHighpass.frequency.rampTo(freq, 2);
    
    eventBus.emit(EVENTS.TENSION_CHANGE, { level });
  }
  
  toggleTrack(track) {
    this.muteStates[track] = !this.muteStates[track];
    
    const square = document.getElementById(track + 'Square');
    if (square) {
      square.classList.toggle('muted', this.muteStates[track]);
    }
    
    eventBus.emit(this.muteStates[track] ? EVENTS.TRACK_MUTE : EVENTS.TRACK_UNMUTE, { track });
  }
  
  isTrackMuted(track) {
    return this.muteStates[track];
  }
}

// Export singleton instance
const musicEngine = new MusicEngine();
export default musicEngine;