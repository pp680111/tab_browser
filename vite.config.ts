import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { alphaTab } from '@coderline/alphatab-vite';

export default defineConfig({
  plugins: [alphaTab(), react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
});
