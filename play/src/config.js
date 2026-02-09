import { savedData } from './storage.js';

// ============================================
// DEVICE DETECTION & GAME CONFIGURATION
// ============================================

// Check if mobile device
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window) ||
                 (navigator.maxTouchPoints > 0);

// Initialize grid setting from saved data
let gridEnabled = savedData.settings?.gridEnabled !== undefined ? savedData.settings.gridEnabled : true;

// NOTE: Touch sensitivity DOM setup (lines 2562-2622 in monolith) belongs in music-ui.js
// It manipulates DOM elements and event listeners for the settings panel.

// Initialize game dimensions - use visualViewport for accurate mobile sizing
let WIDTH = window.visualViewport ? window.visualViewport.width : window.innerWidth;
let HEIGHT = window.visualViewport ? window.visualViewport.height : window.innerHeight;
export const LANES = 5;
let LANE_W = WIDTH / LANES;

// Settings are now applied where each variable is defined
// Game dimensions initialized based on viewport - adjust for mobile
let PLAYER_Y = HEIGHT - (isMobile ? 90 : 60); // More space from bottom on mobile
export const ENEMY_SPEED_BASE = isMobile ? 150 : 200; // Slower on mobile for easier play
export const BULLET_SPEED = 520;
export const FIRE_COOLDOWN = 110;
export const HORIZONTAL_SHOOTING = true; // Enable horizontal shooting across lanes

// Arc shot tuning parameters
export const ARC_SHOT_BASE_SAFE_DISTANCE = 0.4; // Base 40% of path immune to obstacles
export const ARC_SHOT_HEIGHT_BONUS = 0.3; // Additional 30% max based on jump height
export const ARC_SHOT_MAX_JUMP_HEIGHT = 360; // Reference for calculating height percentage

// Smart scaling based on device and orientation
let isLandscape = window.innerWidth > window.innerHeight;
let MOBILE_SCALE = isMobile ? (isLandscape ? 1.2 : 1.5) : 1; // Smaller scale in landscape

// Mutable game state gathered into one object for easy import/export
export const gameState = {
  get WIDTH() { return WIDTH; },
  set WIDTH(v) { WIDTH = v; },
  get HEIGHT() { return HEIGHT; },
  set HEIGHT(v) { HEIGHT = v; },
  get LANE_W() { return LANE_W; },
  set LANE_W(v) { LANE_W = v; },
  get PLAYER_Y() { return PLAYER_Y; },
  set PLAYER_Y(v) { PLAYER_Y = v; },
  get isLandscape() { return isLandscape; },
  set isLandscape(v) { isLandscape = v; },
  get MOBILE_SCALE() { return MOBILE_SCALE; },
  set MOBILE_SCALE(v) { MOBILE_SCALE = v; },
  get gridEnabled() { return gridEnabled; },
  set gridEnabled(v) { gridEnabled = v; },
};

// Helper to recalculate dimensions (called on resize)
export function updateDimensions(w, h) {
  WIDTH = w;
  HEIGHT = h;
  LANE_W = w / LANES;
  PLAYER_Y = h - (isMobile ? 90 : 60);
  isLandscape = w > h;
  MOBILE_SCALE = isMobile ? (isLandscape ? 1.2 : 1.5) : 1;
}

