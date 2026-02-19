import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@kairos/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@kairos/database': path.resolve(__dirname, '../../packages/database/src/index.ts'),
      '@kairos/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    root: __dirname,
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
