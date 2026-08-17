// Pure gameplay tuning data.
//
// This module is a deliberate LEAF: it imports nothing and touches no browser
// globals (no window/navigator/localStorage), so pure modules like
// systems/main-scene/perspective.js can import from it and still run under
// `node --test` without any stubbing. Anything that depends on device
// detection (isMobile), viewport size, or saved settings belongs in config.js
// instead — do not add such values here.

// ============================================
// PERSPECTIVE PROJECTION CONSTANTS
// ============================================

// Exponent of the distance curve: y grows as progress^2.5.
export const PERSPECTIVE_EXPONENT = 2.5;

// Sprite scale is PERSPECTIVE_SCALE_BASE at the vanishing point and grows by
// PERSPECTIVE_SCALE_RANGE per unit of progress (so 1.3 at progress 1).
export const PERSPECTIVE_SCALE_BASE = 0.1;
export const PERSPECTIVE_SCALE_RANGE = 1.2;

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

// ============================================
// MAIN SCENE TUNING
// ============================================

// Main scene tuning constants consolidated for easier balancing.
export const MAIN_SCENE_TUNING = {
  comboWindowMs: 2000,
  crouchMaxChargeMs: 1000,
  crouchReleaseGraceMs: 150,
  jump: {
    queuedSuperJumpDelayMs: 50,
    queuedCrouchScaleX: 1.4,
    queuedCrouchScaleY: 0.6,
    queuedCrouchDurationMs: 100,
    regular: {
      heightPx: 120,
      durationMs: 250,
      scaleX: 1.2,
      scaleY: 1.2,
      spinAngle: 360
    },
    super: {
      minHeightPx: 120,
      maxHeightPx: 360,
      tutorialCountThreshold: 0.3,
      launchSquashX: 1.6,
      launchSquashY: 0.3,
      launchStretchDurationMs: 150,
      launchWobbleVelocityBase: -20,
      stretchXBase: 0.6,
      stretchXFalloff: 0.3,
      stretchYBase: 1.3,
      stretchYGain: 0.8,
      jumpDurationBaseMs: 300,
      jumpDurationPerChargeMs: 200,
      flightWobbleCycles: 4,
      flightWobbleMax: 0.15,
      apexScaleX: 1.2,
      apexScaleY: 0.8,
      apexSettleDurationMs: 100,
      landingSquashX: 2,
      landingSquashY: 0.3,
      landingWobbleVelocityY: 15,
      bounceUpScaleX: 0.7,
      bounceUpScaleY: 1.5,
      bounceDownScaleX: 1.3,
      bounceDownScaleY: 0.7,
      bounceHeightPx: 20,
      bounceUpDurationMs: 100,
      bounceDownDurationMs: 80,
      settleDurationMs: 400,
      settleElasticParams: [0.2, 0.15],
      spinBaseAngle: 360,
      spinPerChargeAngle: 360,
      particles: {
        baseCount: 5,
        perChargeCount: 15,
        radiusPx: 4,
        baseSpeed: 100,
        perChargeSpeed: 250,
        activeThreshold: 0.3,
        highChargeThreshold: 0.7,
        lowColor: 0x00ffcc,
        highColor: 0xff00ff,
        shakeDurationMs: 200,
        shakeBaseIntensity: 0.008,
        shakePerChargeIntensity: 0.01
      }
    }
  },
  touch: {
    zoneRadiusPx: 100,
    defaultDeadZonePx: 30,
    jumpThresholdPx: 40,
    moveCooldownMs: 150,
    zoneRepeatDelayMs: 300,
    zoneRepeatRateMs: 150,
    dashFromMoveWindowMs: 250,
    recenterDelayMs: 150,
    edgePaddingRatio: 0.7
  },
  debug: {
    toggleKey: 'F2',
    hudUpdateMs: 120
  }
};
