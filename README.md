# BEATRIDER

Lane-based rhythm shooter with procedural techno. Built with AI, refactored by AI.

![Beatrider Gameplay](devlog/images/beatrider-gameplay.gif)

**Play:** https://thebeatrider.com/play/

**Devlog:** https://thebeatrider.com/devlog/

## What this was

8,360 lines in a single HTML file. No build process, no modules, no IDE navigation -- just Ctrl+F and vibes. Built in a week with Claude, shipped to GitHub Pages, and it worked. Read the origin story: [Arguing Software Into Existence](https://thebeatrider.com/devlog/arguing-software-into-existence.html)

## What this is now

12 ES modules, a Vite build, and npm packages. Same game, proper structure. Three AI agents decomposed the monolith in parallel -- one extracted the 5,000-line gameplay scene, one fixed the audio module exports, one built the new entry point. About an hour total. Read the refactoring story: [Refactoring the Monolith](https://thebeatrider.com/devlog/refactoring-the-monolith.html)

## Quick start

```bash
cd play
npm install
npm run dev
```

Or serve the original monolith with any static server: `python3 serve.py`

## Deterministic test mode

Open `/play/?testMode=1` to skip the startup gesture and run the game without
music, sound effects, analytics, service-worker registration, or persistent
save writes. Test mode uses a fixed-step clock and the Canvas renderer so
headless browser runs are repeatable and inspectable.

Optional query parameters:

- `seed=42` sets the random seed (default: `1337`).
- `scenario=empty|enemy|shield-hit|power-up` chooses the initial state.

Browser automation can call:

- `await window.advanceTime(milliseconds)` to advance only simulated game time.
- `window.render_game_to_text()` to read a compact JSON snapshot.
- `window.BeatriderTest.applyScenario(name)`, `.spawn(type, lane, progress)`, or
  `.setResources(values)` to arrange focused cases.

A reusable movement-and-fire choreography lives at
`play/test-actions/basic-gameplay.json`.

## Controls

**Desktop:** Arrow keys to move, Space to fire, W to jump

**Mobile:** Swipe to move, Tap to fire, Swipe up to jump

## Features

- Procedural melodic techno generated in real-time
- Enemies spawn to the beat -- different drums trigger different enemy types
- 5 lanes, combo system, power-ups
- Multiple genres: Detroit techno, Berlin minimal, Chicago acid, D&B, tropical
- Works offline (PWA)

## Tech

- [Phaser.js](https://phaser.io/) for the game engine
- [Tone.js](https://tonejs.github.io/) for audio synthesis
- [Vite](https://vite.dev/) for bundling
- Built and refactored with [Claude](https://claude.ai)

## License

MIT - See [LICENSE](LICENSE) file

---

*A vibe coding project*
