// music-ui.js - Music UI setup extracted from monolith
// All DOM event listeners for music controls, settings panel, genre switching, etc.

import * as Tone from 'tone';
import { saveGameDataDebounced, savedData } from '../storage.js';
import { unlockIOSAudio } from './ios-unlock.js';
import {
  energyLevel, setEnergyLevel,
  tensionLevel, setTensionLevel,
  currentGenre, setCurrentGenre,
  currentBar, setCurrentBar,
  currentChordIndex, setCurrentChordIndex,
  lastSection, setLastSection,
  muteStates,
  updatePatterns,
  ensureTransportScheduled,
  applyTension,
  GENRE_CONFIGS,
  raveSynth, setRaveSynth,
  kick,
  technoStab,
  dnbReese,
  tropicalPluck
} from './music-engine.js';
import { gameSounds } from './game-sounds.js';

// UI State Management
const uiState = {
  isPlaying: false,
  settingsOpen: false,
  gridVisible: false
};

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

// Difficulty preset definitions
const DIFFICULTY_PRESETS = {
  'zen': { speedMult: 0.5, fireMult: 2.0, spawnMult: 0.5, description: 'Relaxed' },
  'normal': { speedMult: 1.0, fireMult: 1.0, spawnMult: 1.0, description: 'Standard' },
  'intense': { speedMult: 1.5, fireMult: 0.8, spawnMult: 1.3, description: 'Challenging' },
  'chaos': { speedMult: 2.0, fireMult: 0.5, spawnMult: 2.0, description: 'Maximum chaos' }
};

let currentDifficulty = DIFFICULTY_PRESETS.normal;
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

function updatePlayPauseButton() {
  const btn = document.getElementById('playPauseBtn');
  if (!btn) return;

  // Use simple text that won't render as emojis
  if (uiState.isPlaying) {
    btn.textContent = '||';
    btn.title = 'Pause';
  } else {
    btn.textContent = '\u25b6';
    btn.title = 'Play';
  }
}

function updateSettingsButton() {
  const btn = document.getElementById('expandBtn');
  if (!btn) return;

  if (uiState.settingsOpen) {
    btn.textContent = 'X';
    btn.title = 'Close Settings';
  } else {
    btn.textContent = '\u2630';
    btn.title = 'Settings';
  }
}

function updateGridButton() {
  const btn = document.getElementById('gridToggleBtn');
  if (!btn) return;

  btn.textContent = '\u229e';

  if (uiState.gridVisible) {
    btn.style.color = '#0f0';
  } else {
    btn.style.color = '#666';
  }
}

// Update sliders to set preset to custom
const markCustomPreset = () => {
  document.getElementById('musicPresetSelector').value = '';
  document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
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
  const bpmSlider = document.getElementById('bpmSlider');
  bpmSlider.min = config.bpmMin;
  bpmSlider.max = config.bpmMax;
  bpmSlider.value = config.bpmDefault;

  // Update BPM
  withTransport((transport) => {
    transport.bpm.value = config.bpmDefault;
  });
  document.getElementById('bpmDisplay').textContent = config.bpmDefault;

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

  // Update button styles
  const genreButtonMap = {
    'techno': 'genreTechno',
    'dnb': 'genreDnb',
    'tropical': 'genreTropical',
    'dubstep': 'genreDubstep',
    'trance': 'genreTrance'
  };

  Object.keys(genreButtonMap).forEach(g => {
    const btn = document.getElementById(genreButtonMap[g]);
    if (btn) {
      btn.style.setProperty('background', genre === g ? '#0f0' : '#333', 'important');
      btn.style.setProperty('color', genre === g ? '#000' : '#0f0', 'important');
    }
  });

  // Force pattern update on next bar
  updatePatterns();
}

// Handle touch events for transparency
function addTouchHandlers(element) {
  if (!element) return;

  let touchTimeout;

  // Only add touch handlers on actual touch devices
  if ('ontouchstart' in window) {
    element.addEventListener('touchstart', () => {
      element.classList.add('touched');
      clearTimeout(touchTimeout);
    });

    element.addEventListener('touchend', () => {
      // Keep opaque for a bit after touch ends
      touchTimeout = setTimeout(() => {
        element.classList.remove('touched');
      }, 3000); // Stay visible for 3 seconds after touch
    });
  }

  // For desktop, ensure touched class is removed on mouse leave
  element.addEventListener('mouseleave', () => {
    // Remove immediately on desktop
    element.classList.remove('touched');
  });
}

