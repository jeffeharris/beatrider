import Phaser from 'phaser';
import StartupScene from './scenes/startup-scene.js';
import Main from './scenes/main-scene.js';
import { useCanvas, isMac, isSafariBrowser, isChrome } from './config.js';
import { setupMusicUI } from './audio/music-ui.js';

// ============================================
// ANALYTICS
// ============================================

// Helper function for safe GA event tracking
window.trackEvent = function(eventName, parameters) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, parameters);
  }
};

// Track session start
window.addEventListener('load', () => {
  window.trackEvent('session_start', {
    platform: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    screen_size: `${window.innerWidth}x${window.innerHeight}`,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  });
});

// Track control type (will be updated when controls are used)
window.controlType = 'unknown';

// Track time engagement automatically (GA4 does this but we can enhance it)
let engagementTime = 0;
setInterval(() => {
  if (document.hasFocus()) {
    engagementTime += 10;
    if (engagementTime === 60) {
      window.trackEvent('engagement_1min', {});
    } else if (engagementTime === 300) {
      window.trackEvent('engagement_5min', {});
    } else if (engagementTime === 600) {
      window.trackEvent('engagement_10min', {});
    }
  }
}, 10000);

// ============================================
// PHASER INITIALIZATION
// ============================================

// Log which renderer we're using
console.log('Platform:', isMac ? 'Mac' : 'Other', '| Browser:', isSafariBrowser ? 'Safari' : isChrome ? 'Chrome' : 'Other');
console.log('Renderer:', useCanvas ? 'Canvas (Mac optimization)' : 'WebGL/Auto');

// Initialize Phaser game with proper scale configuration
// Exposed on window so music-ui.js can access scene references
const game = window.game = new Phaser.Game({
  type: useCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'gameContainer',
  scene: [StartupScene, Main],

  render: {
    powerPreference: 'high-performance',
    antialias: false,
    pixelArt: false
  },

  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'gameContainer',
    width: window.visualViewport ? window.visualViewport.width : window.innerWidth,
    height: window.visualViewport ? window.visualViewport.height : window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});

// ============================================
// RESIZE HANDLERS
// ============================================

// Wait for game to be fully initialized before setting up resize handlers
setTimeout(() => {
  if (game && game.scale) {
    // Proper way to listen for Phaser resize events
    game.scale.on('resize', (gameSize) => {
      const mainScene = game.scene.getScene('Main');
      if (mainScene && mainScene.resize) {
        mainScene.resize(gameSize);
      }
    });

    // Window resize listener as backup
    window.addEventListener('resize', () => {
      if (game && game.scale) {
        game.scale.refresh();
      }
    });

    // Handle visual viewport changes (mobile browser UI showing/hiding)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (game && game.scale) {
          game.scale.refresh();
        }
      });
    }

    // Check orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (game && game.scale) {
          game.scale.refresh();
        }
      }, 100);
    });
  }
}, 500);

// ============================================
// MUSIC UI
// ============================================

setupMusicUI();

// ============================================
// SERVICE WORKER (PWA)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js')
      .then(registration => {
      })
      .catch(error => {
      });
  });
}
