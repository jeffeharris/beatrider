Original prompt: Build an opt-in deterministic test mode for Beatrider.

- Branch: feature/deterministic-test-mode, isolated from the dirty audio spike.
- Target activation: `?testMode=1`; normal gameplay must remain unchanged.
- Required integration: `window.render_game_to_text` and deterministic `window.advanceTime(ms)`.
- Planned test-mode behavior: suppress real audio/analytics/service-worker side effects, control randomness and spawning, and expose concise gameplay state.
- Verification must use the develop-web-game Playwright client, inspect generated state/screenshots, and check console errors.

Implemented:
- Added query-gated runtime, seeded random source, fixed-step Phaser clock, and `render_game_to_text`.
- Test mode auto-starts without audio initialization, music scheduling, analytics, service worker registration, or persistent save writes.
- Added `window.BeatriderTest` scenario/resource/spawn controls and silent sound-effect adapters.
- Added unit coverage and a reusable basic gameplay action fixture.
- Browser state probe passed for movement + firing with no console errors.
- Test mode now selects the Canvas renderer so headless screenshots are inspectable.
- Two independent seeded enemy runs now produce byte-identical state snapshots.
- Shield collision and power-up collection scenarios passed; screenshots were inspected.
- The unflagged preview still follows the normal startup path. Its existing preview-only `/sw.js` 404 remains because the worker lives above `play/dist`.
- The deterministic clock now uses cohesive 10 ms simulation steps and carries
  partial requested time across `advanceTime()` calls.

TODO:
- None. Final unit tests, production build, diff check, deterministic replay,
  scenario state checks, screenshots, and flagged-mode console checks pass.
