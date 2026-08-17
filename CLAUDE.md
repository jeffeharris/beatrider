# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beatrider is a lane-based rhythm shooter (Phaser 3 + Tone.js) with procedurally generated electronic music. The playable game is a Vite app under `play/`. The root `index.html` is only a static marketing landing page for thebeatrider.com; the root `sw.js` / `manifest.json` provide PWA install/offline support on GitHub Pages.

## Development Commands

All game work happens in `play/`:

- `npm run dev` — Vite dev server
- `npm test` — `node --test tests/*.test.js` (pure unit tests, needs no node_modules)
- `npm run build` — web build with base `/play/` (deployed via GitHub Pages)
- `npm run build:native` — `CAP_BUILD=1 vite build` (base `./`, Google Analytics stripped; see `vite.config.js`)
- `npm run cap:sync` — native build + `cap sync`
- `npm run ios` / `npm run android` — native build, sync, and open the platform IDE

Root `python serve.py [port]` (default 5174) serves the static landing page/legacy files. To force a service-worker refresh for the PWA, bump `CACHE_NAME` in root `sw.js`.

`play/ios/App/App/public/` is `cap sync` output and is gitignored — never commit it.

## Architecture

### Layout

- `play/index.html` — game shell page (Vite root)
- `play/src/main.js` — entry point; boots Phaser with the two scenes
- `play/src/config.js` — device detection, mutable `gameState` (WIDTH/HEIGHT/LANE_W/PLAYER_Y...), gameplay constants, `PLAYER_CONFIG` (animation timings); re-exports the pure tuning data from `tuning.js`
- `play/src/tuning.js` — pure tuning data with no imports or browser globals (`MAIN_SCENE_TUNING` balancing constants, perspective constants, grid pulse patterns), so pure modules and `node --test` can import it without stubbing; device- or viewport-dependent values belong in `config.js` instead
- `play/src/storage.js` — versioned localStorage persistence (`beatrider_data`, migrations up to v4): high score, leaderboard, settings
- `play/src/scenes/` — `startup-scene.js` (`StartupScene`: start screen, audio unlock) and `main-scene.js` (`Main`: core gameplay)
- `play/src/systems/main-scene/` — ~40 modules holding the Main scene's logic (setup, update loops per entity type, movement/jump/dash, mobile controls, grid/fire, starfield, tutorial, game over, state slices)
- `play/src/systems/startup-scene/` — startup scene systems
- `play/src/audio/` — `music-engine.js` (procedural music), `music-ui.js` (settings panel, difficulty, genre/preset UI), `game-sounds.js` (synthesized SFX, 6 laser variants), `ios-unlock.js`, `latency-probe.js`
- `play/src/leaderboard/` — local leaderboard entries, formatting, genre attribution, store, view
- `play/src/native/bootstrap.js` + `play/ios/` — Capacitor native shell (config at `play/capacitor.config.json`, `webDir: dist`)
- `play/tests/` — `node:test` + `node:assert` unit tests for the pure state modules

### Music → Game Communication

`music-engine.js` drives gameplay through `window.GameAPI` (installed by `systems/main-scene/create-setup-gameapi.js`):

```javascript
window.GameAPI = {
  onBeat: () => {},    // Kick → spawn regular (red) enemy
  onSnare: () => {},   // Snare → spawn fast (yellow) enemy
  onHihat: () => {},   // Hi-hat → spawn obstacle (engine calls it on ~20% of hats)
  onAcid: () => {},    // Acid bass → spawn power-up (engine calls it on ~10% of notes)
  onStab: () => {},    // Synth stab → spawn drifting (purple) enemy
  onSub: () => {},     // Sub bass → grid pulse
  toggleGrid: () => {},// UI toggle for perspective grid
  reset: () => {}      // Restart the scene
}
```

### Music Engine

- Instruments: kick, snare, hi-hat, dual-filter 303 acid, rave stabs, sub bass (individually mutable via track squares)
- Genres (`GENRE_CONFIGS`): Techno/Acid (120–150 BPM), Drum & Bass (160–180), Tropical (100–115), Dubstep (138–145), Trance (135–145), each with its own pattern set
- Pattern bank includes Detroit/Berlin/Chicago kicks and classic acid lines (Phuture, Josh Wink, Hardfloor styles)
- 64-bar section cycle (`getSection`): INTRO 0–8, BUILD 8–16, MAIN 16–32, BREAK 32–40, DROP 40–56, OUTRO 56–64
- Dynamic `energyLevel` / `tensionLevel` parameters and section-based chord progressions

### Perspective Rendering

- 5 lanes converging on a vanishing point at `HEIGHT * 0.15`
- All projection math lives in `play/src/systems/main-scene/perspective.js`: `projectY(progress, vanishY, height)` (exponential curve, exponent 2.5), `unprojectY` (its inverse), `perspectiveCurve`, and `perspectiveScale` (sprite scale `0.1 + progress * 1.2`). Use these helpers instead of re-inlining the formulas; they are pure and unit-tested in `tests/perspective.test.js`. The underlying constants (`PERSPECTIVE_EXPONENT` etc.) live in `src/tuning.js` and are re-exported by `perspective.js`.
- Entities carry a normalized `progress` (0 = vanishing point, 1 = player row)

### Game Systems

- Collision: lane + progress window checks (e.g. enemies hit only at progress 0.94–0.97, so you can step behind them)
- Jump/crouch with charge mechanic for super jumps; arc shots when firing mid-jump pass over obstacles
- Dash via double-tap (desktop) or quick successive touch moves
- Resources: ammo (100) → shield (50) → rapid-fire overflow; power-ups refill in that order (`damage-state.js`)
- Scoring: red 10, yellow 25, purple drifters 50; combo up to 8x within a 2s kill window
- Difficulty presets (`music-ui.js`): zen 0.5x / normal 1x / intense 1.5x / chaos 2x speed, with separate fire-rate and spawn multipliers
- Difficulty also scales with beat count and an adaptive-assist state
- Starfield: 3-layer parallax with twinkle; grid pulses follow section-based patterns (`pulsePatternPool` in tuning.js, re-exported by config.js)
- Local leaderboard with genre attribution; storage migrations keep old saves working

### Testing Pattern

Game-logic decisions are extracted into pure modules (`damage-state.js`, `score-combo-state.js`, `jump-state.js`, `state-transitions.js`, `perspective.js`, leaderboard modules) tested under `node --test` with no browser or Phaser dependency. Tests that transitively touch `config.js` stub `navigator`/`window`/`localStorage` first (see `tests/damage-state.test.js`). Keep new logic testable the same way.

## Controls

**Desktop** (keys registered in `create-setup-world.js`)
- Arrow keys / A/D: lane movement (double-tap to dash)
- W / Up: jump
- S / Down: hold to charge super jump
- Space: fire
- G: toggle grid, C: switch character, ESC: pause
- 1–6: switch laser sound
- F2: debug HUD

**Mobile** (touch zones, `mobile-controls-*.js`)
- Drag left/right from touch point: move lanes (quick successive moves dash)
- Drag up: jump; drag down then release: super jump (power from pull distance)
- Touch and hold: fire continuously
- Settings button: difficulty, genre, music, and control options
