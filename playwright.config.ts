import { defineConfig } from '@playwright/test';

/**
 * E2E test config for Kairos.
 *
 * Usage:
 *   Local (mock auth):  BASE_URL=http://localhost:3000 npx playwright test
 *   Staging:            BASE_URL=https://staging.khar.is npx playwright test
 *
 * Default: local dev server at http://localhost:3000
 * Note: Staging is behind Cloudflare bot protection which blocks headless browsers.
 *       For staging, use a real browser or disable Cloudflare challenge temporarily.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'on',
    trace: 'on-first-retry',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  outputDir: 'screenshots/e2e-results',
  /* Start local dev server if no BASE_URL is set */
  ...(process.env.BASE_URL ? {} : {
    webServer: {
      command: 'cd apps/web && npm run dev',
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: true,
    },
  }),
});
