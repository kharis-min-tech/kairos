import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  fullyParallel: false,          // Run tests serially — they share a seeded database
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env['API_BASE_URL'] ?? 'http://localhost:3001',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },

  // Start the API server before running tests
  webServer: {
    command: 'DATABASE_URL=postgresql://kairos:kairos@localhost:5430/kairos npm run dev --filter=api',
    url: 'http://localhost:3001/health',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
