/**
 * Kairos Staging — Full Page Walkthrough E2E Tests
 *
 * Logs in as each user role (Admin, Pastor, Leader, Member) and navigates
 * every sidebar page, capturing console errors and screenshots.
 *
 * Run: npx playwright test e2e/staging-walkthrough.spec.ts
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

// ─── Test Users ──────────────────────────────────────────────────────────────

const USERS = {
  Admin: { email: 'daniel@kairos.church', password: 'TestUserPassword123!' },
  Pastor: { email: 'grace.adeyemi@kairos.church', password: 'Pastor@Grace2026!' },
  Leader: { email: 'samuel.okonkwo@kairos.church', password: 'Leader@Samuel2026!' },
  Member: { email: 'esther.williams@kairos.church', password: 'Member@Esther2026!' },
} as const;

// ─── Sidebar Pages ───────────────────────────────────────────────────────────

const SIDEBAR_PAGES = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Members', href: '/members' },
  { label: 'Branches', href: '/branches' },
  { label: 'Departments', href: '/departments' },
  { label: 'Fellowships', href: '/fellowships' },
  { label: 'Attendance', href: '/attendance' },
  { label: 'Outreach', href: '/outreach' },
  { label: 'Donations', href: '/donations' },
  { label: 'Forms', href: '/forms' },
  { label: 'Reports', href: '/reports' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Wait for the login form to hydrate
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });

  // If already authenticated (mock mode), the page may auto-redirect
  if (page.url().includes('/dashboard')) return;

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or error message
  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 45_000 }),
    page.waitForSelector('[role="alert"]:not(:empty)', { timeout: 45_000 }).catch(() => {}),
  ]);

  // If still on login, check for error
  if (page.url().includes('/login')) {
    const errorEl = await page.$('[role="alert"]');
    const errorText = errorEl ? await errorEl.textContent() : 'Unknown login error';
    throw new Error(`Login failed for ${email}: ${errorText}`);
  }
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      errors.push(`[console.error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

for (const [role, creds] of Object.entries(USERS)) {
  test.describe(`${role} role walkthrough`, () => {
    let consoleErrors: string[];

    test.beforeEach(async ({ page }) => {
      consoleErrors = collectConsoleErrors(page);
    });

    test(`login as ${role}`, async ({ page }) => {
      await login(page, creds.email, creds.password);
      await expect(page).toHaveURL(/\/dashboard/);
      await page.screenshot({ path: `screenshots/e2e-results/${role}-login-success.png` });
    });

    for (const navPage of SIDEBAR_PAGES) {
      test(`${role} → ${navPage.label} (${navPage.href})`, async ({ page }) => {
        // Login first
        await login(page, creds.email, creds.password);

        // Navigate to the page
        await page.goto(navPage.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });

        // Wait for content to render
        await page.waitForTimeout(2000);

        // Screenshot
        await page.screenshot({
          path: `screenshots/e2e-results/${role}-${navPage.label.toLowerCase()}.png`,
          fullPage: true,
        });

        // Check for crash indicators
        const bodyText = await page.textContent('body');
        const hasCrash = bodyText?.includes('Application error') ||
          bodyText?.includes('Internal Server Error') ||
          bodyText?.includes('Unhandled Runtime Error');

        if (hasCrash) {
          console.error(`🔴 CRASH on ${navPage.href} as ${role}: page shows error`);
        }

        // Check for "Failed to load" error messages
        const hasLoadError = bodyText?.includes('Failed to load');
        if (hasLoadError) {
          console.warn(`⚠️ Load error on ${navPage.href} as ${role}`);
        }

        // Report console errors
        if (consoleErrors.length > 0) {
          console.warn(`⚠️ Console errors on ${navPage.href} as ${role}:`);
          consoleErrors.forEach((e) => console.warn(`  ${e}`));
        }

        // Assertions
        expect(hasCrash, `Page ${navPage.href} crashed for ${role}`).toBeFalsy();

        // Verify we're not redirected to login (auth failure)
        const url = page.url();
        expect(url).not.toContain('/login');
      });
    }

    test(`${role} — console error summary`, async ({ page }) => {
      await login(page, creds.email, creds.password);

      const allErrors: Array<{ page: string; errors: string[] }> = [];

      for (const navPage of SIDEBAR_PAGES) {
        const pageErrors: string[] = [];
        page.on('console', (msg: ConsoleMessage) => {
          if (msg.type() === 'error') pageErrors.push(msg.text());
        });

        await page.goto(navPage.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(2000);

        if (pageErrors.length > 0) {
          allErrors.push({ page: navPage.href, errors: [...pageErrors] });
        }
      }

      // Log summary
      if (allErrors.length > 0) {
        console.log(`\n📋 ${role} Console Error Summary:`);
        allErrors.forEach(({ page: p, errors }) => {
          console.log(`  ${p}: ${errors.length} error(s)`);
          errors.forEach((e) => console.log(`    - ${e.substring(0, 200)}`));
        });
      } else {
        console.log(`\n✅ ${role}: No console errors across all pages`);
      }

      // This test always passes — it's for reporting
      expect(true).toBe(true);
    });
  });
}
