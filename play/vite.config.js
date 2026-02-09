import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/play/',
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
