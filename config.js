// Central configuration for Beatrider
// All magic numbers and tunable parameters in one place

export const CONFIG = {
  // Audio Engine Settings
  audio: {
    bpm: {
      min: 120,
      max: 150,
      default: 132
    },
    
    // Master chain effects
    master: {
      limiter: -3,
      highpass: {
        frequency: 20,
        type: "highpass",
        rolloff: -24
      }
    },
    
    // Sidechain compression (ducking)
    sidechain: {
      threshold: -20,
      ratio: 8,
      attack: 0.003,
      release: 0.1
    },
    
    // Instrument configurations
    instruments: {
      kick: {
        pitchDecay: 0.05,
        octaves: 10,
        envelope: {
          attack: 0.001,
          decay: 0.4,
          sustain: 0.01,
          release: 1.4
        }
      },
      
      snare: {
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0
        }
      },
      
      hihat: {
        filterFreq: 10000,
        envelope: {
          attack: 0.001,
          decay: 0.02,
          sustain: 0,
          release: 0.03
        },
        volume: -10
      },
      
      acid: {
        filter: {
          frequency: 800,
          rolloff: -12,
          Q: 4
        },
        distortion: 0.3,
        envelope: {
          attack: 0.003,
          decay: 0.2,
          sustain: 0.1,
          release: 0.1
        },
        filterEnvelope: {
          attack: 0.003,
          decay: 0.4,
          sustain: 0.2,
          release: 0.2,
          baseFrequency: 100,
          octaves: 4
        },
        portamento: 0.05
      },
      
      stab: {
        filter: {
          frequency: 3000,
          rolloff: -12,
          Q: 2
        },
        reverb: {
          decay: 2,
          wet: 0.3
        },
        envelope: {
          attack: 0.01,
          decay: 0.15,
          sustain: 0,
          release: 0.2
        },
        volume: -2
      },
      
      sub: {
        eq: {
          low: 3,
          mid: -6,
          high: -12
        },
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.4,
          release: 0.4
        }
      },
      
      riser: {
        envelope: {
          attack: 4,
          sustain: 1,
          release: 0.1
        },
        filter: {
          minFreq: 200,
          maxFreq: 8000
        }
      }
    },
    
    // Pattern generation
    patterns: {
      beatsPerBar: 16,
      barsPerSection: {
        INTRO: 8,
        BUILD: 8,
        MAIN: 16,
        BREAK: 8,
        DROP: 16,
        OUTRO: 8
      }
    }
  },
  
  // Game Settings
  game: {
    // Layout
    lanes: 5,
    perspective: {
      vanishY: 0.15, // As percentage of screen height
      vanishX: 0.5,  // As percentage of screen width
      gridLineCount: 20,
      gridFadeStart: 10
    },
    
    // Player
    player: {
      yPosition: {
        desktop: 60,  // Pixels from bottom
        mobile: 90
      },
      speed: 150,    // Base movement speed
      laneTransitionTime: 150, // ms
      jumpHeight: 80,
      jumpDuration: 400
    },
    
    // Combat
    combat: {
      bulletSpeed: 520,
      fireCooldown: 110,
      rapidFireCooldown: 25,
      bulletArcHeight: 100,
      bulletColors: [0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x0088ff]
    },
    
    // Enemies
    enemies: {
      baseSpeed: {
        desktop: 200,
        mobile: 150
      },
      types: {
        regular: {
          speed: 1.0,
          health: 1,
          points: 10,
          color: 0xff0000
        },
        fast: {
          speed: 1.8,
          health: 1,
          points: 20,
          color: 0xff00ff
        },
        drift: {
          speed: 0.8,
          health: 2,
          points: 30,
          color: 0x00ffff,
          driftSpeed: 2
        },
        tank: {
          speed: 0.5,
          health: 3,
          points: 50,
          color: 0xffaa00,
          scale: 1.5
        }
      }
    },
    
    // Obstacles
    obstacles: {
      speed: 1.2,
      jumpWindow: 300, // ms before collision to allow jump
      colors: [0x808080, 0xa0a0a0]
    },
    
    // Power-ups
    powerups: {
      speed: 1.0,
      types: {
        rapidFire: {
          duration: 5000,
          color: 0xffff00
        },
        shield: {
          duration: 8000,
          color: 0x00ffff
        },
        multiShot: {
          duration: 6000,
          color: 0xff00ff
        }
      }
    },
    
    // Scoring
    scoring: {
      comboTimeout: 2000,
      comboMultiplier: 0.5,
      perfectBeatBonus: 50,
      survivalBonus: 1 // Per second
    },
    
    // Effects
    effects: {
      particleLifetime: 1000,
      explosionParticles: 10,
      starfield: {
        layers: 3,
        counts: [100, 50, 25],
        sizes: [1, 1.5, 2],
        colors: [0x666666, 0x999999, 0xbbbbbb],
        speeds: [0.3, 0.6, 0.9]
      },
      scanlines: {
        count: 8,
        opacity: 0.03,
        speed: 100
      }
    }
  },
  
  // UI Settings
  ui: {
    // Mobile scaling
    mobile: {
      uiScale: 1.5,
      fontScale: 1.3,
      touchAreaScale: 1.5
    },
    
    // Panel animations
    transitions: {
      panelExpandTime: 400,
      fadeTime: 300,
      defaultOpacity: 0.15,
      hoverOpacity: 1.0
    },
    
    // Track indicators
    trackSquares: {
      size: {
        desktop: 30,
        mobile: 45
      },
      flashDuration: 100,
      colors: {
        active: 0x00ff00,
        muted: 0xff0000,
        inactive: 0x003000
      }
    },
    
    // Display formatting
    display: {
      scoreDigits: 8,
      livesMax: 5,
      comboFlashThreshold: 5
    }
  },
  
  // Development/Debug Settings
  debug: {
    showFPS: false,
    showHitboxes: false,
    invincible: false,
    skipIntro: false,
    logBeats: false,
    logCollisions: false
  }
};

