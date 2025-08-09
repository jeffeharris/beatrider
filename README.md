# Beatrider

A retro arcade lane shooter with procedurally generated melodic techno soundtrack. Navigate through 5 lanes, dodge obstacles, and blast enemies while the game responds to the beat of the music.

## Features

- **Procedural Music**: Real-time melodic techno generation using Tone.js
- **Beat-Synchronized Gameplay**: Enemies and obstacles spawn on the beat
- **Retro Aesthetics**: Perspective grid, neon colors, and arcade-style visuals
- **Multiple Laser Sounds**: Choose from 6 different synthesized laser effects
- **Dynamic Difficulty**: Game speed increases as you progress

## How to Play

### Controls
- **Arrow Keys / A/D**: Move between lanes
- **Space**: Fire lasers
- **Settings Button**: Toggle music controls and game options

### Gameplay
- Stay in your lane to avoid collisions
- Purple obstacles must be dodged (can't be destroyed)
- Red enemies can be destroyed with your lasers
- Green power-ups give you rapid fire mode
- The game gets progressively harder as beats accumulate

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
- **Grid**: Toggle perspective grid on/off
- **Calibration**: Adjust audio/visual sync timing
- **Laser Sound**: Choose from 6 different sound effects

## Credits

Built with:
- [Phaser.js](https://phaser.io/) - Game framework
- [Tone.js](https://tonejs.github.io/) - Web audio framework