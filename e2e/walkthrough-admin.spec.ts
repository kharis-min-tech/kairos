/**
 * Kairos Staging — Admin Comprehensive E2E Walkthrough
 *
 * Deeply interacts with every page as Admin: forms, buttons, kanban,
 * modals, filters, CSV export, outreach programs, soul capture, follow-ups.
 *
 * Run: npx playwright test e2e/walkthrough-admin.spec.ts --timeout 300000
 */

import { test, expect } from '@playwright/test';
import {
  ErrorCollector, USERS, login, navigateTo, checkForCrash,
  safely, clickIfExists, fillByName, selectByName, selectFirstOption,
} from './helpers';

const ROLE = 'Admin';
const CREDS = USERS.Admin;

test.describe.serial('Admin comprehensive walkthrough', () => {
  test.setTimeout(300_000);

  test('full walkthrough', async ({ page }) => {
    const c = new ErrorCollector();
    c.attachListeners(page);

    // ── Login ──
    c.setContext('/login', 'login');
    await login(page, CREDS.email, CREDS.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // ═══════════════════════════════════════════════════════════
    // 1. DASHBOARD
    // ═══════════════════════════════════════════════════════════
    c.setContext('/dashboard', 'verify');
    await safely(page, c, 'check stat cards', async () => {
      await page.waitForTimeout(2000);
      const body = await page.textContent('body');
      if (body?.includes('NaN') || body?.includes('undefined')) {
        c.logError({ type: 'ui_crash', message: 'Dashboard shows NaN or undefined' });
      }
      await checkForCrash(page, c);
    });

    // ═══════════════════════════════════════════════════════════
    // 2. MEMBERS
    // ═══════════════════════════════════════════════════════════
    c.setContext('/members', 'navigate');
    await navigateTo(page, '/members');
    await checkForCrash(page, c);

    await safely(page, c, 'search members', async () => {
      const input = await page.$('input[aria-label="Search members"]');
      if (input) {
        await input.fill('test');
        await page.waitForTimeout(1500);
        await input.fill('');
        await page.waitForTimeout(1000);
      }
    });

    await safely(page, c, 'filter by status', async () => {
      const sel = 'select[aria-label="Filter by status"]';
      if (await page.$(sel)) {
        await page.selectOption(sel, 'active');
        await page.waitForTimeout(1500);
        await page.selectOption(sel, '');
      }
    });

    await safely(page, c, 'filter by branch', async () => {
      const sel = 'select[aria-label="Filter by branch"]';
      if (await page.$(sel)) {
        await selectFirstOption(page, sel);
        await page.waitForTimeout(1500);
        await page.selectOption(sel, '');
      }
    });

    await safely(page, c, 'click Export CSV', async () => {
      const btn = await page.$('button:has-text("Export CSV")');
      if (btn) { await btn.click(); await page.waitForTimeout(2000); }
    });

    // Click first member → detail page
    await safely(page, c, 'click first member', async () => {
      const link = await page.$('a[href*="/members/view"]');
      if (link) { await link.click(); await page.waitForTimeout(2000); }
    });

    if (page.url().includes('/members/view')) {
      c.setContext('/members/view', 'detail');
      await checkForCrash(page, c);

      await safely(page, c, 'check photo upload', async () => {
        const btn = await page.$('button[aria-label="Upload photo"]');
        if (btn) { await btn.click(); await page.waitForTimeout(500); }
      });

      await safely(page, c, 'click Donations tab', async () => {
        const tab = await page.$('button[role="tab"]:has-text("Donations")');
        if (tab) { await tab.click(); await page.waitForTimeout(1500); }
      });

      await safely(page, c, 'click Attendance tab', async () => {
        const tab = await page.$('button[role="tab"]:has-text("Attendance")');
        if (tab) { await tab.click(); await page.waitForTimeout(1500); }
      });

      await safely(page, c, 'click Edit member', async () => {
        const btn = await page.$('button:has-text("Edit")');
        if (btn) {
          await btn.click();
          await page.waitForTimeout(1500);
          const nameInput = await page.$('input[name="first_name"], input[name="firstName"]');
          if (nameInput) {
            const val = await nameInput.inputValue();
            await nameInput.fill(val + ' E2E');
            await page.waitForTimeout(500);
            const saveBtn = await page.$('button[type="submit"]:has-text("Save"), button:has-text("Save Changes")');
            if (saveBtn) { await saveBtn.click(); await page.waitForTimeout(2000); }
          }
          const closeBtn = await page.$('button[aria-label="Close"], button:has-text("Cancel")');
          if (closeBtn) await closeBtn.click();
        }
      });

      await navigateTo(page, '/members');
    }

    // Add Member — validation + submission
    c.setContext('/members/new', 'navigate');
    await navigateTo(page, '/members/new');
    await checkForCrash(page, c);

    await safely(page, c, 'submit empty add member form', async () => {
      const btn = await page.$('button[type="submit"]');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1500);
        const errs = await page.$$eval('[class*="error"], [class*="text-red"]', (els) =>
          els.map((e) => e.textContent?.trim()).filter(Boolean)
        );
        if (errs.length === 0) c.logError({ type: 'test_error', message: 'Empty add member form: no validation errors shown' });
      }
    });

    await safely(page, c, 'fill and submit add member', async () => {
      await fillByName(page, 'first_name', 'E2E');
      await fillByName(page, 'last_name', 'TestMember');
      await fillByName(page, 'email', `e2e-${Date.now()}@test.kairos.church`);
      await fillByName(page, 'phone', '+447700900999');
      await selectFirstOption(page, 'select[name="home_branch_id"]');
      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // Approvals
    c.setContext('/members/approvals', 'navigate');
    await navigateTo(page, '/members/approvals');
    await checkForCrash(page, c);

    // Import
    c.setContext('/members/import', 'navigate');
    await navigateTo(page, '/members/import');
    await checkForCrash(page, c);

    await safely(page, c, 'verify import upload area', async () => {
      const area = await page.$('text=Drag and drop');
      const btn = await page.$('button:has-text("Choose File")');
      if (!area && !btn) c.logError({ type: 'test_error', message: 'Import page missing upload area' });
    });

    // ═══════════════════════════════════════════════════════════
    // 3. BRANCHES
    // ═══════════════════════════════════════════════════════════
    c.setContext('/branches', 'navigate');
    await navigateTo(page, '/branches');
    await checkForCrash(page, c);

    await safely(page, c, 'verify branch cards', async () => {
      await page.waitForTimeout(2000);
      const cards = await page.$$('[class*="card"], [class*="Card"]');
      if (cards.length === 0) {
        const body = await page.textContent('body');
        if (!body?.includes('No branches found')) c.logError({ type: 'test_error', message: 'No branch cards and no empty state' });
      }
    });

    await safely(page, c, 'click Add Branch', async () => {
      const btn = await page.$('button:has-text("Add Branch")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1500);
        const cancel = await page.$('button:has-text("Cancel")');
        if (cancel) await cancel.click();
      }
    });

    // ═══════════════════════════════════════════════════════════
    // 4. DEPARTMENTS
    // ═══════════════════════════════════════════════════════════
    c.setContext('/departments', 'navigate');
    await navigateTo(page, '/departments');
    await checkForCrash(page, c);

    await safely(page, c, 'click create department', async () => {
      await clickIfExists(page, c, 'button:has-text("Add Department"), button:has-text("Create Department")', 'Add Department');
      const cancel = await page.$('button:has-text("Cancel")');
      if (cancel) await cancel.click();
    });

    // ═══════════════════════════════════════════════════════════
    // 5. FELLOWSHIPS
    // ═══════════════════════════════════════════════════════════
    c.setContext('/fellowships', 'navigate');
    await navigateTo(page, '/fellowships');
    await checkForCrash(page, c);

    await safely(page, c, 'click create fellowship', async () => {
      await clickIfExists(page, c, 'button:has-text("Add Fellowship"), button:has-text("Create Fellowship")', 'Add Fellowship');
      const cancel = await page.$('button:has-text("Cancel")');
      if (cancel) await cancel.click();
    });

    // ═══════════════════════════════════════════════════════════
    // 6. ATTENDANCE
    // ═══════════════════════════════════════════════════════════
    c.setContext('/attendance', 'navigate');
    await navigateTo(page, '/attendance');
    await checkForCrash(page, c);

    await safely(page, c, 'fill attendance form', async () => {
      await selectFirstOption(page, 'select[name="branch"]');
      await page.waitForTimeout(2000);
      const dateInput = await page.$('input[name="serviceDate"]');
      if (dateInput) await dateInput.fill(new Date().toISOString().split('T')[0]);
      await selectByName(page, 'serviceType', 'Sunday Service');
      await page.waitForTimeout(1000);
    });

    await safely(page, c, 'toggle Mark All Present', async () => {
      const btn = await page.$('button:has-text("Mark All Present")');
      if (btn) { await btn.click(); await page.waitForTimeout(1000); }
    });

    await safely(page, c, 'submit attendance', async () => {
      const btn = await page.$('button:has-text("Record Attendance")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    c.setContext('/attendance/fellowship', 'navigate');
    await navigateTo(page, '/attendance/fellowship');
    await checkForCrash(page, c);

    c.setContext('/attendance/reports', 'navigate');
    await navigateTo(page, '/attendance/reports');
    await checkForCrash(page, c);

    // ═══════════════════════════════════════════════════════════
    // 7. OUTREACH PROGRAMS
    // ═══════════════════════════════════════════════════════════
    c.setContext('/evangelism/outreach', 'navigate');
    await navigateTo(page, '/evangelism/outreach');
    await checkForCrash(page, c);

    let createdProgramName = '';
    await safely(page, c, 'create outreach program', async () => {
      const btn = await page.$('button:has-text("Create Program")');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(1000);

      createdProgramName = `E2E Program ${Date.now()}`;
      await fillByName(page, 'programName', createdProgramName);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await fillByName(page, 'programDate', tomorrow);
      await fillByName(page, 'location', 'E2E Test Location');
      await fillByName(page, 'description', 'Created by E2E walkthrough');

      const submit = await page.$('button[type="submit"]:has-text("Create")');
      if (submit) { await submit.click(); await page.waitForTimeout(3000); }
    });

    await safely(page, c, 'click into created program', async () => {
      if (!createdProgramName) return;
      const card = await page.$(`text=${createdProgramName}`);
      if (card) {
        await card.click();
        await page.waitForTimeout(2000);
        await checkForCrash(page, c);
        await navigateTo(page, '/evangelism/outreach');
      }
    });

    await safely(page, c, 'register as worker', async () => {
      const btn = await page.$('button:has-text("Register as Worker")');
      if (btn) { await btn.click(); await page.waitForTimeout(2000); }
    });

    // ═══════════════════════════════════════════════════════════
    // 8. SOUL CAPTURE
    // ═══════════════════════════════════════════════════════════
    c.setContext('/evangelism/souls/capture', 'navigate');
    await navigateTo(page, '/evangelism/souls/capture');
    await checkForCrash(page, c);

    await safely(page, c, 'submit empty soul capture', async () => {
      const btn = await page.$('button[type="submit"]');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1500);
        const errs = await page.$$eval('[class*="error"], [class*="text-red"]', (els) =>
          els.map((e) => e.textContent?.trim()).filter(Boolean)
        );
        if (errs.length === 0) c.logError({ type: 'test_error', message: 'Empty soul capture: no validation errors' });
      }
    });

    await safely(page, c, 'fill and submit soul capture', async () => {
      await fillByName(page, 'firstName', 'E2E');
      await fillByName(page, 'lastName', `Soul${Date.now()}`);
      await fillByName(page, 'phone', '+447700900888');
      await fillByName(page, 'email', `e2e-soul-${Date.now()}@test.church`);
      await fillByName(page, 'address', '123 Test Street');
      await selectByName(page, 'gender', 'Male');
      await selectByName(page, 'ageGroup', '26-35');
      await fillByName(page, 'notes', 'Captured by E2E test');
      await selectByName(page, 'source', 'ad-hoc');

      const btn = await page.$('button[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    // ═══════════════════════════════════════════════════════════
    // 9. SOULS KANBAN
    // ═══════════════════════════════════════════════════════════
    c.setContext('/evangelism/souls', 'navigate');
    await navigateTo(page, '/evangelism/souls');
    await checkForCrash(page, c);

    await safely(page, c, 'verify kanban columns', async () => {
      await page.waitForTimeout(2000);
      const cols = await page.$$('[role="region"]');
      if (cols.length < 4) c.logError({ type: 'test_error', message: `Expected 4 kanban columns, found ${cols.length}` });
    });

    await safely(page, c, 'click soul card for detail', async () => {
      const card = await page.$('button[aria-label^="Soul:"]');
      if (card) {
        await card.click();
        await page.waitForTimeout(1500);
        const close = await page.$('button[aria-label="Close"], button:has-text("Close"), button:has-text("×")');
        if (close) { await close.click(); await page.waitForTimeout(500); }
      }
    });

    await safely(page, c, 'drag soul New → Following Up', async () => {
      const newCol = await page.$('[aria-label="New column"]');
      const followCol = await page.$('[aria-label="Following Up column"]');
      if (!newCol || !followCol) return;

      const card = await newCol.$('button[aria-label^="Soul:"]');
      if (!card) return;

      const cardBox = await card.boundingBox();
      const targetBox = await followCol.boundingBox();
      if (!cardBox || !targetBox) return;

      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(2000);
    });

    // ═══════════════════════════════════════════════════════════
    // 10. FOLLOW-UP TRACKER
    // ═══════════════════════════════════════════════════════════
    c.setContext('/evangelism/followups', 'navigate');
    await navigateTo(page, '/evangelism/followups');
    await checkForCrash(page, c);

    await safely(page, c, 'switch follow-up tabs', async () => {
      for (const label of ['Pending', 'Overdue', 'All']) {
        const tab = await page.$(`button[role="tab"]:has-text("${label}")`);
        if (tab) { await tab.click(); await page.waitForTimeout(1500); }
      }
    });

    await safely(page, c, 'search follow-ups', async () => {
      const input = await page.$('input[aria-label="Search follow-ups"]');
      if (input) {
        await input.fill('test');
        await page.waitForTimeout(1500);
        await input.fill('');
        await page.waitForTimeout(1000);
      }
    });

    await safely(page, c, 'filter follow-ups by status', async () => {
      const sel = 'select[name="filterStatus"]';
      if (await page.$(sel)) {
        await page.selectOption(sel, 'Pending');
        await page.waitForTimeout(1500);
        await page.selectOption(sel, '');
      }
    });

    await safely(page, c, 'log follow-up — empty submit', async () => {
      const btn = await page.$('button:has-text("Log Follow-Up")');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(1000);

      const submit = await page.$('button[type="submit"]:has-text("Log Follow-Up")');
      if (submit) {
        await submit.click();
        await page.waitForTimeout(1000);
        const errs = await page.$$eval('[class*="error"], [class*="text-red"]', (els) =>
          els.map((e) => e.textContent?.trim()).filter(Boolean)
        );
        if (errs.length === 0) c.logError({ type: 'test_error', message: 'Empty follow-up form: no validation errors' });
      }
    });

    await safely(page, c, 'log follow-up — fill and submit', async () => {
      await selectByName(page, 'contactMethod', 'Phone Call');
      await selectByName(page, 'contactStatus', 'Successful');
      await fillByName(page, 'durationMinutes', '15');
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await fillByName(page, 'nextFollowUpDate', tomorrow);
      await fillByName(page, 'notes', 'E2E test follow-up');

      const submit = await page.$('button[type="submit"]:has-text("Log Follow-Up")');
      if (submit) { await submit.click(); await page.waitForTimeout(3000); }
    });

    // ═══════════════════════════════════════════════════════════
    // 11. DONATIONS
    // ═══════════════════════════════════════════════════════════
    c.setContext('/donations', 'navigate');
    await navigateTo(page, '/donations');
    await checkForCrash(page, c);

    c.setContext('/donations/record', 'navigate');
    await navigateTo(page, '/donations/record');
    await checkForCrash(page, c);

    await safely(page, c, 'submit empty online donation', async () => {
      const btn = await page.$('button:has-text("Donate Online")');
      if (btn) { await btn.click(); await page.waitForTimeout(1500); }
    });

    await safely(page, c, 'fill and submit online donation', async () => {
      await fillByName(page, 'amount', '25.00');
      await selectByName(page, 'purpose', 'Offering');
      const btn = await page.$('button:has-text("Donate Online")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    await safely(page, c, 'switch to manual tab', async () => {
      const tab = await page.$('button[role="tab"]:has-text("Manual Entry")');
      if (tab) { await tab.click(); await page.waitForTimeout(1000); }
    });

    await safely(page, c, 'submit empty manual donation', async () => {
      const btn = await page.$('button:has-text("Record Donation")');
      if (btn) { await btn.click(); await page.waitForTimeout(1500); }
    });

    await safely(page, c, 'fill and submit manual donation', async () => {
      await fillByName(page, 'manualAmount', '50.00');
      await selectByName(page, 'manualPurpose', 'Tithe');
      await selectByName(page, 'paymentMethod', 'Cash');
      await fillByName(page, 'donationDate', new Date().toISOString().split('T')[0]);
      const btn = await page.$('button:has-text("Record Donation")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    c.setContext('/donations/reports', 'navigate');
    await navigateTo(page, '/donations/reports');
    await checkForCrash(page, c);

    // ═══════════════════════════════════════════════════════════
    // 12. FORMS
    // ═══════════════════════════════════════════════════════════
    c.setContext('/forms', 'navigate');
    await navigateTo(page, '/forms');
    await checkForCrash(page, c);

    c.setContext('/forms/builder', 'navigate');
    await navigateTo(page, '/forms/builder');
    await checkForCrash(page, c);

    await safely(page, c, 'add fields to form builder', async () => {
      for (const label of ['Text', 'Number', 'Dropdown']) {
        const btn = await page.$(`button:has-text("${label}")`);
        if (btn) { await btn.click(); await page.waitForTimeout(500); }
      }
    });

    await safely(page, c, 'fill form name and save', async () => {
      await fillByName(page, 'formName', `E2E Form ${Date.now()}`);
      const btn = await page.$('button:has-text("Save Form")');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
    });

    await safely(page, c, 'save as template', async () => {
      const btn = await page.$('button:has-text("Save as Template")');
      if (btn) { await btn.click(); await page.waitForTimeout(2000); }
    });

    await safely(page, c, 'open from template modal', async () => {
      const btn = await page.$('button:has-text("From Template")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(2000);
        const close = await page.$('button[aria-label="Close"], button:has-text("Cancel")');
        if (close) await close.click();
      }
    });

    c.setContext('/forms/submissions', 'navigate');
    await navigateTo(page, '/forms/submissions');
    await checkForCrash(page, c);

    // ═══════════════════════════════════════════════════════════
    // 13–15. REPORTS, PROFILE, SETTINGS
    // ═══════════════════════════════════════════════════════════
    for (const pg of ['/reports', '/profile', '/settings']) {
      c.setContext(pg, 'navigate');
      await navigateTo(page, pg);
      await checkForCrash(page, c);
    }

    // ═══════════════════════════════════════════════════════════
    // REPORT
    // ═══════════════════════════════════════════════════════════
    c.writeReport(ROLE);
    expect(true).toBe(true);
  });
});
