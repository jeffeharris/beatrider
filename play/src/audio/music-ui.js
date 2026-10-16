// music-ui.js - binds the settings menu's controls (index.html #settingsMenu) to the
// music engine and the saved game settings. Opening and closing menus lives in ui/menus.js.

import * as Tone from 'tone';
import { DEFAULT_CHARACTER_ID, saveGameData, saveGameDataDebounced, savedData } from '../storage.js';
import { gameState } from '../config.js';
import {
  energyLevel, setEnergyLevel,
  tensionLevel, setTensionLevel,
  currentGenre, setCurrentGenre,
  muteStates,
  updatePatterns,
  applyTension,
  GENRE_CONFIGS,
  setRaveSynth,
  kick,
  technoStab,
  dnbReese,
  tropicalPluck
} from './music-engine.js';
import { gameSounds } from './game-sounds.js';
import { onSettingsOpen } from '../ui/menus.js';

// Music preset definitions
const MUSIC_PRESETS = {
  'chill': { energy: 30, tension: 20, description: 'Laid back minimal' },
  'driving': { energy: 60, tension: 40, description: 'Classic driving' },
  'peak': { energy: 85, tension: 70, description: 'Peak time energy' },
  'acid': { energy: 75, tension: 90, description: '303 madness' },
  'dark': { energy: 40, tension: 80, description: 'Dark & brooding' },
  'hypnotic': { energy: 50, tension: 60, description: 'Repetitive & hypnotic' },
  'anthem': { energy: 90, tension: 60, description: 'Stadium anthem' }
};

// Difficulty preset definitions.
// `key` is the identity of the preset - analytics and leaderboard entries read it.
// (It exists because callers used to read a `name` field that was never defined, so
// every recorded difficulty silently fell back to 'normal'.)
const DIFFICULTY_PRESETS = {
  'zen': { key: 'zen', speedMult: 0.5, fireMult: 2.0, spawnMult: 0.5, description: 'Relaxed' },
  'normal': { key: 'normal', speedMult: 1.0, fireMult: 1.0, spawnMult: 1.0, description: 'Standard' },
  'intense': { key: 'intense', speedMult: 1.5, fireMult: 0.8, spawnMult: 1.3, description: 'Challenging' },
  'chaos': { key: 'chaos', speedMult: 2.0, fireMult: 0.5, spawnMult: 2.0, description: 'Maximum chaos' }
};

const CHARACTER_IDS = ['unicorn', 'classic'];

const GENRE_BUTTONS = {
  techno: 'genreTechno',
  dnb: 'genreDnb',
  tropical: 'genreTropical',
  dubstep: 'genreDubstep',
  trance: 'genreTrance'
};

const TRACKS = ['kick', 'snare', 'hat', 'acid', 'stab', 'sub'];

// Derive from saved settings, not a hardcoded default: the settings panel only restored
// the <select> value on load, so a player who had chosen e.g. chaos was shown "chaos"
// but actually played on normal until they re-picked it.
let currentDifficulty = DIFFICULTY_PRESETS[savedData.settings?.difficulty] || DIFFICULTY_PRESETS.normal;
const isAudioRunning = () => Tone?.context?.state === 'running';
const withTransport = (fn) => {
  if (!isAudioRunning()) return false;
  fn(Tone.Transport);
  return true;
};
const trackEventSafe = (eventName, params) => {
  if (typeof window.trackEvent === 'function') {
    window.trackEvent(eventName, params);
  }
};
const byId = (id) => document.getElementById(id);

function setSliderValue(name, value) {
  byId(`${name}Slider`).value = value;
  byId(`${name}Display`).textContent = value;
}

// Update sliders to set preset to custom
const markCustomPreset = () => {
  byId('musicPresetSelector').value = '';
  byId('musicPresetDisplay').textContent = 'Custom settings';
};

