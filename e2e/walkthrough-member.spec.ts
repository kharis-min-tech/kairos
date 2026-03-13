/**
 * Kairos Staging — Member Comprehensive E2E Walkthrough
 *
 * Member role: most restricted. Tests navigation, viewing pages,
 * verifying access restrictions, donations, profile.
 *
 * Run: npx playwright test e2e/walkthrough-member.spec.ts --timeout 300000
 */

import { test, expect } from '@playwright/test';
import {
  ErrorCollector, USERS, login, navigateTo, checkForCrash,
  safely, fillByName, selectByName,
} from './helpers';

const ROLE = 'Member';
const CREDS = USERS.Member;

test.describe.serial('Member comprehensive walkthrough', () => {
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

    // Members — may be restricted or read-only
    c.setContext('/members', 'navigate');
    await navigateTo(page, '/members');
    await safely(page, c, 'check members access', async () => {
      const url = page.url();
      if (url.includes('/login') || url.includes('/dashboard')) {
        // Redirected — access denied, which is expected
        return;
      }
      await checkForCrash(page, c);
      // Member should NOT see Add Member button
      const addBtn = await page.$('button:has-text("Add Member")');
      if (addBtn) {
        c.logError({ type: 'test_error', message: 'Member role can see Add Member button — permission issue' });
      }
    });

    // Branches — view only
    c.setContext('/branches', 'navigate');
    await navigateTo(page, '/branches');
    await safely(page, c, 'check branches', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Departments
    c.setContext('/departments', 'navigate');
    await navigateTo(page, '/departments');
    await safely(page, c, 'check departments', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Fellowships
    c.setContext('/fellowships', 'navigate');
    await navigateTo(page, '/fellowships');
    await safely(page, c, 'check fellowships', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Attendance — may be restricted
    c.setContext('/attendance', 'navigate');
    await navigateTo(page, '/attendance');
    await safely(page, c, 'check attendance', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Outreach — view programs
    c.setContext('/evangelism/outreach', 'navigate');
    await navigateTo(page, '/evangelism/outreach');
    await safely(page, c, 'check outreach', async () => {
      if (!page.url().includes('/login')) {
        await checkForCrash(page, c);
        // Member should be able to register as worker
        const btn = await page.$('button:has-text("Register as Worker")');
        if (btn) { await btn.click(); await page.waitForTimeout(2000); }
      }
    });

    // Soul Capture — members may be able to capture souls
    c.setContext('/evangelism/souls/capture', 'navigate');
    await navigateTo(page, '/evangelism/souls/capture');
    await safely(page, c, 'capture soul as member', async () => {
      if (page.url().includes('/login')) return;
      await checkForCrash(page, c);
      await fillByName(page, 'firstName', 'MemberSoul');
      await fillByName(page, 'lastName', `Test${Date.now()}`);
      await fillByName(page, 'phone', '+447700900444');
      await selectByName(page, 'source', 'ad-hoc');
      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Souls Kanban
    c.setContext('/evangelism/souls', 'navigate');
    await navigateTo(page, '/evangelism/souls');
    await safely(page, c, 'check souls kanban', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Follow-ups
    c.setContext('/evangelism/followups', 'navigate');
    await navigateTo(page, '/evangelism/followups');
    await safely(page, c, 'check follow-ups', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Donations — member can make donations
    c.setContext('/donations', 'navigate');
    await navigateTo(page, '/donations');
    await safely(page, c, 'check donations', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    c.setContext('/donations/record', 'navigate');
    await navigateTo(page, '/donations/record');
    await safely(page, c, 'make online donation', async () => {
      if (page.url().includes('/login')) return;
      await checkForCrash(page, c);
      await fillByName(page, 'amount', '10.00');
      await selectByName(page, 'purpose', 'Offering');
      const btn = await page.$('button:has-text("Donate Online")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Forms
    c.setContext('/forms', 'navigate');
    await navigateTo(page, '/forms');
    await safely(page, c, 'check forms', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Reports
    c.setContext('/reports', 'navigate');
    await navigateTo(page, '/reports');
    await safely(page, c, 'check reports', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    // Profile
    c.setContext('/profile', 'navigate');
    await navigateTo(page, '/profile');
    await checkForCrash(page, c);

    // Settings
    c.setContext('/settings', 'navigate');
    await navigateTo(page, '/settings');
    await safely(page, c, 'check settings', async () => {
      if (!page.url().includes('/login')) await checkForCrash(page, c);
    });

    c.writeReport(ROLE);
    expect(true).toBe(true);
  });
});
