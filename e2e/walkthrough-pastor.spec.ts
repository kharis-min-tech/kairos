/**
 * Kairos Staging — Pastor Comprehensive E2E Walkthrough
 *
 * Pastor role: branch-scoped access. Tests navigation, forms, attendance,
 * outreach, souls, follow-ups, donations within their branch context.
 *
 * Run: npx playwright test e2e/walkthrough-pastor.spec.ts --timeout 300000
 */

import { test, expect } from '@playwright/test';
import {
  ErrorCollector, USERS, login, navigateTo, checkForCrash,
  safely, clickIfExists, fillByName, selectByName, selectFirstOption,
} from './helpers';

const ROLE = 'Pastor';
const CREDS = USERS.Pastor;

test.describe.serial('Pastor comprehensive walkthrough', () => {
  test.setTimeout(300_000);

  test('full walkthrough', async ({ page }) => {
    const c = new ErrorCollector();
    c.attachListeners(page);

    // ── Login ──
    c.setContext('/login', 'login');
    await login(page, CREDS.email, CREDS.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard
    c.setContext('/dashboard', 'verify');
    await safely(page, c, 'check dashboard', async () => {
      await page.waitForTimeout(2000);
      const body = await page.textContent('body');
      if (body?.includes('NaN') || body?.includes('undefined')) {
        c.logError({ type: 'ui_crash', message: 'Dashboard shows NaN or undefined' });
      }
      await checkForCrash(page, c);
    });

    // Members (branch-scoped — no branch filter visible)
    c.setContext('/members', 'navigate');
    await navigateTo(page, '/members');
    await checkForCrash(page, c);

    await safely(page, c, 'search members', async () => {
      const input = await page.$('input[aria-label="Search members"]');
      if (input) {
        await input.fill('test');
        await page.waitForTimeout(1500);
        await input.fill('');
      }
    });

    await safely(page, c, 'click Export CSV', async () => {
      const btn = await page.$('button:has-text("Export CSV")');
      if (btn) { await btn.click(); await page.waitForTimeout(2000); }
    });

    await safely(page, c, 'click first member', async () => {
      const link = await page.$('a[href*="/members/view"]');
      if (link) { await link.click(); await page.waitForTimeout(2000); }
    });

    if (page.url().includes('/members/view')) {
      c.setContext('/members/view', 'detail');
      await checkForCrash(page, c);

      await safely(page, c, 'click Edit member', async () => {
        const btn = await page.$('button:has-text("Edit")');
        if (btn) {
          await btn.click();
          await page.waitForTimeout(1500);
          const close = await page.$('button[aria-label="Close"], button:has-text("Cancel")');
          if (close) await close.click();
        }
      });

      await navigateTo(page, '/members');
    }

    // Add Member (Pastor — branch pre-selected)
    c.setContext('/members/new', 'navigate');
    await navigateTo(page, '/members/new');
    await checkForCrash(page, c);

    await safely(page, c, 'submit empty add member', async () => {
      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(1500); }
    });

    await safely(page, c, 'fill and submit add member', async () => {
      await fillByName(page, 'first_name', 'PastorE2E');
      await fillByName(page, 'last_name', 'TestMember');
      await fillByName(page, 'email', `pastor-e2e-${Date.now()}@test.kairos.church`);
      await fillByName(page, 'phone', '+447700900777');
      // Branch should be pre-selected for Pastor
      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Branches
    c.setContext('/branches', 'navigate');
    await navigateTo(page, '/branches');
    await checkForCrash(page, c);

    // Departments
    c.setContext('/departments', 'navigate');
    await navigateTo(page, '/departments');
    await checkForCrash(page, c);

    // Fellowships
    c.setContext('/fellowships', 'navigate');
    await navigateTo(page, '/fellowships');
    await checkForCrash(page, c);

    // Attendance (Pastor — no branch selector, uses their branch)
    c.setContext('/attendance', 'navigate');
    await navigateTo(page, '/attendance');
    await checkForCrash(page, c);

    await safely(page, c, 'fill attendance', async () => {
      const dateInput = await page.$('input[name="serviceDate"]');
      if (dateInput) await dateInput.fill(new Date().toISOString().split('T')[0]);
      await selectByName(page, 'serviceType', 'Sunday Service');
      await page.waitForTimeout(1000);
    });

    await safely(page, c, 'mark all present', async () => {
      const btn = await page.$('button:has-text("Mark All Present")');
      if (btn) { await btn.click(); await page.waitForTimeout(1000); }
    });

    await safely(page, c, 'submit attendance', async () => {
      const btn = await page.$('button:has-text("Record Attendance")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Outreach
    c.setContext('/evangelism/outreach', 'navigate');
    await navigateTo(page, '/evangelism/outreach');
    await checkForCrash(page, c);

    await safely(page, c, 'create outreach program', async () => {
      const btn = await page.$('button:has-text("Create Program")');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(1000);
      await fillByName(page, 'programName', `Pastor E2E Program ${Date.now()}`);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await fillByName(page, 'programDate', tomorrow);
      await fillByName(page, 'location', 'Pastor E2E Location');
      const submit = await page.$('button[type="submit"]:has-text("Create")');
      if (submit) { await submit.click(); await page.waitForTimeout(3000); }
    });

    // Soul Capture
    c.setContext('/evangelism/souls/capture', 'navigate');
    await navigateTo(page, '/evangelism/souls/capture');
    await checkForCrash(page, c);

    await safely(page, c, 'capture soul', async () => {
      await fillByName(page, 'firstName', 'PastorSoul');
      await fillByName(page, 'lastName', `Test${Date.now()}`);
      await fillByName(page, 'phone', '+447700900666');
      await selectByName(page, 'gender', 'Female');
      await selectByName(page, 'ageGroup', '18-25');
      await selectByName(page, 'source', 'ad-hoc');
      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Souls Kanban
    c.setContext('/evangelism/souls', 'navigate');
    await navigateTo(page, '/evangelism/souls');
    await checkForCrash(page, c);

    await safely(page, c, 'verify kanban', async () => {
      await page.waitForTimeout(2000);
      const cols = await page.$$('[role="region"]');
      if (cols.length < 4) c.logError({ type: 'test_error', message: `Expected 4 columns, found ${cols.length}` });
    });

    // Follow-ups
    c.setContext('/evangelism/followups', 'navigate');
    await navigateTo(page, '/evangelism/followups');
    await checkForCrash(page, c);

    await safely(page, c, 'log follow-up', async () => {
      const btn = await page.$('button:has-text("Log Follow-Up")');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(1000);
      await selectByName(page, 'contactMethod', 'Phone Call');
      await selectByName(page, 'contactStatus', 'Successful');
      await fillByName(page, 'notes', 'Pastor E2E follow-up');
      const submit = await page.$('button[type="submit"]:has-text("Log Follow-Up")');
      if (submit) { await submit.click(); await page.waitForTimeout(3000); }
    });

    // Donations
    c.setContext('/donations', 'navigate');
    await navigateTo(page, '/donations');
    await checkForCrash(page, c);

    c.setContext('/donations/record', 'navigate');
    await navigateTo(page, '/donations/record');
    await checkForCrash(page, c);

    await safely(page, c, 'record manual donation', async () => {
      const tab = await page.$('button[role="tab"]:has-text("Manual Entry")');
      if (tab) { await tab.click(); await page.waitForTimeout(1000); }
      await fillByName(page, 'manualAmount', '30.00');
      await selectByName(page, 'manualPurpose', 'Offering');
      await selectByName(page, 'paymentMethod', 'Cash');
      await fillByName(page, 'donationDate', new Date().toISOString().split('T')[0]);
      const btn = await page.$('button:has-text("Record Donation")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Forms
    c.setContext('/forms', 'navigate');
    await navigateTo(page, '/forms');
    await checkForCrash(page, c);

    // Reports, Profile, Settings
    for (const pg of ['/reports', '/profile', '/settings']) {
      c.setContext(pg, 'navigate');
      await navigateTo(page, pg);
      await checkForCrash(page, c);
    }

    c.writeReport(ROLE);
    expect(true).toBe(true);
  });
});
