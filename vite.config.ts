import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/animath/',
  plugins: [react()],
  resolve: {
    alias: {
      '/animath': new URL('.', import.meta.url).pathname,
    },
  },
});