export { uiState, MUSIC_PRESETS, DIFFICULTY_PRESETS, currentDifficulty, switchGenre, updatePlayPauseButton, updateSettingsButton, updateGridButton };

export function setupMusicUI() {
  // Play/pause button handler
  const playPauseBtn = document.getElementById('playPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', async () => {
      // iOS audio unlock - critical for iPhone/iPad
      if (typeof unlockIOSAudio === 'function') {
        await unlockIOSAudio();
      }

      // Ensure proper audio context initialization
      try {
        await Tone.start();

        // Mac-specific: ensure context is truly running
        if (Tone.context.state === 'suspended') {
          await Tone.context.resume();
        }
      } catch (error) {
        console.error('Error initializing audio:', error);
      }

      // Check if game is running and handle game pause
      const gameScene = window.gameScene;
      if (gameScene && gameScene.scene.isActive()) {
        if (Tone.Transport.state === 'started') {
          // Pause both music and game
          gameScene.pauseGame();
        } else {
          // Resume both music and game
          gameScene.resumeGame();
        }
      } else {
        // No game running, just handle music
        if (Tone.Transport.state !== 'started') {
          // Play
          setCurrentBar(0);
          window.currentBar = 0;
          setCurrentChordIndex(0);
          setLastSection('');
          updatePatterns();
          ensureTransportScheduled();
          Tone.Transport.start();
          document.getElementById('status').textContent = 'PLAYING';
          uiState.isPlaying = true;
          updatePlayPauseButton();
        } else {
          // Pause
          Tone.Transport.pause();
          document.getElementById('status').textContent = 'PAUSED';
          uiState.isPlaying = false;
          updatePlayPauseButton();
        }
      }
    });
  }

  // BPM slider
  document.getElementById('bpmSlider').addEventListener('input', (e) => {
    const bpm = parseInt(e.target.value);
    withTransport((transport) => {
      transport.bpm.value = bpm;
    });
    document.getElementById('bpmDisplay').textContent = bpm;
    // Mark as custom and save
    markCustomPreset();
    saveGameDataDebounced({
      settings: {
        musicPreset: 'custom',
        customMusic: { bpm: bpm }
      }
    });
  });

  // Energy slider
  document.getElementById('energySlider').addEventListener('input', (e) => {
    setEnergyLevel(parseInt(e.target.value));
    document.getElementById('energyDisplay').textContent = energyLevel;
    // Mark as custom and save
    markCustomPreset();
    saveGameDataDebounced({
      settings: {
        musicPreset: 'custom',
        customMusic: { energy: energyLevel }
      }
    });
  });

  // Tension slider
  document.getElementById('tensionSlider').addEventListener('input', (e) => {
    setTensionLevel(parseInt(e.target.value));
    document.getElementById('tensionDisplay').textContent = tensionLevel;
    // Apply tension immediately when slider moves
    if (Tone.Transport.state === 'started') {
      applyTension();
    }
    // Mark as custom and save
    markCustomPreset();
    saveGameDataDebounced({
      settings: {
        musicPreset: 'custom',
        customMusic: { tension: tensionLevel }
      }
    });
  });

  // Sound selector
  document.getElementById('soundSelector').addEventListener('change', (e) => {
    gameSounds.currentLaserSound = parseInt(e.target.value);
    document.getElementById('soundDisplay').textContent = e.target.options[e.target.selectedIndex].text;
    // Save laser sound selection
    saveGameDataDebounced({ settings: { laserSound: gameSounds.currentLaserSound } });
  });

  // Music preset selector
  document.getElementById('musicPresetSelector')?.addEventListener('change', (e) => {
    const presetKey = e.target.value;
    if (presetKey && MUSIC_PRESETS[presetKey]) {
      const preset = MUSIC_PRESETS[presetKey];

      // Apply preset values (no BPM - let genre control that)
      setEnergyLevel(preset.energy);
      setTensionLevel(preset.tension);

      // Update sliders (energy and tension only)
      document.getElementById('energySlider').value = preset.energy;
      document.getElementById('energyDisplay').textContent = preset.energy;
      document.getElementById('tensionSlider').value = preset.tension;
      document.getElementById('tensionDisplay').textContent = preset.tension;

      // Update description
      document.getElementById('musicPresetDisplay').textContent = preset.description;

      // Apply tension if playing
      if (Tone.Transport.state === 'started') {
        applyTension();
      }

      // Save preset selection
      saveGameDataDebounced({ settings: { musicPreset: presetKey } });
    } else {
      document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
      // Save custom preset marker
      saveGameDataDebounced({ settings: { musicPreset: 'custom' } });
    }
  });

  // Difficulty selector
  document.getElementById('difficultySelector')?.addEventListener('change', (e) => {
    const diffKey = e.target.value;
    if (DIFFICULTY_PRESETS[diffKey]) {
      currentDifficulty = DIFFICULTY_PRESETS[diffKey];
      document.getElementById('difficultyDisplay').textContent = currentDifficulty.description;

      // Save difficulty setting
      saveGameDataDebounced({ settings: { difficulty: diffKey } });

      // Track difficulty change
      trackEventSafe('settings_change', {
        setting_type: 'difficulty',
        difficulty_level: diffKey,
        multiplier: currentDifficulty.multiplier
      });
    }
  });

  // Genre switching handlers
  document.getElementById('genreTechno').addEventListener('click', () => switchGenre('techno'));
  document.getElementById('genreDnb').addEventListener('click', () => switchGenre('dnb'));
  document.getElementById('genreTropical').addEventListener('click', () => switchGenre('tropical'));
  document.getElementById('genreDubstep').addEventListener('click', () => switchGenre('dubstep'));
  document.getElementById('genreTrance').addEventListener('click', () => switchGenre('trance'));

  // Initial BPM and genre - will be overridden by saved settings if they exist
  document.getElementById('bpmDisplay').textContent = 132;
  // Set initial genre button highlighting
  switchGenre('techno');

  // Apply saved music settings after page loads
  window.addEventListener('load', () => {
    if (savedData.settings) {
      // Apply saved music preset or custom values
      if (savedData.settings.musicPreset === 'custom' && savedData.settings.customMusic) {
        // Apply custom BPM/energy/tension
        const custom = savedData.settings.customMusic;
        if (custom.bpm) {
          withTransport((transport) => {
            transport.bpm.value = custom.bpm;
          });
          document.getElementById('bpmSlider').value = custom.bpm;
          document.getElementById('bpmDisplay').textContent = custom.bpm;
        }
        if (custom.energy !== undefined) {
          setEnergyLevel(custom.energy);
          document.getElementById('energySlider').value = custom.energy;
          document.getElementById('energyDisplay').textContent = custom.energy;
        }
        if (custom.tension !== undefined) {
          setTensionLevel(custom.tension);
          document.getElementById('tensionSlider').value = custom.tension;
          document.getElementById('tensionDisplay').textContent = custom.tension;
        }
        // Set preset selector to custom
        document.getElementById('musicPresetSelector').value = '';
        document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
      } else if (savedData.settings.musicPreset && MUSIC_PRESETS[savedData.settings.musicPreset]) {
        // Apply preset
        const preset = MUSIC_PRESETS[savedData.settings.musicPreset];
        setEnergyLevel(preset.energy);
        setTensionLevel(preset.tension);
        document.getElementById('musicPresetSelector').value = savedData.settings.musicPreset;
        document.getElementById('musicPresetDisplay').textContent = preset.description;
        document.getElementById('energySlider').value = preset.energy;
        document.getElementById('energyDisplay').textContent = preset.energy;
        document.getElementById('tensionSlider').value = preset.tension;
        document.getElementById('tensionDisplay').textContent = preset.tension;
      }

      // Apply saved difficulty UI
      if (savedData.settings.difficulty) {
        document.getElementById('difficultySelector').value = savedData.settings.difficulty;
        document.getElementById('difficultyDisplay').textContent = currentDifficulty.description;
      }

      // Apply saved laser sound UI
      if (savedData.settings.laserSound !== undefined) {
        document.getElementById('soundSelector').value = savedData.settings.laserSound;
        const soundNames = ['Triangle', 'Acid', 'Chord', 'Echo', 'Pluck', 'Pew Pew'];
        document.getElementById('soundDisplay').textContent = soundNames[savedData.settings.laserSound];
      }

      // Apply mute states to UI
      Object.keys(muteStates).forEach(track => {
        const square = document.getElementById(track + 'Square');
        if (square) {
          if (muteStates[track]) {
            square.classList.remove('active');
            square.classList.add('muted');
          } else {
            square.classList.add('active');
            square.classList.remove('muted');
          }
        }
      });
    }
  });

  // Track square handlers for minimized controls
  ['kick', 'snare', 'hat', 'acid', 'stab', 'sub'].forEach(track => {
    const square = document.getElementById(track + 'Square');
    if (square) {
      // Initialize as active (not muted)
      square.classList.add('active');

      square.addEventListener('click', () => {
        muteStates[track] = !muteStates[track];
        if (muteStates[track]) {
          square.classList.remove('active');
          square.classList.add('muted');
        } else {
          square.classList.add('active');
          square.classList.remove('muted');
        }
        // Save track mute state
        saveGameDataDebounced({ settings: { trackMutes: { [track]: muteStates[track] } } });
      });
    }
  });

  // Expand/minimize panel with smooth animation
  const expandBtn = document.getElementById('expandBtn');
  const expandedPanel = document.getElementById('expandedPanel');
  const musicControls = document.getElementById('musicControls');

  // Add touch handlers to both panels
  addTouchHandlers(musicControls);
  addTouchHandlers(expandedPanel);

  // Grid toggle button handler
  const gridToggleBtn = document.getElementById('gridToggleBtn');
  if (gridToggleBtn) {
    // Don't set initial color here - wait for game to initialize
    gridToggleBtn.addEventListener('click', () => {
      // Trigger grid toggle in the game
      if (window.GameAPI && window.GameAPI.toggleGrid) {
        window.GameAPI.toggleGrid();
      }
    });
  }

  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent document click from firing
      const musicControls = document.getElementById('musicControls');

      if (expandedPanel.classList.contains('expanded')) {
        // Panel is open, close it
        expandedPanel.classList.remove('expanded');
        musicControls.classList.remove('settings-open');
        uiState.settingsOpen = false;
        updateSettingsButton();

        // Make player vulnerable again
        const mainScene = window.game?.scene?.getScene('Main');
        if (mainScene && mainScene.player) {
          mainScene.isInvincible = false;
        }
      } else {
        // Panel is closed, open it
        expandedPanel.classList.add('expanded');
        musicControls.classList.add('settings-open');
        uiState.settingsOpen = true;
        updateSettingsButton();

        // Make player invincible and flash
        const mainScene = window.game?.scene?.getScene('Main');
        if (mainScene && mainScene.player) {
          mainScene.isInvincible = true;

          // Flash effect
          mainScene.player.setTint(0xffff00);
          mainScene.time.delayedCall(100, () => {
            mainScene.player.setTint(0xffffff);
            mainScene.time.delayedCall(100, () => {
              mainScene.player.setTint(0xffff00);
              mainScene.time.delayedCall(100, () => {
                mainScene.player.clearTint();
              });
            });
          });
        }
      }
    });
  }

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!uiState.settingsOpen) return;

    const panel = document.getElementById('expandedPanel');
    const btn = document.getElementById('expandBtn');
    const musicControls = document.getElementById('musicControls');

    // Check if click is outside panel, button, and music controls
    if (!panel.contains(e.target) && !btn.contains(e.target) && !musicControls.contains(e.target)) {
      panel.classList.remove('expanded');
      musicControls.classList.remove('settings-open');
      uiState.settingsOpen = false;
      updateSettingsButton();

      // Make player vulnerable again
      const mainScene = window.game?.scene?.getScene('Main');
      if (mainScene && mainScene.player) {
        mainScene.isInvincible = false;
      }
    }
  });

  // Close menu when game control keys are pressed
  document.addEventListener('keydown', (e) => {
    if (!uiState.settingsOpen) return;

    // Game control keys that should close the menu
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                      'a', 'd', 'w', 's', ' ', 'Escape'];

    if (gameKeys.includes(e.key) || gameKeys.includes(e.key.toLowerCase())) {
      const panel = document.getElementById('expandedPanel');
      const musicControls = document.getElementById('musicControls');
      panel.classList.remove('expanded');
      musicControls.classList.remove('settings-open');
      uiState.settingsOpen = false;
      updateSettingsButton();

      // Make player vulnerable again
      const mainScene = window.game?.scene?.getScene('Main');
      if (mainScene && mainScene.player) {
        mainScene.isInvincible = false;
      }
    }
  });
}
