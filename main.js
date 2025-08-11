// Main entry point - wires together all modules
import { CONFIG, PRESETS, getMobileValue } from './config.js';
import eventBus, { EVENTS } from './event-bus.js';
import musicEngine from './music-engine.js';
import gameSounds from './game-sounds.js';

// Detect mobile and set body class
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                 ('ontouchstart' in window);
if (isMobile) {
  document.body.classList.add('mobile');
}

// Global state that will eventually be moved into game-core module
let gridEnabled = true;
let sessionHighScore = 0;
let currentDifficultyMultipliers = PRESETS.difficulty.normal;

// Calculate dimensions
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const LANES = CONFIG.game.lanes;
const LANE_W = WIDTH / LANES;

// Player Y position based on device
const PLAYER_Y = HEIGHT - getMobileValue(
  CONFIG.game.player.yPosition.desktop,
  CONFIG.game.player.yPosition.mobile
);

// Initialize modules
async function initModules() {
  await musicEngine.init();
  await gameSounds.init();
  
  // Wire up UI controls
  setupUIControls();
  
  // Create bridge for game to receive music events
  setupGameBridge();
}

// Setup UI control handlers
function setupUIControls() {
  // Play/Stop buttons
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  playBtn?.addEventListener('click', async () => {
    await musicEngine.start();
    document.getElementById('status').textContent = 'PLAYING';
  });
  
  stopBtn?.addEventListener('click', () => {
    musicEngine.stop();
    document.getElementById('status').textContent = 'STOPPED';
  });
  
  // Parameter sliders
  const bpmSlider = document.getElementById('bpmSlider');
  const energySlider = document.getElementById('energySlider');
  const tensionSlider = document.getElementById('tensionSlider');
  
  bpmSlider?.addEventListener('input', (e) => {
    const bpm = parseInt(e.target.value);
    musicEngine.setBPM(bpm);
    document.getElementById('bpmDisplay').textContent = bpm;
    // Set preset to custom when manually adjusting
    document.getElementById('musicPresetSelector').value = '';
    document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
  });
  
  energySlider?.addEventListener('input', (e) => {
    const energy = parseInt(e.target.value);
    musicEngine.setEnergy(energy);
    document.getElementById('energyDisplay').textContent = energy;
    // Set preset to custom when manually adjusting
    document.getElementById('musicPresetSelector').value = '';
    document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
  });
  
  tensionSlider?.addEventListener('input', (e) => {
    const tension = parseInt(e.target.value);
    musicEngine.setTension(tension);
    document.getElementById('tensionDisplay').textContent = tension;
    // Set preset to custom when manually adjusting
    document.getElementById('musicPresetSelector').value = '';
    document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
  });
  
  // Sound selector
  const soundSelector = document.getElementById('soundSelector');
  soundSelector?.addEventListener('change', (e) => {
    const soundIndex = parseInt(e.target.value);
    gameSounds.setLaserSound(soundIndex);
    document.getElementById('soundDisplay').textContent = gameSounds.getLaserSoundName();
  });
  
  // Music preset selector
  const musicPresetSelector = document.getElementById('musicPresetSelector');
  musicPresetSelector?.addEventListener('change', (e) => {
    const presetKey = e.target.value;
    if (presetKey && PRESETS.music[presetKey]) {
      const preset = PRESETS.music[presetKey];
      
      // Apply preset values
      musicEngine.setBPM(preset.bpm);
      musicEngine.setEnergy(preset.energy);
      musicEngine.setTension(preset.tension);
      
      // Update sliders to reflect preset
      document.getElementById('bpmSlider').value = preset.bpm;
      document.getElementById('bpmDisplay').textContent = preset.bpm;
      document.getElementById('energySlider').value = preset.energy;
      document.getElementById('energyDisplay').textContent = preset.energy;
      document.getElementById('tensionSlider').value = preset.tension;
      document.getElementById('tensionDisplay').textContent = preset.tension;
      
      // Update description
      document.getElementById('musicPresetDisplay').textContent = preset.description;
    } else {
      document.getElementById('musicPresetDisplay').textContent = 'Custom settings';
    }
  });
  
  // Difficulty selector
  const difficultySelector = document.getElementById('difficultySelector');
  difficultySelector?.addEventListener('change', (e) => {
    const difficultyKey = e.target.value;
    if (PRESETS.difficulty[difficultyKey]) {
      currentDifficultyMultipliers = PRESETS.difficulty[difficultyKey];
      document.getElementById('difficultyDisplay').textContent = currentDifficultyMultipliers.description;
      
      // Emit event so game can adjust
      eventBus.emit('DIFFICULTY_CHANGE', currentDifficultyMultipliers);
    }
  });
  
  // Track mute squares
  const trackSquares = document.querySelectorAll('.track-square');
  trackSquares.forEach(square => {
    square.addEventListener('click', () => {
      const track = square.dataset.track;
      musicEngine.toggleTrack(track);
    });
  });
  
  // Panel expand/collapse
  const expandBtn = document.getElementById('expandBtn');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const expandedPanel = document.getElementById('expandedPanel');
  const musicControls = document.getElementById('musicControls');
  
  expandBtn?.addEventListener('click', () => {
    expandedPanel.classList.add('expanded');
    musicControls.classList.add('touched');
  });
  
  minimizeBtn?.addEventListener('click', () => {
    expandedPanel.classList.remove('expanded');
  });
  
  // Grid toggle
  const gridToggleBtn = document.getElementById('gridToggleBtn');
  gridToggleBtn?.addEventListener('click', () => {
    gridEnabled = !gridEnabled;
    gridToggleBtn.style.color = gridEnabled ? '#0f0' : '#f00';
    eventBus.emit(EVENTS.UI_GRID_TOGGLE, { enabled: gridEnabled });
  });
  
  // Touch support for opacity changes
  musicControls?.addEventListener('touchstart', () => {
    musicControls.classList.add('touched');
  });
  
  expandedPanel?.addEventListener('touchstart', () => {
    expandedPanel.classList.add('touched');
  });
}

// Create bridge for game to receive music events
function setupGameBridge() {
  // The game will subscribe to these events via eventBus
  // For now, maintain backward compatibility with window.GameAPI
  window.GameAPI = {
    onBeat: (callback) => eventBus.on(EVENTS.KICK, callback),
    onSnare: (callback) => eventBus.on(EVENTS.SNARE, callback),
    onHihat: (callback) => eventBus.on(EVENTS.HIHAT, callback),
    onAcid: (callback) => eventBus.on(EVENTS.ACID, callback),
    onStab: (callback) => eventBus.on(EVENTS.STAB, callback),
    onSub: (callback) => eventBus.on(EVENTS.SUB, callback)
  };
}

// Wait for DOM to be ready, then initialize everything
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

async function initialize() {
  // Initialize modules
  await initModules();
  
  // Dynamically import game-core and create the game
  // This avoids issues with the game trying to start before modules are ready
  const gameModule = await import('./game-core.js');
  
  // Create Phaser game
  window.game = gameModule.createGame();
}

// Export for debugging and game access
window.DEBUG = {
  config: CONFIG,
  musicEngine,
  gameSounds,
  eventBus,
  updateConfig: (path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], CONFIG);
    target[lastKey] = value;
    console.log(`Updated ${path} to ${value}`);
  }
};

// Export difficulty for game access
window.getDifficultyMultipliers = () => currentDifficultyMultipliers;
window.isGridEnabled = () => gridEnabled;