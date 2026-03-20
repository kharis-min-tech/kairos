import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