// PLAYER ANIMATION & CONTROL CONFIG
// Critical: These timings affect gameplay - isMoving blocks shooting/collision during animations
export const PLAYER_CONFIG = {
  // Ground movement animations (jello stretch effect)
  movement: {
    ground: {
      // Phase 1: Anticipation stretch
      stretch: {
        scaleX: 1.8,      // Horizontal stretch factor
        scaleY: 0.5,      // Vertical compression
        duration: 60      // ms - CRITICAL: affects responsiveness
      },
      // Phase 2: Slingshot to position
      slingshot: {
        overshoot: 15,    // Pixels past target
        scaleX: 0.6,      // Squash on arrival
        scaleY: 1.5,      // Stretch vertically
        duration: 80      // ms - CRITICAL: main movement time
      },
      // Phase 3: Bounce back
      bounce: {
        offset: 8,        // Pixels to bounce back
        scaleX: 1.2,
        scaleY: 0.85,
        duration: 80      // ms
      },
      // Phase 4: Settle with wobble
      settle: {
        duration: 200,    // ms - CRITICAL: total time before can move again
        elasticity: [0.4, 0.3]  // Elastic.easeOut params for wobbles
      },
      // Wobble physics
      wobble: {
        damping: 0.92,    // How quickly wobble settles
        reactiveForce: 12 // Force applied opposite to movement
      }
    },
    // Air movement (during jump)
    air: {
      duration: 200,      // ms - faster than ground movement
      barrelRoll: {
        angle: 360,       // Degrees of rotation
        duration: 300     // ms - overlaps with movement
      },
      scalePulse: {
        x: 1.5,
        y: 0.7,
        duration: 100     // ms
      }
    }
  },

  // Jump animations
  jump: {
    regular: {
      height: 120,        // Pixels above PLAYER_Y
      duration: 250,      // ms - up phase (total is 2x with yoyo)
      scaleX: 1.2,
      scaleY: 1.2,
      spinAngle: 360,     // Forward flip
      spinDuration: 500   // ms - matches total jump time
    },
    // Super jump (charge mechanic)
    super: {
      chargeTime: 1000,   // ms - max charge duration
      minHeight: 120,     // Minimum jump height (no charge)
      maxHeight: 360,     // Maximum jump height (full charge)
      // Charge animation
      crouch: {
        scaleX: 1.4,
        scaleY: 0.6,
        duration: 100     // ms to enter crouch
      },
      // Launch preparation
      prelaunch: {
        scaleX: 1.6,
        scaleY: 0.3,
        duration: 150     // ms before launch
      },
      // Variable based on charge
      jumpDurationBase: 300,     // ms - base duration
      jumpDurationPerCharge: 200, // ms - added per charge percent
      // Landing sequence
      landing: {
        squashX: 2,
        squashY: 0.3,
        bounceHeight: 20,
        bounceDuration: 100,
        settleDuration: 400,
        elasticParams: [0.2, 0.15]
      }
    }
  },

  // Dash mechanics
  dash: {
    doubleTapWindow: 250,  // ms - window for double-tap detection
    duration: 60,           // ms - same as stretch phase for consistency
    trailCount: 2,          // Number of trail images
    trailAlpha: [0.5, 0.3], // Alpha for each trail
    trailFadeDuration: 200  // ms
  },

  // Collision detection
  collision: {
    yThreshold: 40          // Pixels - how close obstacles need to be to player Y to trigger collision
  },

  // Off-screen mechanics
  offScreen: {
    gracePeriod: 800,       // ms before rubber band kicks in
    warningThreshold: 300,  // ms - when to show red warning
    alpha: 0.7,             // Transparency when off-screen
    snapBack: {
      duration: 300,        // ms for rubber band animation
      stretchX: 1.5,
      stretchY: 0.7,
      spinAngle: 360,
      settleDuration: 200
    }
  },

  // Idle animations (jello physics)
  idle: {
    wobble: {
      breathSpeed: 0.003,   // Phase increment per ms
      breathScale: 0.03,    // Max scale change
      squishScale: 0.02,    // Secondary frequency scale
      randomImpulse: {
        chance: 0.02,       // Per frame chance
        force: 2            // Random force strength
      }
    }
  },

  // Reaction animations (collecting power-ups, etc)
  reactions: {
    powerUp: {
      wobbleX: 20,          // Random X force range
      wobbleY: -15,         // Upward force
      bounceCount: 2,
      bounceScaleX: 1.4,
      bounceScaleY: 0.7,
      bounceDuration: 100,
      settleDuration: 200
    },
    recoil: {               // When firing
      wobbleY: 3,
      scaleX: 0.9,
      scaleY: 1.1,
      duration: 50
    }
  }
};

// ============================================
// PLATFORM DETECTION (for Phaser renderer)
// ============================================

// Detect Mac browsers which have WebGL performance issues
export const isMac = /Mac/.test(navigator.platform || navigator.userAgent);
// Note: Safari detection is also defined in ios-unlock.js for audio context;
// this one is used for renderer selection
export const isSafariBrowser = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
export const isChrome = /Chrome/.test(navigator.userAgent);

// Force Canvas on Mac browsers due to WebGL performance issues
export const useCanvas = isMac && (isSafariBrowser || isChrome);

// ============================================
// GRID PULSE PATTERNS
// ============================================

// Pulse pattern definitions for grid movement
// Logic: In non-chaos modes, grid pulses follow predictable patterns that players can learn.
// Each musical section (INTRO, BUILD, MAIN, etc.) has a pattern intensity that matches its energy.
// Patterns are applied to the existing sub bass hits (2 per bar) rather than creating new timing.
// This creates a "dancing" grid that feels musical rather than random, while chaos mode stays unpredictable.
// Patterns cycle every 8 bars within a section for variety without being overwhelming.
// -1 = skip pulse, 0 = forward, 1 = left, 2 = right
export const pulsePatternPool = {
  gentle: [
    [1, 2],           // left, right
    [2, 1],           // right, left
    [-1, 1],          // skip, left
    [2, -1],          // right, skip
    [1, -1],          // left, skip
    [-1, 2]           // skip, right
  ],
  building: [
    [0, 1],           // forward, left
    [0, 2],           // forward, right
    [1, 0],           // left, forward
    [2, 0],           // right, forward
    [0, -1],          // forward, skip
    [1, 2]            // left, right
  ],
  intense: [
    [0, 1, 2, 1],     // forward, left, right, left
    [0, 2, 1, 2],     // forward, right, left, right
    [1, 0, 2, 0],     // left, forward, right, forward
    [2, 0, 1, 0],     // right, forward, left, forward
    [1, 2, 0, 1],     // left, right, forward, left
    [2, 1, 0, 2]      // right, left, forward, right
  ]
};

// Map sections to pattern types
export const sectionPatternMap = {
  'INTRO': 'gentle',
  'BUILD': 'building',
  'MAIN': 'intense',
  'BREAK': 'gentle',
  'DROP': 'intense',
  'OUTRO': 'gentle'
};
