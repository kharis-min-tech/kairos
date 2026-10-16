#!/usr/bin/env node
/**
 * Capture the handbook's screenshots in a given language.
 *
 *   node shoot.mjs --lang fr
 *   node shoot.mjs --lang fr --only dashboard,members
 *   node shoot.mjs --lang en --out ../../apps/docs/public/screenshots
 *
 * Why this exists: the translated handbook points every image at
 * `/screenshots/<lang>/…`, because a French page showing an English screen is
 * the thing the whole translation was meant to fix. The English set was taken
 * by hand and could not be reproduced, so the build simply failed on the
 * missing files. This is the script that produces them, for any language,
 * from the running app.
 *
 * One browser context per theme: next-themes reads a localStorage key, and
 * the app reads its language from a cookie during the server render, so both
 * are seeded before the first paint rather than toggled afterwards — a
 * toggled theme leaves a transition mid-capture, and a toggled language
 * flashes English first.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { SHOTS } from './shots.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};

const lang = flag('lang', 'en');
const base = flag('base', process.env.KAIROS_BASE_URL ?? 'http://localhost:3002');
const only = flag('only', '')?.split(',').filter(Boolean) ?? [];
const outRoot = flag('out', join(HERE, '..', '..', 'apps', 'docs', 'public', 'screenshots'));
const outDir = lang === 'en' ? outRoot : join(outRoot, lang);

const ACCOUNT = { email: 'admin@kairos.local', password: 'Password1!' };
const WIDTH = 1920;
const HEIGHT = 1080;

const wanted = only.length ? SHOTS.filter((s) => only.includes(s.file)) : SHOTS;
if (!wanted.length) {
  console.error('nothing matched --only');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
console.log(`shooting ${wanted.length} screenshots in ${lang} against ${base}`);
console.log(`  into ${outDir}\n`);

// Mapbox GL needs WebGL, and headless Chromium has none by default — the
// first run produced four blank white rectangles where the fellowship map
// should be. SwiftShader gives it a software GL implementation.
// Mapbox GL needs real WebGL. Headless Chromium has none, and SwiftShader
// draws the style's background colour but never the tiles, which produced
// four screenshots of empty blue ocean. `--headed` uses the machine's own
// GPU and the map comes out as a reader would see it.
const headed = argv.includes('--headed');
const browser = await chromium.launch({
  headless: !headed,
  args: ['--hide-scrollbars'],
});
let taken = 0;
const failed = [];

for (const theme of ['light', 'dark']) {
  const list = wanted.filter((s) => s.theme === theme);
  if (!list.length) continue;

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    // 1x, matching the hand-taken English set: 144 retina PNGs would add
    // hundreds of megabytes to the repository for no gain at the size the
    // handbook renders them.
    deviceScaleFactor: 1,
    colorScheme: theme,
    storageState: {
      cookies: [
        {
          name: 'kairos.language',
          value: lang,
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [
        {
          origin: base,
          localStorage: [
            { name: 'theme', value: theme },
            { name: 'kairos.language', value: lang },
          ],
        },
      ],
    },
  });

  // Next's dev-mode error badge sits over the bottom-left corner of every
  // page; it is not part of the product.
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal,[data-nextjs-toast]{display:none !important}';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style));
  });

  const page = await context.newPage();

  const shoot = async (spec) => {
    try {
      await page.goto(base + spec.route, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1600);
      if (spec.prep) await spec.prep(page);
      const target = spec.clip ? spec.clip(page) : page;
      await target.screenshot({ path: join(outDir, `${spec.file}.png`) });
      taken++;
      console.log(`  ${String(taken).padStart(3)}  ${spec.file}`);
    } catch (err) {
      failed.push(`${spec.file}: ${err.message.split('\n')[0]}`);
      console.log(`  ---  ${spec.file}  FAILED`);
    }
  };

  // Signed-out shots first: once we authenticate, /login redirects away.
  for (const spec of list.filter((s) => s.anon)) await shoot(spec);

  const rest = list.filter((s) => !s.anon);
  if (rest.length) {
    // Submitting before React has hydrated posts the form the browser's own
    // way: the first attempt navigated to /login?email=…&password=… and sat
    // there. Wait for hydration, and if the fallback GET happens anyway,
    // start over rather than timing out.
    for (let attempt = 1; ; attempt++) {
      await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('input[type="email"]', { timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.fill('input[type="email"]', ACCOUNT.email);
      await page.fill('input[type="password"]', ACCOUNT.password);
      await page.click('button[type="submit"]');
      try {
        await page.waitForURL(/\/(dashboard|accept-policies)/, { timeout: 45000, waitUntil: 'domcontentloaded' });
        break;
      } catch (err) {
        if (attempt >= 3) throw err;
        console.log(`  (sign-in attempt ${attempt} did not take; retrying)`);
      }
    }

    // The consent gate fires on navigation, not at sign-in, so clearing it up
    // front keeps it out of every subsequent shot.
    await page.goto(`${base}/accept-policies`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    if (page.url().includes('/accept-policies')) {
      const boxes = page.locator('input[type="checkbox"]');
      const count = await boxes.count();
      for (let i = 0; i < count; i++) await boxes.nth(i).click({ force: true }).catch(() => {});
      await page
        .getByRole('button', { name: /accept|continue|accepter|continuer|aksɛpt|pene/i })
        .last()
        .click()
        .catch(() => {});
      await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
    }

    for (const spec of rest) await shoot(spec);
  }

  await context.close();
}

await browser.close();

console.log(`\n${taken} written${failed.length ? `, ${failed.length} failed` : ''}`);
for (const f of failed) console.log(`  ${f}`);
process.exit(failed.length ? 1 : 0);
