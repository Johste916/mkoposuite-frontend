// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Export a function so we can enable the analyzer only on demand
export default defineConfig(async () => {
  const analyze =
    process.env.ANALYZE === '1' ||
    process.env.npm_lifecycle_event === 'analyze';

  const rollupPlugins = [];

  if (analyze) {
    // Lazy-load to avoid build errors if the package isn't installed
    try {
      const { visualizer } = await import('rollup-plugin-visualizer');
      rollupPlugins.push(
        visualizer({
          filename: 'dist/stats.html',
          template: 'treemap',   // “sunburst” or “network” also nice
          gzipSize: true,
          brotliSize: true,
          open: false,
        })
      );
    } catch (e) {
      console.warn('⚠️  rollup-plugin-visualizer not installed, skipping analyzer:', e?.message);
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:10000',
      },
    },
    build: {
      // Only affects build output; dev server remains unchanged
      rollupOptions: {
        plugins: rollupPlugins,
      },
    },
  };
});
