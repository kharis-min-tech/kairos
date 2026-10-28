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
/** Seconds into the capture file, which is the clock every mark is on. */
const at = () => (Date.now() - recordingStarted) / 1000;

/**
 * Every gesture the run makes, with where and when.
 *
 * The composition uses these to aim the camera: a slow push towards whatever
 * the cursor last touched, and a punch-in on each click. Without them it can
 * only zoom at the middle of the frame, which is rarely where anything is.
 *
 * Kept on this side rather than in the page. `addInitScript` re-runs on every
 * navigation, so a log living on `window` is wiped each time a stop opens a
 * new screen — and these coordinates are already known here, because moveTo
 * is what computed them.
 */
const gestures = [];
const gesture = (kind, x, y) => gestures.push({ t: at(), kind, x: Math.round(x), y: Math.round(y) });

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
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.evaluate(([tx, ty]) => window.__kairosCursor.moveTo(tx, ty), [x, y]);
    await page.waitForTimeout(460);
    gesture('move', x, y);
    api.pointer = { x, y };
    return true;
  },
  async click(selector) {
    if (!(await api.moveTo(selector))) return false;
    gesture('click', api.pointer.x, api.pointer.y);
    await page.evaluate(() => window.__kairosCursor.click());
    await page.waitForTimeout(200);
    await page.locator(selector).first().click().catch(() => {});
    await api.settleAfterClick();
    return true;
  },
  /**
   * Hold until the screen a click opened has actually drawn.
   *
   * A flat 600ms was not enough: the camera punches in exactly at the click,
   * and what it found there was Next's skeleton -- grey placeholder blocks
   * where the content should be. Wait for the network to go quiet, then give
   * the frame a beat to paint, so the zoom lands on real content.
   */
  async settleAfterClick() {
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // Skeletons are rendered, so "no network" is not proof of "no skeleton".
    await page
      .waitForFunction(
        () => !document.querySelector('[data-skeleton], .animate-pulse, [aria-busy="true"]'),
        null,
        { timeout: 6000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
  },
  /** Where the pointer is, so a gesture can be logged without re-measuring. */
  pointer: { x: WIDTH / 2, y: HEIGHT / 2 },
  /** Glide to a point already known, without re-measuring an element. */
  async moveToPoint(x, y, ms = 420) {
    await page.evaluate(([tx, ty, d]) => window.__kairosCursor.moveTo(tx, ty, d), [x, y, ms]);
    await page.waitForTimeout(ms + 40);
    gesture('move', x, y);
    api.pointer = { x, y };
  },
  async settle(ms = 900) {
    await page.waitForTimeout(ms);
  },
  async scroll(by = 400) {
    // Broken into steps so it reads as scrolling rather than as a jump cut.
    // A single wheel event of 400px moves the page between two frames, which
    // on screen is indistinguishable from the page having been replaced.
    const steps = Math.max(1, Math.round(Math.abs(by) / 120));
    const each = by / steps;
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, each);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(320);
  },

  /**
   * Open the first row or card on the page, the way the narration says to.
   *
   * Worth its length: across all 67 beats, not one of them clicked anything.
   * The lines said "clicking a row opens that person" and "open a service to
   * mark people present", and the capture behind them loaded a list and
   * scrolled it. That gap is most of why the clips did not look like a
   * product being used.
   *
   * Returns whether it got somewhere, so a beat can fall back to showing the
   * list rather than claiming a detail view that never opened.
   */
  async openFirst(selector) {
    const was = page.url();

    // What counts as "going inside": a link in the content whose path is
    // deeper than the page we are on. On /departments that is
    // /departments/<id>, on /attendance it is /attendance/<id>, and the nav,
    // the sibling tabs and the help link are all excluded by construction.
    //
    // Matching by component selector was tried first and found nothing: these
    // lists are neither tables nor cards, so `table tbody tr a` and
    // `[data-slot="card"] a` both missed, the beat silently did nothing and
    // the clip went out showing the same list twice. The shape of the URL is
    // the thing that is actually reliable across all 32 screens.
    const box = await page.evaluate((sel) => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 60 && r.height > 20 && r.top > 64 && r.bottom < innerHeight - 40
          ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          : null;
      };

      if (sel) {
        const el = document.querySelector(sel);
        return el ? vis(el) : null;
      }

      const here = location.pathname.replace(/\/$/, '');
      for (const a of document.querySelectorAll('a[href]')) {
        let u;
        try {
          u = new URL(a.getAttribute('href'), location.href);
        } catch {
          continue;
        }
        if (u.origin !== location.origin) continue;
        const path = u.pathname.replace(/\/$/, '');
        if (!path.startsWith(`${here}/`)) continue;
        const at = vis(a);
        if (at) return at;
      }

      // Nothing deeper on screen: fall back to the usual list shapes.
      for (const s2 of ['table tbody tr', '[role="row"]', '[data-slot="card"]']) {
        for (const el of document.querySelectorAll(s2)) {
          const at = vis(el);
          if (at) return at;
        }
      }
      return null;
    }, selector ?? null);

    if (!box) return false;

    await api.moveToPoint(box.x, box.y, 440);
    gesture('click', box.x, box.y);
    await page.evaluate(() => window.__kairosCursor.click());
    await page.waitForTimeout(170);
    await page.mouse.click(box.x, box.y);

    // Either the route changed, or something opened over the top of it.
    const opened = await Promise.race([
      page.waitForURL((u) => u.toString() !== was, { timeout: 6000 }).then(() => true),
      page
        .waitForSelector('[role="dialog"], [data-state="open"]', { timeout: 6000 })
        .then(() => true),
    ]).catch(() => false);

    if (!opened) return false;
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    return true;
  },

  /** Type, one key at a time, because typing is worth watching. */
  async typeInto(selector, text) {
    if (!(await api.moveTo(selector))) return false;
    gesture('click', api.pointer.x, api.pointer.y);
    await page.evaluate(() => window.__kairosCursor.click());
    await page.locator(selector).first().click().catch(() => {});
    await page.locator(selector).first().type(text, { delay: 85 }).catch(() => {});
    await page.waitForTimeout(900);
    return true;
  },

  /** Click the first visible control whose text matches, e.g. a filter chip. */
  async clickText(pattern) {
    const target = page.getByRole('button', { name: pattern }).or(page.getByRole('tab', { name: pattern })).first();
    const box = await target.boundingBox({ timeout: 2500 }).catch(() => null);
    if (!box) return false;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await api.moveToPoint(x, y, 380);
    gesture('click', x, y);
    await page.evaluate(() => window.__kairosCursor.click());
    await target.click().catch(() => {});
    await page.waitForTimeout(800);
    return true;
  },

  /** Back to the list, so the next beat starts where the viewer expects. */
  async back() {
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(500);
  },

  /**
   * Spend `ms` showing the page, instead of standing still for it.
   *
   * This is the fix for the complaint that the clips were "not even a video".
   * Every beat used to end in `settle(14000)` — a page, motionless, for
   * fourteen seconds — because the budget for a thirty-second clip was
   * divided between the beats and the leftover had to go somewhere. Half of
   * every finished clip was a screenshot with narration over it.
   *
   * Now the beat spends its time moving: the cursor tours whatever the screen
   * actually offers — rows, cards, tabs, buttons — and the page scrolls
   * between passes. Those movements are also what the camera aims at, so the
   * zoom has somewhere meaningful to go.
   */
  async showcase(ms = 6000) {
    const until = Date.now() + ms;
    const CANDIDATES = [
      'table tbody tr',
      '[role="row"]',
      '[data-slot="card"]',
      '[class*="card" i]',
      '[role="tab"]',
      'button:not([disabled])',
      'a[href^="/"]',
      '[class*="badge" i]',
    ];

    let pass = 0;
    while (Date.now() < until) {
      const boxes = await page.evaluate((selectors) => {
        const seen = [];
        for (const sel of selectors) {
          for (const el of document.querySelectorAll(sel)) {
            const r = el.getBoundingClientRect();
            // In view, big enough to be a real target, not the whole page.
            if (r.width < 48 || r.height < 18 || r.width > innerWidth * 0.98) continue;
            if (r.top < 80 || r.bottom > innerHeight - 120) continue;
            seen.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            if (seen.length > 40) return seen;
          }
        }
        return seen;
      }, CANDIDATES);

      if (!boxes.length) break;

      // Spread the picks across the page rather than hitting forty adjacent
      // table rows, so the cursor travels and the eye follows it.
      boxes.sort((a, b) => a.y - b.y || a.x - b.x);
      const want = Math.min(3, boxes.length);
      const picks = Array.from({ length: want }, (_, i) =>
        boxes[Math.floor(((i + 0.5) * boxes.length) / want)]);

      for (const b of picks) {
        if (Date.now() >= until) break;
        await api.moveToPoint(b.x, b.y, 380);
        await page.waitForTimeout(260);
      }

      if (Date.now() >= until) break;
      // Alternate direction so a short page does not scroll off the bottom
      // and sit on empty space for the rest of the beat.
      await api.scroll(pass % 2 === 0 ? 260 : -260);
      pass++;
    }

    // Whatever is left of the budget, after the motion.
    const left = until - Date.now();
    if (left > 0) await page.waitForTimeout(left);
  },
};

