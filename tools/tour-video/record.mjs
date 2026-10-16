#!/usr/bin/env node
/**
 * Drive Kairos and record it.
 *
 *   node record.mjs general
 *   node record.mjs general --lang fr
 *
 * This is the stage that was missing. The README has always described a
 * Playwright capture feeding `marks-<id>.json` and `public/capture/<id>.webm`,
 * but the script that produced them was never in the repo — the three tours
 * on the docs site were made by something nobody could re-run. Rebuilt here
 * so a tour can be regenerated, and so the same machinery can cut the short
 * per-section clips.
 *
 * Writes, relative to this folder:
 *   public/capture/<id>[-<lang>].webm   the recording
 *   marks-<id>[-<lang>].json            when each stop began, measured
 *
 * The stop offsets are measured as the run performs them, not predicted, so
 * a page that loads slowly on the day moves its own caption rather than
 * putting picture and narration out of step.
 */
import { mkdirSync, writeFileSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { loadFlow } from './flows/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flowId = argv.find((a) => !a.startsWith('--'));
const flagOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};

if (!flowId) {
  console.error('usage: node record.mjs <flow> [--lang en|fr|kri|tw] [--base http://localhost:3002]');
  process.exit(1);
}

const lang = flagOf('lang', 'en');
const base = flagOf('base', process.env.KAIROS_BASE_URL ?? 'http://localhost:3002');
const slug = lang === 'en' ? flowId : `${flowId}-${lang}`;

const flow = await loadFlow(flowId);
const captureDir = join(HERE, 'public', 'capture');
const tmpDir = join(HERE, '.capture-tmp');
mkdirSync(captureDir, { recursive: true });
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const WIDTH = 1920;
const HEIGHT = 1080;

console.log(`recording "${flowId}" in ${lang} against ${base}`);
console.log(`  ${flow.stops.length} stops\n`);

const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  recordVideo: { dir: tmpDir, size: { width: WIDTH, height: HEIGHT } },
  // The app reads its language from this cookie during the server render, so
  // setting it here records the UI already in the right language rather than
  // flashing English first.
  storageState: {
    cookies: [
      { name: 'kairos.language', value: lang, domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
    ],
    origins: [],
  },
});

// Playwright starts the recording the moment the context exists, so the
// sign-in is in the capture whether we want it or not. Noting the time here
// lets every mark be expressed as an offset into the *video*, not into the
// part of the run we care about — getting that wrong put each caption a
// login's worth of seconds ahead of the screen it describes.
const recordingStarted = Date.now();
const page = await context.newPage();
const cursorSource = (await import('node:fs')).readFileSync(join(HERE, 'lib', 'cursor.js'), 'utf8');
await context.addInitScript(cursorSource);

/** Helpers the flow files are handed, so a flow reads as a description. */
const api = {
  page,
  lang,
  base,
  async goto(path) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  },
  async moveTo(selector, { timeout = 2500 } = {}) {
    // A short timeout on purpose. A selector that no longer matches should
    // cost the recording two seconds and a skipped gesture, not Playwright's
    // 30-second default — which is what silently swallowed a whole stop on
    // the first run and left a 35-second hole in the capture.
    const box = await page
      .locator(selector)
      .first()
      .boundingBox({ timeout })
      .catch(() => null);
    if (!box) return false;
    await page.evaluate(
      ([x, y]) => window.__kairosCursor?.moveTo(x, y),
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    await page.waitForTimeout(460);
    return true;
  },
  async click(selector) {
    if (!(await api.moveTo(selector))) return false;
    await page.evaluate(() => window.__kairosCursor?.click());
    await page.waitForTimeout(200);
    await page.locator(selector).first().click().catch(() => {});
    await page.waitForTimeout(600);
    return true;
  },
  async settle(ms = 900) {
    await page.waitForTimeout(ms);
  },
  async scroll(by = 400) {
    await page.mouse.wheel(0, by);
    await page.waitForTimeout(700);
  },
};

// ── Sign in ────────────────────────────────────────────────────────────────
// Submitting before React has hydrated posts the form the browser's own way:
// the page goes to /login?email=…&password=… and sits there until the wait
// times out, which costs the whole clip. It only happens when the machine is
// busy — which, during a 113-clip batch, is always — so wait for hydration
// and start the sign-in over if the fallback GET happens anyway.
const { email, password } = flow.account;
for (let attempt = 1; ; attempt++) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/\/(dashboard|accept-policies)/, {
      timeout: 45000,
      waitUntil: 'domcontentloaded',
    });
    break;
  } catch (err) {
    if (attempt >= 3) throw err;
    console.log(`  (sign-in attempt ${attempt} did not take; retrying)`);
  }
}

// A freshly seeded database has no consent records, and the gate is enforced
// on navigation rather than at sign-in — so the first run landed on the
// dashboard, looked fine, and then redirected to the policy screen the moment
// it tried to open /members. Clearing it up front, explicitly, keeps that
// screen out of the recording. The acceptance is stored, so only the first
// run on each account pays for it.
await page.goto(`${base}/accept-policies`, { waitUntil: 'networkidle' });
if (page.url().includes('/accept-policies')) {
  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      await boxes.nth(i).click({ force: true }).catch(() => {});
    }
    await page
      .getByRole('button', { name: /accept|continue|accepter|continuer/i })
      .last()
      .click()
      .catch(() => {});
    await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
    console.log(`  (accepted ${count} outstanding policies first)`);
  }
}

await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Sign-in is done. Offsets are measured from the start of the recording,
// because that is the clock the capture file is on.
const t0 = Date.now();
const signInTook = (t0 - recordingStarted) / 1000;
const at = () => (Date.now() - recordingStarted) / 1000;
console.log(`  (sign-in took ${signInTook.toFixed(1)}s and is in the capture)\n`);
const marks = [];

for (const stop of flow.stops) {
  const start = at();
  process.stdout.write(`  ${String(stop.n).padStart(2)} ${stop.title.slice(0, 46).padEnd(48)}`);
  try {
    await stop.run(api);
  } catch (err) {
    // Record the mark anyway: the narration for this stop still has to go
    // somewhere, and a missed gesture is better than a missing caption.
    console.log(`${start.toFixed(1)}s  ⚠ ${err.message.split('\n')[0].slice(0, 48)}`);
    marks.push({ n: stop.n, title: stop.title, start });
    continue;
  }
  marks.push({ n: stop.n, title: stop.title, start });
  console.log(`${start.toFixed(1)}s`);
}

await api.settle(1200);
await page.evaluate(() => window.__kairosCursor?.hide());
await context.close();
await browser.close();

// Playwright names the file after the page; move it somewhere predictable.
const produced = readdirSync(tmpDir).find((f) => f.endsWith('.webm'));
if (!produced) {
  console.error('playwright wrote no video');
  process.exit(1);
}
const out = join(captureDir, `${slug}.webm`);
renameSync(join(tmpDir, produced), out);
rmSync(tmpDir, { recursive: true, force: true });

writeFileSync(
  join(HERE, `marks-${slug}.json`),
  `${JSON.stringify(
    { flow: flowId, lang, signInTook, maxSeconds: flow.maxSeconds ?? null, marks },
    null,
    2,
  )}\n`,
);

console.log(`\nwrote ${out}`);
console.log(`wrote marks-${slug}.json  (${marks.length} stops, ${at().toFixed(1)}s of video)`);
