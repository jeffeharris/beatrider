# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beatrider is a single-file retro lane-based shooter game with procedurally generated melodic techno. Everything runs from `index.html` - no build process, no package management, just edit and refresh.

## Development Commands

- **Run locally**: `python serve.py [port]` (defaults to 5174) or any static server
- **Deploy**: Push to GitHub Pages - immediate deployment as static HTML
- **Test PWA**: Update `CACHE_NAME` in `sw.js` to force service worker refresh

## Architecture

### Core Game Loop
The game uses two Phaser scenes:
- `StartupScene`: Handles start screen and player initialization
- `Main`: Core gameplay with all game logic

### Music → Game Communication Pattern
Tone.js music engine drives gameplay via `window.GameAPI`:
```javascript
window.GameAPI = {
  onBeat: () => {},    // Kick drum → spawn regular enemies
  onSnare: () => {},   // Snare → spawn fast enemies  
  onHihat: () => {},   // Hi-hat → spawn obstacles (20% chance)
  onAcid: () => {},    // Acid bass → spawn power-ups (10% chance)
  onStab: () => {},    // Synth stab → spawn drifting enemies
  onSub: () => {},     // Sub bass → grid pulse effects
  toggleGrid: () => {} // UI toggle for perspective grid
}
```

### Music Engine Structure
- **Instruments**: Kick, snare, hi-hat, acid (dual-filter 303), rave stabs, sub bass
- **Pattern Bank**: Detroit, Berlin, Chicago variations for each instrument
- **Sections**: INTRO (0-8), BUILD (8-16), MAIN (16-32), BREAK (32-40), DROP (40-56), OUTRO (56-64)
- **Dynamic Parameters**: BPM (120-150), Energy (0-100), Tension (0-100)
- **Chord Progressions**: 4 variations cycling based on section

### Game Systems

**Perspective Rendering**
- 5 lanes with exponential distance curve: `y = vanishY + (HEIGHT - vanishY) * Math.pow(progress, 2.5)`
- Off-screen rubber-band mechanics with 800ms grace period
- Lane X calculation accounts for perspective convergence

**Collision & Movement**
- AABB collision disabled during 150ms lane transitions
- Double-tap dash mechanics (250ms window)
- Jump/crouch system with charge mechanic for super jumps
- Arc shots when firing while jumping

**Difficulty Scaling**
- Base speed increases with beat count
- Enemy spawn rates tied to music energy/tension
- Difficulty presets: Zen (0.5x), Normal (1x), Intense (1.5x), Chaos (2x)

**Mobile Adaptations**
- Touch controls: swipe for movement, tap to fire
- Scaled UI elements (1.5x in portrait, 1.2x in landscape)
- Adjusted enemy speeds and larger hit targets
- Settings panel with opacity transitions on hover/touch

## Key Implementation Details

- CDN dependencies: Phaser.js v3, Tone.js, unmute.js (iOS audio unlock)
- LocalStorage for highscore and grid preference persistence
- Service worker for offline PWA functionality with cache versioning
- 6 synthesized laser sound variants using Tone.js
- Combo system: 2-second window, up to 8x multiplier, colored meter
- Scoring: Red enemies 10pts, Yellow 25pts, Purple drifters 50pts
- 3-layer starfield parallax with twinkle effects
- Trail effects for all moving objects (color-coded by type)
- Arc shots when firing while jumping (can go over obstacles)
- Jello physics: idle wobble animations with reactive forces
- Track muting: Click squares to mute individual instruments
- Enemy pulsing: Visual pulse on corresponding drum hits
- Classic acid patterns: Phuture, Josh Wink, Hardfloor styles

## Controls

**Desktop**
- Arrow keys / A/D: Lane movement
- W / Up: Jump
- S / Down: Charge super jump
- Space: Fire
- G: Toggle grid
- 1-6: Switch laser sounds

**Mobile**
- Swipe left/right: Move lanes
- Double-swipe left/right: Dash move (300ms window)
- Swipe up: Jump
- Swipe down then up: Super jump (power based on swipe distance)
- Tap: Fire
- Hold: Auto-fire
- Settings button: Access controls