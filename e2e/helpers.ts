/**
 * Shared E2E walkthrough helpers — error collection, login, navigation, safe interactions.
 */

import { type Page, type ConsoleMessage, type Response } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ErrorEntry {
  page: string;
  action: string;
  type: 'console_error' | 'page_error' | 'api_error' | 'ui_crash' | 'test_error';
  message: string;
  status?: number;
  url?: string;
}

export interface Report {
  timestamp: string;
  role: string;
  summary: {
    totalErrors: number;
    consoleErrors: number;
    apiErrors: number;
    uiCrashes: number;
    testErrors: number;
  };
  errors: ErrorEntry[];
}

// ─── Error Collector ─────────────────────────────────────────────────────────

export class ErrorCollector {
  errors: ErrorEntry[] = [];
  currentPage = '';
  currentAction = '';

  logError(entry: Omit<ErrorEntry, 'page' | 'action'>) {
    this.errors.push({ page: this.currentPage, action: this.currentAction, ...entry });
  }

  setContext(page: string, action: string) {
    this.currentPage = page;
    this.currentAction = action;
  }

  attachListeners(page: Page) {
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        this.logError({ type: 'console_error', message: msg.text().substring(0, 500) });
      }
    });
    page.on('pageerror', (err) => {
      this.logError({ type: 'page_error', message: err.message.substring(0, 500) });
    });
    page.on('response', (response: Response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 400) {
        this.logError({
          type: 'api_error',
          message: `${response.status()} ${response.statusText()}`,
          status: response.status(),
          url,
        });
      }
    });
  }

  generateReport(role: string): Report {
    return {
      timestamp: new Date().toISOString(),
      role,
      summary: {
        totalErrors: this.errors.length,
        consoleErrors: this.errors.filter((e) => e.type === 'console_error').length,
        apiErrors: this.errors.filter((e) => e.type === 'api_error').length,
        uiCrashes: this.errors.filter((e) => e.type === 'ui_crash').length,
        testErrors: this.errors.filter((e) => e.type === 'test_error' || e.type === 'page_error').length,
      },
      errors: this.errors,
    };
  }

  writeReport(role: string) {
    const report = this.generateReport(role);
    const reportPath = path.join(process.cwd(), `e2e-report-${role.toLowerCase()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.printSummary(report, reportPath);
  }

  printSummary(report: Report, reportPath: string) {
    console.log('\n' + '═'.repeat(60));
    console.log(`📋 E2E WALKTHROUGH REPORT — ${report.role}`);
    console.log('═'.repeat(60));
    console.log(`Total errors: ${report.summary.totalErrors}`);
    console.log(`  Console errors: ${report.summary.consoleErrors}`);
    console.log(`  API errors:     ${report.summary.apiErrors}`);
    console.log(`  UI crashes:     ${report.summary.uiCrashes}`);
    console.log(`  Test errors:    ${report.summary.testErrors}`);
    console.log('═'.repeat(60));

    if (this.errors.length > 0) {
      console.log('\nDetailed errors:');
      const grouped = this.errors.reduce(
        (acc, e) => {
          const key = e.page;
          if (!acc[key]) acc[key] = [];
          acc[key].push(e);
          return acc;
        },
        {} as Record<string, ErrorEntry[]>
      );

      for (const [pg, errs] of Object.entries(grouped)) {
        console.log(`\n  📄 ${pg} (${errs.length} error${errs.length > 1 ? 's' : ''}):`);
        for (const e of errs) {
          const prefix = e.type === 'api_error' ? `🔴 ${e.status}` : e.type === 'ui_crash' ? '💥' : e.type === 'console_error' ? '⚠️' : '❌';
          console.log(`    ${prefix} [${e.action}] ${e.message.substring(0, 150)}`);
          if (e.url) console.log(`       URL: ${e.url}`);
        }
      }
    }

    console.log(`\n📁 Full report saved to: ${reportPath}\n`);
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const NAV_TIMEOUT = 30_000;
export const BASE_WAIT = 2000;

export const USERS = {
  Admin: { email: 'daniel@kairos.church', password: 'TestUserPassword123!' },
  Pastor: { email: 'grace.adeyemi@kairos.church', password: 'Pastor@Grace2026!' },
  Leader: { email: 'samuel.okonkwo@kairos.church', password: 'Leader@Samuel2026!' },
  Member: { email: 'esther.williams@kairos.church', password: 'Member@Esther2026!' },
} as const;

// ─── Navigation & Login ──────────────────────────────────────────────────────

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForSelector('input[type="email"]', { timeout: NAV_TIMEOUT });
  if (page.url().includes('/dashboard')) return;

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 45_000 }),
    page.waitForSelector('[role="alert"]:not(:empty)', { timeout: 45_000 }).catch(() => {}),
  ]);

  if (page.url().includes('/login')) {
    const errorEl = await page.$('[role="alert"]');
    const errorText = errorEl ? await errorEl.textContent() : 'Unknown login error';
    throw new Error(`Login failed for ${email}: ${errorText}`);
  }
}

export async function navigateTo(page: Page, href: string) {
  await page.goto(href, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForTimeout(BASE_WAIT);
}

export async function checkForCrash(page: Page, collector: ErrorCollector): Promise<boolean> {
  const bodyText = await page.textContent('body').catch(() => '');
  const crashIndicators = ['Application error', 'Internal Server Error', 'Unhandled Runtime Error'];
  for (const indicator of crashIndicators) {
    if (bodyText?.includes(indicator)) {
      collector.logError({ type: 'ui_crash', message: `Page shows: "${indicator}"` });
      return true;
    }
  }
  return false;
}

export async function screenshotOnError(page: Page, name: string) {
  const dir = 'screenshots/e2e-results';
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true }).catch(() => {});
}

/** Safely run an action — log errors but don't abort the walkthrough */
export async function safely(page: Page, collector: ErrorCollector, actionName: string, fn: () => Promise<void>) {
  collector.currentAction = actionName;
  try {
    await fn();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    collector.logError({ type: 'test_error', message: msg });
    await screenshotOnError(page, `error-${collector.currentPage.replace(/\//g, '-')}-${actionName.replace(/\s+/g, '-')}`);
  }
}

/** Click a button/link matching selector, if it exists */
export async function clickIfExists(page: Page, collector: ErrorCollector, selector: string, description: string) {
  const el = await page.$(selector);
  if (el) {
    await safely(page, collector, `click ${description}`, async () => {
      await el.click();
      await page.waitForTimeout(1500);
    });
    return true;
  }
  return false;
}

/** Fill an input by name attribute */
export async function fillByName(page: Page, name: string, value: string) {
  const sel = `input[name="${name}"], textarea[name="${name}"]`;
  const el = await page.$(sel);
  if (el) await page.fill(sel, value);
}

/** Select an option in a <select> by name */
export async function selectByName(page: Page, name: string, value: string) {
  const sel = `select[name="${name}"]`;
  const el = await page.$(sel);
  if (el) await page.selectOption(sel, value);
}

/** Select first non-empty option in a <select> */
export async function selectFirstOption(page: Page, selector: string) {
  const el = await page.$(selector);
  if (!el) return;
  const options = await el.$$('option');
  for (const opt of options) {
    const val = await opt.getAttribute('value');
    if (val && val !== '') {
      await page.selectOption(selector, val);
      return;
    }
  }
}
