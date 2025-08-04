import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // ✅ Needed for resolving aliases

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ✅ This fixes the "@/..." path error
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:10000', // Your backend URL
    },
  },
});