function switchGenre(genre) {
  const previousGenre = currentGenre;
  setCurrentGenre(genre);
  const config = GENRE_CONFIGS[genre];

  // Track genre change (only if actually changed)
  if (previousGenre && previousGenre !== genre) {
    trackEventSafe('settings_change', {
      setting_type: 'genre',
      genre_from: previousGenre,
      genre_to: genre,
      bpm: config.bpmDefault
    });
  }

  // Update BPM slider range and value
  const bpmSlider = byId('bpmSlider');
  bpmSlider.min = config.bpmMin;
  bpmSlider.max = config.bpmMax;
  setSliderValue('bpm', config.bpmDefault);

  withTransport((transport) => {
    transport.bpm.value = config.bpmDefault;
  });

  // Switch stab synth based on genre
  if (genre === 'dnb') {
    setRaveSynth(dnbReese);
  } else if (genre === 'tropical') {
    setRaveSynth(tropicalPluck);
  } else if (genre === 'dubstep') {
    setRaveSynth(dnbReese); // Use Reese for dubstep wobbles
  } else if (genre === 'trance') {
    setRaveSynth(technoStab); // Use saw stabs for trance
  } else {
    setRaveSynth(technoStab);
  }

  // Adjust kick tuning for genre (only if instruments are loaded)
  if (typeof kick !== 'undefined') {
    if (genre === 'tropical') {
      // 808-style deeper kick for tropical
      kick.oscillator.frequency.value = 50;
      kick.octaves = 6;
    } else if (genre === 'dnb') {
      // Punchy, tight kick for D&B
      kick.oscillator.frequency.value = 65;
      kick.octaves = 3;
    } else if (genre === 'dubstep') {
      // Deep sub kick for dubstep
      kick.oscillator.frequency.value = 45;
      kick.octaves = 7;
    } else if (genre === 'trance') {
      // Punchy trance kick
      kick.oscillator.frequency.value = 60;
      kick.octaves = 4;
    } else {
      // Classic 909 kick for techno
      kick.oscillator.frequency.value = 60;
      kick.octaves = 4;
    }
  }

  Object.entries(GENRE_BUTTONS).forEach(([g, id]) => {
    byId(id)?.setAttribute('aria-pressed', String(genre === g));
  });

  // Force pattern update on next bar
  updatePatterns();
}

function renderTrackMute(track) {
  const square = byId(track + 'Square');
  if (!square) return;
  square.classList.toggle('muted', muteStates[track]);
  square.setAttribute('aria-pressed', String(!muteStates[track]));
  square.title = `${square.textContent}: ${muteStates[track] ? 'muted' : 'on'}`;
}

// Apply saved music settings to the engine and the controls. This used to wait for
// window 'load', but setup runs from a tap long after the page loaded, so it never ran:
// saved moods, custom sliders and mute squares were never restored.
function applySavedMusicSettings() {
  const settings = savedData.settings || {};

  if (settings.musicPreset === 'custom' && settings.customMusic) {
    const custom = settings.customMusic;
    if (custom.bpm) {
      withTransport((transport) => {
        transport.bpm.value = custom.bpm;
      });
      setSliderValue('bpm', custom.bpm);
    }
    if (custom.energy !== undefined) {
      setEnergyLevel(custom.energy);
      setSliderValue('energy', custom.energy);
    }
    if (custom.tension !== undefined) {
      setTensionLevel(custom.tension);
      setSliderValue('tension', custom.tension);
    }
    markCustomPreset();
  } else {
    const presetKey = MUSIC_PRESETS[settings.musicPreset] ? settings.musicPreset : byId('musicPresetSelector').value;
    const preset = MUSIC_PRESETS[presetKey];
    if (preset) {
      setEnergyLevel(preset.energy);
      setTensionLevel(preset.tension);
      byId('musicPresetSelector').value = presetKey;
      byId('musicPresetDisplay').textContent = preset.description;
      setSliderValue('energy', preset.energy);
      setSliderValue('tension', preset.tension);
    }
  }

  byId('difficultySelector').value = currentDifficulty.key;
  byId('difficultyDisplay').textContent = currentDifficulty.description;

  TRACKS.forEach(renderTrackMute);
}

/**
 * Reflect settings that can also change outside the menu (C, G and 1-6 keys) into its
 * controls. Called every time the settings menu opens.
 */
export function syncSettingsControls() {
  const sceneCharacter = window.gameScene?.playerCharacter;
  const character = CHARACTER_IDS.includes(sceneCharacter)
    ? sceneCharacter
    : (CHARACTER_IDS.includes(savedData.settings?.character) ? savedData.settings.character : DEFAULT_CHARACTER_ID);
  byId('characterSelector').value = character;
  byId('soundSelector').value = String(gameSounds.currentLaserSound);
  byId('gridToggle').checked = Boolean(gameState.gridEnabled);
}

export { MUSIC_PRESETS, DIFFICULTY_PRESETS, currentDifficulty, switchGenre };

let musicUIReady = false;

