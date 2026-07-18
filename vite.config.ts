import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('/src/game/content.ts') || id.endsWith('/src/game/content-registry.ts') || id.endsWith('/src/game/deep-dive.ts') || id.endsWith('/src/game/dialogue.ts')) return 'game-content';
        },
      },
    },
  },
});
