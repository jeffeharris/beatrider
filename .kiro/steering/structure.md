# Project Structure

## Root Files
```
├── index.html          # Main application (single-file architecture)
├── manifest.json       # PWA manifest for installability
├── sw.js              # Service worker for offline functionality
├── serve.py           # Development server script
├── README.md          # Project documentation
└── .gitignore         # Git exclusions
```

## Assets
```
├── icon.svg           # Vector icon source
├── icon-192.png       # PWA icon (192x192)
├── icon-512.png       # PWA icon (512x512)
```

## Configuration Files
```
├── .kiro/             # Kiro AI assistant configuration
│   └── steering/      # AI guidance documents
└── .claude/           # Claude AI settings
    └── settings.local.json
```

## Code Organization (within index.html)

### HTML Structure
- Semantic markup with game container
- Minimized music controls UI
- Expandable settings panel
- PWA meta tags and manifest linking

### CSS Architecture
- Mobile-first responsive design
- Retro aesthetic (neon green on black)
- CSS custom properties for theming
- Backdrop filters and transitions
- Media queries for different screen sizes

### JavaScript Modules (inline)
1. **Audio Engine Setup**
   - Tone.js instrument configuration
   - Master chain with sidechain compression
   - Synthesizer definitions (kick, snare, hihat, acid, stab, sub)

2. **Music Generation**
   - Chord progressions and scale definitions
   - Pattern banks for different instruments
   - Procedural sequence generation
   - Section-based arrangement (INTRO/BUILD/MAIN/BREAK/DROP/OUTRO)

3. **Game Integration**
   - Beat synchronization callbacks
   - Visual feedback systems
   - Settings persistence

4. **UI Controllers**
   - Music control interface
   - Settings panel management
   - Mobile touch handling

## Development Patterns
- **Single-file architecture**: All code in index.html for simplicity
- **Modular JavaScript**: Logical separation within script tags
- **Progressive enhancement**: Works without JavaScript for basic HTML
- **Mobile-first CSS**: Responsive design starting from mobile
- **Event-driven audio**: Music responds to game state changes