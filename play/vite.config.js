import { defineConfig } from 'vite';
import { resolve } from 'path';

// The native (Capacitor) WebView serves the bundle from the origin root —
// `capacitor://localhost/` on iOS, `https://localhost/` on Android — whereas
// GitHub Pages serves it under `/play/`. Everything that resolves an asset at
// runtime derives from `import.meta.env.BASE_URL` (see `samplePathFor` and the
// iOS unlock path), so flipping this one value is enough to retarget the build.
//
//   npm run build          -> web,   base '/play/'   (unchanged, deploys as today)
//   CAP_BUILD=1 npm run build -> native, base './'
const isNativeBuild = process.env.CAP_BUILD === '1';

/**
 * Strips the Google Analytics tag from the native build.
 *
 * Two reasons, both App Store: a remote script is a network dependency on cold
 * start in an app that is otherwise fully offline, and shipping no third-party
 * analytics at all is what lets the listing declare "Data Not Collected" — the
 * cleanest privacy label available, and worth more on a paid game than the
 * pageview numbers are. The web build is untouched.
 */
function stripAnalyticsForNative() {
  return {
    name: 'strip-analytics-for-native',
    apply: 'build',
    transformIndexHtml(html) {
      if (!isNativeBuild) return html;
      return html
        .replace(/\s*<!-- Google Analytics -->/, '')
        .replace(/\s*<script[^>]*googletagmanager\.com[^>]*><\/script>/g, '')
        .replace(/\s*<script>\s*window\.dataLayer[\s\S]*?<\/script>/g, '');
    },
  };
}

export default defineConfig({
  plugins: [stripAnalyticsForNative()],
  root: '.',
  base: isNativeBuild ? './' : '/play/',
  define: {
    // Build-time constant so the PWA service-worker registration is dead-code
    // eliminated from the native bundle rather than merely skipped at runtime.
    __NATIVE_BUILD__: JSON.stringify(isNativeBuild),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/phaser/')) return 'vendor-phaser';
          if (id.includes('/tone/')) return 'vendor-tone';
          return 'vendor';
        }
      },
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 5174,
    open: true,
    allowedHosts: ['homehub']
  }
});
