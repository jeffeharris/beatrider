# Technology Stack

## Core Technologies
- **Game Engine**: Phaser.js v3 - 2D game framework
- **Audio Engine**: Tone.js - Web Audio API framework for procedural music generation
- **Language**: Vanilla JavaScript (ES6+)
- **Markup**: HTML5 with semantic structure
- **Styling**: CSS3 with custom properties and responsive design
- **PWA**: Progressive Web App with service worker and manifest

## Architecture
- **Single-file application**: Everything contained in `index.html`
- **No build process**: Pure HTML/JS, no compilation needed
- **CDN dependencies**: External libraries loaded via CDN
- **Static deployment**: Can run on any web server

## Key Libraries
```html
<!-- Audio synthesis and music generation -->
<script src="https://cdn.jsdelivr.net/npm/tone@latest/build/Tone.min.js"></script>
<!-- Audio context unmuting for mobile -->
<script src="https://unpkg.com/@tonejs/unmute@latest/build/unmute.min.js"></script>
<!-- Game framework -->
<script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
```

## Development Commands
```bash
# Start local development server
python3 serve.py
# or alternative methods:
python -m http.server 5174
npx http-server -p 5174

# Access at: http://127.0.0.1:5174
```

## Deployment
- Static file hosting (GitHub Pages, Netlify, Vercel)
- No server-side processing required
- Service worker provides offline functionality
- PWA installable on mobile devices

## Browser Requirements
- Modern browser with Web Audio API support
- ES6+ JavaScript support
- Canvas/WebGL for Phaser.js rendering