// Helper function to get mobile-aware values
export function getMobileValue(desktopValue, mobileValue) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window);
  return isMobile ? mobileValue : desktopValue;
}

// Helper to get config value with path (e.g., "game.player.speed")
export function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], CONFIG);
}

// Allow runtime config updates (useful for debugging/tuning)
export function updateConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => obj[key], CONFIG);
  target[lastKey] = value;
}

// Presets for quick configuration changes
export const PRESETS = {
  music: {
    'chill': { 
      name: 'Chill',
      bpm: 122, 
      energy: 30, 
      tension: 20,
      description: 'Laid back minimal techno'
    },
    'driving': { 
      name: 'Driving',
      bpm: 132, 
      energy: 60, 
      tension: 40,
      description: 'Classic techno groove'
    },
    'peak': { 
      name: 'Peak Time',
      bpm: 138, 
      energy: 85, 
      tension: 70,
      description: 'High energy dance floor'
    },
    'acid': { 
      name: 'Acid Storm',
      bpm: 135, 
      energy: 75, 
      tension: 90,
      description: '303 madness'
    },
    'trance': {
      name: 'Trance',
      bpm: 140,
      energy: 70,
      tension: 50,
      description: 'Euphoric and uplifting'
    }
  },
  
  difficulty: {
    'zen': {
      name: 'Zen Mode',
      enemySpeedMultiplier: 0.5,
      fireRateMultiplier: 2.0,
      enemySpawnMultiplier: 0.5,
      description: 'Relaxed gameplay'
    },
    'normal': {
      name: 'Normal',
      enemySpeedMultiplier: 1.0,
      fireRateMultiplier: 1.0,
      enemySpawnMultiplier: 1.0,
      description: 'Standard challenge'
    },
    'intense': {
      name: 'Intense',
      enemySpeedMultiplier: 1.5,
      fireRateMultiplier: 0.8,
      enemySpawnMultiplier: 1.3,
      description: 'For experienced players'
    },
    'chaos': {
      name: 'Chaos',
      enemySpeedMultiplier: 2.0,
      fireRateMultiplier: 0.5,
      enemySpawnMultiplier: 2.0,
      description: 'Maximum intensity'
    }
  }
};