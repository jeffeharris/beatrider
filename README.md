# Beatrider

A retro arcade lane shooter with procedurally generated melodic techno soundtrack. Navigate through 5 lanes, dodge obstacles, and blast enemies while the game responds to the beat of the music.

## Features

- **Procedural Music**: Real-time melodic techno generation with classic 303 acid patterns
- **Beat-Synchronized Gameplay**: Different enemy types spawn on specific drum hits (kick, snare, hi-hat)
- **Combo System**: Chain kills within 2 seconds for up to 8x score multiplier
- **Advanced Movement**: Double-tap dash, super jumps with charge mechanic, mid-air barrel rolls
- **Arc Shots**: Bullets fired while jumping follow ballistic trajectories and can clear obstacles
- **Off-Screen Mechanics**: 800ms grace period with rubber-band snap-back and distortion effects
- **Visual Effects**: 3-layer parallax starfield, color-coded enemy trails, jello physics animations
- **Music Presets**: 5 moods (Chill, Driving, Peak, Acid, Trance) with dynamic BPM/energy/tension
- **Track Muting**: Click instrument squares to mute individual tracks
- **Progressive Difficulty**: 4 presets (Zen, Normal, Intense, Chaos) affecting speed and spawn rates
- **PWA Support**: Installable with offline play via service worker caching

## How to Play

### Controls

**Desktop**
- **Arrow Keys / A/D**: Move between lanes
- **Double-tap Left/Right**: Dash move
- **W / Up**: Jump
- **S / Down (hold)**: Charge super jump
- **Space**: Fire lasers
- **G**: Toggle perspective grid
- **1-6**: Switch laser sounds

**Mobile**  
- **Swipe Left/Right**: Move lanes
- **Double-swipe**: Dash move
- **Diagonal swipe**: Dash in that direction
- **Swipe Up**: Jump
- **Swipe Down then Up**: Super jump
- **Tap**: Fire once
- **Hold**: Auto-fire

### Gameplay
- **Red Enemies** (10 pts): Spawn on kick drum, standard speed
- **Yellow Enemies** (25 pts): Spawn on snare, 1.5x speed
- **Purple Drifters** (50 pts): Spawn on synth stabs, change lanes
- **Purple Obstacles**: Cannot be destroyed, must jump or dodge
- **Green Power-ups**: 5 seconds of rapid fire mode
- **Combo System**: Kill enemies quickly to build multiplier (2-8x)
- **Off-Screen Play**: Move beyond lane boundaries with 800ms timer before snap-back

## Running Locally

### Quick Start
```bash
python3 serve.py
# or
python -m http.server 5174
# or
npx http-server -p 5174
```

Then open http://127.0.0.1:5174 in your browser.

### Requirements
- Modern web browser with Web Audio API support
- Python 3 (for the included server) or any static file server

## Deployment

This is a single-file HTML application that can be hosted on any static file server:
- GitHub Pages
- Netlify
- Vercel
- Any web server

## Technical Details

- **Game Engine**: Phaser.js v3
- **Audio Engine**: Tone.js
- **No Build Process**: Pure HTML/JS, no compilation needed
- **Responsive Design**: Adapts to different screen sizes

## Customization

The game settings can be adjusted in the settings panel:
- **Mood Presets**: Choose musical style (affects BPM, energy, tension)
- **Difficulty**: Zen (0.5x), Normal (1x), Intense (1.5x), Chaos (2x) speed
- **BPM**: 120-150 beats per minute
- **Energy**: Controls pattern density (0-100)
- **Tension**: Controls filter sweeps and risers (0-100)
- **Laser Sound**: 6 variants (Triangle, Acid, Chord, Echo, Pluck, Pew Pew)
- **Track Muting**: Click colored squares to mute individual instruments
- **Grid Toggle**: Perspective grid display (also keyboard 'G')

## Credits

Built with:
- [Phaser.js](https://phaser.io/) - Game framework
- [Tone.js](https://tonejs.github.io/) - Web audio framework