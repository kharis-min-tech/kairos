import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Dynamic `await import('./service')` inside the first test of a describe
    // block routinely exceeds the 5s default on WSL2 cold imports.
    testTimeout: 15_000,
  },
});
