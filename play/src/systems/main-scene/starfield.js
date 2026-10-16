import { gameState } from '../../config.js';
import { perspectiveCurve } from './perspective.js';

export function createStarfieldSystem() {
  if (this.starGraphics) {
    this.starGraphics.destroy();
  }

  this.stars = [[], [], []];

  const starColors = [0x666666, 0x999999, 0xbbbbbb];
  const starCounts = [100, 50, 25];
  const starSizes = [1, 1.5, 2];

  this.starGraphics = this.add.graphics();

  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < starCounts[layer]; i++) {
      this.stars[layer].push({
        baseX: Math.random() * gameState.WIDTH * 2 - gameState.WIDTH / 2,
        baseY: Math.random() * gameState.HEIGHT * 2 - gameState.HEIGHT,
        progress: Math.random(),
        speed: (layer + 1) * 0.3,
        size: starSizes[layer],
        color: starColors[layer],
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }
}

// Stars are a backdrop at infinity, so they are laid out in screen space and
// mapped into whatever the camera is looking at: they stream from the on-screen
// horizon, fill the view even when the zoomed camera looks past the world's
// edge, and keep a constant on-screen size. Unzoomed, the mapping is identity.
export function updateStarfieldSystem(dt) {
  if (!this.starGraphics) return;
  this.starGraphics.clear();

  const view = this.zoomView ?? { left: 0, top: 0, zoom: 1 };
  const vanishX = gameState.WIDTH / 2;
  const vanishY = ((this.vanishY ?? gameState.HEIGHT * 0.15) - view.top) * view.zoom;

  for (let layer = 0; layer < 3; layer++) {
    for (const star of this.stars[layer]) {
      star.progress += star.speed * (dt / 1000);

      if (star.progress > 1.2) {
        star.progress = 0;
        star.baseX = Math.random() * gameState.WIDTH * 2 - gameState.WIDTH / 2;
        star.baseY = Math.random() * gameState.HEIGHT * 2 - gameState.HEIGHT;
      }

      const curvedProgress = perspectiveCurve(star.progress);
      const y = vanishY + (star.baseY - vanishY) * curvedProgress;
      const x = vanishX + (star.baseX - vanishX) * curvedProgress;

      if (x < -50 || x > gameState.WIDTH + 50) continue;

      const size = star.size * (0.1 + star.progress * 1.5) / view.zoom;
      star.twinkle += dt * 0.003;
      const twinkleAlpha = 0.8 + Math.sin(star.twinkle) * 0.2;
      const distanceAlpha = Math.min(1, star.progress * 2);
      const alpha = twinkleAlpha * distanceAlpha * 0.85;

      this.starGraphics.fillStyle(star.color, alpha);
      this.starGraphics.fillCircle(view.left + x / view.zoom, view.top + y / view.zoom, size);
    }
  }
}