export function setupMusicUI() {
  // The start screen's settings button and the game start both call this.
  if (musicUIReady) return;
  musicUIReady = true;

  byId('bpmSlider').addEventListener('input', (e) => {
    const bpm = parseInt(e.target.value);
    withTransport((transport) => {
      transport.bpm.value = bpm;
    });
    byId('bpmDisplay').textContent = bpm;
    markCustomPreset();
    saveGameDataDebounced({
      settings: {
        musicPreset: 'custom',
        customMusic: { bpm: bpm }
      }
    });
  });

  byId('energySlider').addEventListener('input', (e) => {
    setEnergyLevel(parseInt(e.target.value));
    byId('energyDisplay').textContent = energyLevel;
    markCustomPreset();
    saveGameDataDebounced({
      settings: {
        musicPreset: 'custom',
        customMusic: { energy: energyLevel }
      }
    });
  });

  byId('tensionSlider').addEventListener('input', (e) => {
    setTensionLevel(parseInt(e.target.value));
    byId('tensionDisplay').textContent = tensionLevel;
    // Apply tension immediately when slider moves
    if (Tone.Transport.state === 'started') {
      applyTension();
    }
    markCustomPreset();
    saveGameDataDebounced({
      settings: {
        musicPreset: 'custom',
        customMusic: { tension: tensionLevel }
      }
    });
  });

  byId('soundSelector').addEventListener('change', (e) => {
    gameSounds.currentLaserSound = parseInt(e.target.value);
    saveGameDataDebounced({ settings: { laserSound: gameSounds.currentLaserSound } });
  });

  byId('characterSelector').addEventListener('change', (e) => {
    const character = CHARACTER_IDS.includes(e.target.value) ? e.target.value : DEFAULT_CHARACTER_ID;

    const gameScene = window.gameScene;
    if (gameScene && typeof gameScene.setPlayerCharacter === 'function') {
      gameScene.setPlayerCharacter(character);
    }

    saveGameDataDebounced({ settings: { character } });
    trackEventSafe('settings_change', {
      setting_type: 'character',
      character
    });
  });

  byId('gridToggle').addEventListener('change', (e) => {
    if (e.target.checked === Boolean(gameState.gridEnabled)) return;
    if (window.gameScene?.scene?.isActive() && window.GameAPI?.toggleGrid) {
      window.GameAPI.toggleGrid();
    } else {
      gameState.gridEnabled = e.target.checked;
      saveGameData({ settings: { gridEnabled: gameState.gridEnabled } });
    }
  });

  byId('musicPresetSelector').addEventListener('change', (e) => {
    const presetKey = e.target.value;
    if (presetKey && MUSIC_PRESETS[presetKey]) {
      const preset = MUSIC_PRESETS[presetKey];

      // Apply preset values (no BPM - let genre control that)
      setEnergyLevel(preset.energy);
      setTensionLevel(preset.tension);
      setSliderValue('energy', preset.energy);
      setSliderValue('tension', preset.tension);
      byId('musicPresetDisplay').textContent = preset.description;

      if (Tone.Transport.state === 'started') {
        applyTension();
      }

      saveGameDataDebounced({ settings: { musicPreset: presetKey } });
    } else {
      byId('musicPresetDisplay').textContent = 'Custom settings';
      saveGameDataDebounced({ settings: { musicPreset: 'custom' } });
    }
  });

  byId('difficultySelector').addEventListener('change', (e) => {
    const diffKey = e.target.value;
    if (DIFFICULTY_PRESETS[diffKey]) {
      currentDifficulty = DIFFICULTY_PRESETS[diffKey];
      byId('difficultyDisplay').textContent = currentDifficulty.description;

      saveGameDataDebounced({ settings: { difficulty: diffKey } });

      trackEventSafe('settings_change', {
        setting_type: 'difficulty',
        difficulty_level: diffKey,
        multiplier: currentDifficulty.speedMult
      });
    }
  });

  Object.entries(GENRE_BUTTONS).forEach(([genre, id]) => {
    byId(id).addEventListener('click', () => switchGenre(genre));
  });

  TRACKS.forEach(track => {
    byId(track + 'Square')?.addEventListener('click', () => {
      muteStates[track] = !muteStates[track];
      renderTrackMute(track);
      saveGameDataDebounced({ settings: { trackMutes: { [track]: muteStates[track] } } });
    });
  });

  switchGenre('techno');
  applySavedMusicSettings();
  onSettingsOpen(syncSettingsControls);
}