// ── Sign in ────────────────────────────────────────────────────────────────
// Submitting before React has hydrated posts the form the browser's own way:
// the page goes to /login?email=…&password=… and sits there until the wait
// times out, which costs the whole clip. It only happens when the machine is
// busy — which, during a 113-clip batch, is always — so wait for hydration
// and start the sign-in over if the fallback GET happens anyway.
//
// The retry wraps the whole attempt, not just the wait at the end. A first
// version guarded only `waitForURL`, and the next failure was `fill` timing
// out instead — the field is there, hydration re-renders it, and the handle
// detaches underneath. Anything in here can lose a race on a loaded machine,
// so anything in here is worth starting over.
const { email, password } = flow.account;
for (let attempt = 1; ; attempt++) {
  try {
    await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.fill('input[type="email"]', email, { timeout: 30000 });
    await page.fill('input[type="password"]', password, { timeout: 30000 });
    await page.click('button[type="submit"]', { timeout: 30000 });
    await page.waitForURL(/\/(dashboard|accept-policies)/, {
      timeout: 45000,
      waitUntil: 'domcontentloaded',
    });
    break;
  } catch (err) {
    if (attempt >= 4) throw err;
    const why = String(err.message).split('\n')[0];
    console.log(`  (sign-in attempt ${attempt} failed: ${why} — retrying)`);
    await page.waitForTimeout(2000 * attempt);
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

// Prove the pointer is really on the page before filming anything.
//
// It was not, for every one of the first 144 clips: the overlay mounted
// itself into <html> before <body> existed, the parser dropped it, and the
// API object survived on `window` so every moveTo and click resolved without
// complaint. The recording looked fine to the recorder and shipped with no
// cursor in it. An assertion here costs one evaluate and makes that
// particular silence impossible.
if (!(await page.evaluate(() => window.__kairosCursor?.ready?.() === true))) {
  throw new Error(
    'the cursor overlay is not on the page - refusing to record a tour with no visible pointer',
  );
}

// Sign-in is done. Offsets are measured from the start of the recording,
// because that is the clock the capture file is on.
const signInTook = at();
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
    { flow: flowId, lang, signInTook, maxSeconds: flow.maxSeconds ?? null, marks, gestures },
    null,
    2,
  )}\n`,
);

console.log(`\nwrote ${out}`);
console.log(
  `wrote marks-${slug}.json  (${marks.length} stops, ${gestures.length} gestures, ` +
  `${at().toFixed(1)}s of video)`,
);
