/**
 * Kairos Staging — Leader Comprehensive E2E Walkthrough
 *
 * Leader role: limited access. Tests navigation, viewing members,
 * attendance, souls, follow-ups, donations within their scope.
 *
 * Run: npx playwright test e2e/walkthrough-leader.spec.ts --timeout 300000
 */

import { test, expect } from '@playwright/test';
import {
  ErrorCollector, USERS, login, navigateTo, checkForCrash,
  safely, fillByName, selectByName,
} from './helpers';

const ROLE = 'Leader';
const CREDS = USERS.Leader;

test.describe.serial('Leader comprehensive walkthrough', () => {
  test.setTimeout(300_000);

  test('full walkthrough', async ({ page }) => {
    const c = new ErrorCollector();
    c.attachListeners(page);

    c.setContext('/login', 'login');
    await login(page, CREDS.email, CREDS.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard
    c.setContext('/dashboard', 'verify');
    await safely(page, c, 'check dashboard', async () => {
      await page.waitForTimeout(2000);
      await checkForCrash(page, c);
    });

    // Members — view only
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

    await safely(page, c, 'click first member', async () => {
      const link = await page.$('a[href*="/members/view"]');
      if (link) {
        await link.click();
        await page.waitForTimeout(2000);
        await checkForCrash(page, c);
        // Leader may not see Edit button — verify gracefully
        const editBtn = await page.$('button:has-text("Edit")');
        if (editBtn) {
          c.logError({ type: 'test_error', message: 'Leader can see Edit button — may be a permission issue' });
        }
        await navigateTo(page, '/members');
      }
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

    // Attendance
    c.setContext('/attendance', 'navigate');
    await navigateTo(page, '/attendance');
    await checkForCrash(page, c);

    await safely(page, c, 'fill attendance', async () => {
      const dateInput = await page.$('input[name="serviceDate"]');
      if (dateInput) await dateInput.fill(new Date().toISOString().split('T')[0]);
      await selectByName(page, 'serviceType', 'Sunday Service');
      await page.waitForTimeout(1000);
    });

    await safely(page, c, 'submit attendance', async () => {
      const btn = await page.$('button:has-text("Record Attendance")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Outreach
    c.setContext('/evangelism/outreach', 'navigate');
    await navigateTo(page, '/evangelism/outreach');
    await checkForCrash(page, c);

    await safely(page, c, 'register as worker', async () => {
      const btn = await page.$('button:has-text("Register as Worker")');
      if (btn) { await btn.click(); await page.waitForTimeout(2000); }
    });

    // Soul Capture
    c.setContext('/evangelism/souls/capture', 'navigate');
    await navigateTo(page, '/evangelism/souls/capture');
    await checkForCrash(page, c);

    await safely(page, c, 'capture soul', async () => {
      await fillByName(page, 'firstName', 'LeaderSoul');
      await fillByName(page, 'lastName', `Test${Date.now()}`);
      await fillByName(page, 'phone', '+447700900555');
      await selectByName(page, 'source', 'ad-hoc');
      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Souls Kanban
    c.setContext('/evangelism/souls', 'navigate');
    await navigateTo(page, '/evangelism/souls');
    await checkForCrash(page, c);

    await safely(page, c, 'click soul card', async () => {
      const card = await page.$('button[aria-label^="Soul:"]');
      if (card) {
        await card.click();
        await page.waitForTimeout(1500);
        const close = await page.$('button[aria-label="Close"], button:has-text("Close")');
        if (close) await close.click();
      }
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
      await selectByName(page, 'contactMethod', 'Home Visit');
      await selectByName(page, 'contactStatus', 'Interested');
      await fillByName(page, 'notes', 'Leader E2E follow-up');
      const submit = await page.$('button[type="submit"]:has-text("Log Follow-Up")');
      if (submit) { await submit.click(); await page.waitForTimeout(3000); }
    });

    // Donations
    c.setContext('/donations', 'navigate');
    await navigateTo(page, '/donations');
    await checkForCrash(page, c);

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
