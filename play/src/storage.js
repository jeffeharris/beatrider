// ============================================
// STORAGE SYSTEM - MUST BE FIRST
// ============================================
export const STORAGE_KEY = 'beatrider_data';
const STORAGE_VERSION = 2; // Version number for migrations

// Default settings structure
export const DEFAULT_SETTINGS = {
  version: STORAGE_VERSION,
  highScore: 0,
  settings: {
    gridEnabled: true,
    difficulty: 'normal',
    touchSensitivity: 30,
    laserSound: 0,
    musicPreset: 'driving',
    customMusic: {
      bpm: 128,
      energy: 60,
      tension: 40
    },
    trackMutes: {
      kick: false,
      snare: false,
      hat: false,
      acid: false,
      stab: false,
      sub: false
    }
  }
};

// Deep merge helper for nested settings
export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          output[key] = source[key];
        else
          output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Migrate data from older versions
function migrateData(data) {
  // No version or version 1: flat structure to nested
  if (!data.version || data.version < 2) {
    const migrated = {
      version: STORAGE_VERSION,
      highScore: data.highScore || 0,
      settings: {
        gridEnabled: data.gridEnabled !== undefined ? data.gridEnabled : true,
        difficulty: 'normal',
        touchSensitivity: 30,
        laserSound: 0,
        musicPreset: 'driving',
        customMusic: {
          bpm: 128,
          energy: 60,
          tension: 40
        },
        trackMutes: {
          kick: false,
          snare: false,
          hat: false,
          acid: false,
          stab: false,
          sub: false
        }
      }
    };

    // Check for legacy touchSensitivity key
    const legacySensitivity = localStorage.getItem('touchSensitivity');
    if (legacySensitivity) {
      migrated.settings.touchSensitivity = parseInt(legacySensitivity) || 30;
      localStorage.removeItem('touchSensitivity');
    }

    return migrated;
  }

  return data;
}

export function loadGameData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const migrated = migrateData(parsed);

      // Save migrated data if it changed
      if (migrated.version !== parsed.version) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }

      // Merge with defaults to ensure all fields exist
      return deepMerge(DEFAULT_SETTINGS, migrated);
    }
  } catch (e) {
    console.warn('Failed to load game data, using defaults:', e);
  }
  return { ...DEFAULT_SETTINGS }; // Return a copy of defaults
}

export function saveGameData(data) {
  try {
    const current = loadGameData();
    const updated = deepMerge(current, data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save game data:', e);
    // Continue with session-only settings
  }
}

// Debounced save to prevent excessive writes
let saveTimer = null;
let pendingData = {};

export function saveGameDataDebounced(data) {
  // Accumulate changes
  pendingData = deepMerge(pendingData, data);

  // Clear existing timer
  clearTimeout(saveTimer);

  // Set new timer (100ms delay)
  saveTimer = setTimeout(() => {
    saveGameData(pendingData);
    pendingData = {};
  }, 100);
}

// Load saved data IMMEDIATELY after defining storage functions
export const savedData = loadGameData();
export let sessionHighScore = savedData.highScore;

// Setter for sessionHighScore since ES modules export live bindings for let,
// but reassignment must happen in the declaring module
export function setSessionHighScore(value) {
  sessionHighScore = value;
}
