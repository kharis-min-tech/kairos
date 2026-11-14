#!/usr/bin/env node
/**
 * Record a shareable walkthrough of the published handbook, one per language.
 *
 *   node walkthrough.mjs            all four languages
 *   node walkthrough.mjs --lang fr  just one
 *
 * ## Why the audio is composited rather than captured
 *
 * Playwright's recorder writes video only -- there is no audio track in a
 * `recordVideo` file at all, and macOS will not let ffmpeg take system sound
 * without a virtual output device. A screen capture would therefore be
 * silent. So the page is recorded silently and the narration is laid
 * underneath afterwards, taken straight from the clip's own mp4. The result
 * is cleaner than a capture would have been: the audio never goes through a
 * speaker and back, it is the master.
 *
 * ## How the two are kept in sync
 *
 * Wall-clock timing cannot be trusted across the boundary, because nothing
 * says how long after the context is created the recorder's first frame
 * lands. Instead the page opens under a full-screen black overlay that is
 * removed at a known instant, and `blackdetect` finds the end of that black
 * run in the finished file. That frame is t0, every logged event is an
 * offset from it, and the narration is delayed to match.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIPS = join(HERE, '..', '..', 'apps', 'docs', 'public', 'clips');
const OUT = join(HERE, 'walkthrough');
const TMP = join(OUT, '.raw');

const BASE = 'http://localhost:5174';
const W = 1920;
const H = 1080;

const argv = process.argv.slice(2);
const flagOf = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

/** The root locale is served at /, the others under their own prefix. */
const LANGS = [
  { code: 'en', prefix: '' },
  { code: 'fr', prefix: '/fr' },
  { code: 'kri', prefix: '/kri' },
  { code: 'tw', prefix: '/tw' },
];

/** The two sections the walkthrough stops at, and how long to let each play. */
const STOPS = [
  { slug: 'platform/members', play: 21 },
  { slug: 'platform/follow-ups', play: 15 },
];

const clipFile = (slug, code) => {
  const base = slug.replace(/\//g, '-');
  return code === 'en' ? base : `${base}-${code}`;
};

/* ─────────────────────────── page-side helpers ─────────────────────────── */

/**
 * Scroll by easing rather than jumping.
 *
 * `scrollTo({behavior:'smooth'})` is not usable here: its duration is the
 * browser's to choose and it cannot be awaited, so the recording would drift
 * away from the event log. This eases over a duration we picked and resolves
 * when it is actually finished.
 *
 * It destructures because `page.evaluate` passes exactly one argument. Taking
 * `(to, ms)` instead left `ms` undefined, so the progress fraction was NaN,
 * `NaN < 1` was false, and every scroll resolved on the first frame without
 * moving -- the walkthrough recorded perfectly still.
 */
const SMOOTH = `([to, ms]) => new Promise((done) => {
  const from = window.scrollY;
  const gap = to - from;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    window.scrollTo(0, from + gap * e);
    if (p < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
})`;

/* ───────────────────────────── one language ────────────────────────────── */

async function record(lang) {
  const events = [];
  const dir = join(TMP, lang.code);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir, size: { width: W, height: H } },
    reducedMotion: 'no-preference',
  });

  // Held over every navigation until released, so the opening frames are
  // reliably black whichever page the recorder happens to catch first.
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('__synced')) return;
    const paint = () => {
      if (!document.body) return;
      if (document.getElementById('__sync')) return;
      const d = document.createElement('div');
      d.id = '__sync';
      d.style.cssText =
        'position:fixed;inset:0;background:#000;z-index:2147483647;pointer-events:none';
      document.body.append(d);
    };
    paint();
    document.addEventListener('DOMContentLoaded', paint, { once: true });
  });

  const page = await ctx.newPage();
  await page.goto(`${BASE}${lang.prefix}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400); // a clear run of black for blackdetect

  const t0 = Date.now();
  const at = () => Date.now() - t0;
  await page.evaluate(() => {
    sessionStorage.setItem('__synced', '1');
    document.getElementById('__sync')?.remove();
  });

  // The home page: hero, then down through the feature cards.
  await page.waitForTimeout(1600);
  await page.evaluate(SMOOTH, [900, 2600]);
  await page.waitForTimeout(700);

  for (const stop of STOPS) {
    await page.goto(`${BASE}${lang.prefix}/${stop.slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const video = page.locator('video.section-clip__video').first();
    const top = await video.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate(SMOOTH, [Math.max(0, top - 150), 1200]);
    await page.waitForTimeout(500);

    const file = clipFile(stop.slug, lang.code);

    // Buffer the whole clip before starting it. The page only preloads
    // metadata, so playing straight away filmed a loading spinner over the
    // first second and left the native controls showing while it stalled.
    await video.evaluate(
      (el) =>
        new Promise((ready) => {
          el.preload = 'auto';
          if (el.readyState >= 4) return ready();
          el.addEventListener('canplaythrough', ready, { once: true });
          el.load();
          setTimeout(ready, 8000); // never hang the run on a slow decode
        }),
    );
    await page.waitForTimeout(350);

    const startedAt = at();
    await video.evaluate((el) => { el.currentTime = 0; return el.play(); });
    events.push({ at: startedAt, file, play: stop.play });
    await page.waitForTimeout(stop.play * 1000);
    await video.evaluate((el) => el.pause());

    // Then read a little of the page itself, so it is not only clips.
    await page.waitForTimeout(400);
    await page.evaluate(SMOOTH, [await page.evaluate(() => window.scrollY) + 1400, 2400]);
    await page.waitForTimeout(600);
  }

  await page.waitForTimeout(800);
  const total = at();
  await ctx.close();
  await browser.close();

  const raw = join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
  return { raw, events, total };
}

/* ───────────────────────────── post-production ─────────────────────────── */

/**
 * Video-time of the moment the black overlay came off.
 *
 * spawnSync and stderr because blackdetect, like volumedetect, reports on
 * stderr rather than stdout.
 */
const blackEnd = (file) => {
  const r = spawnSync('ffmpeg',
    ['-hide_banner', '-i', file, '-vf', 'blackdetect=d=0.4:pix_th=0.10', '-f', 'null', '-'],
    { encoding: 'utf8' });
  const m = `${r.stderr}`.match(/black_start:(\d+(?:\.\d+)?) black_end:(\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`no black lead-in found in ${file} - cannot sync audio`);
  return parseFloat(m[2]);
};

const mux = (raw, events, outFile) => {
  const anchor = blackEnd(raw);
  const inputs = ['-i', raw];
  // Drop the black lead-in here rather than with an output-side `-ss`, so the
  // video's zero and the event log's zero are the same instant by
  // construction and the audio delays are just the logged offsets.
  const parts = [`[0:v]trim=start=${anchor.toFixed(3)},setpts=PTS-STARTPTS[v]`];
  const labels = [];

  events.forEach((e, i) => {
    const src = join(CLIPS, `${e.file}.mp4`);
    if (!existsSync(src)) throw new Error(`missing clip audio: ${src}`);
    inputs.push('-i', src);
    const delay = Math.round(e.at);
    // The fade has to be applied before the delay, not after. `afade`'s start
    // time is read against whatever timeline it is handed, so downstream of
    // `adelay` it was measured from the padded zero: stop one faded out
    // ten seconds into its narration, and stop two finished fading before its
    // audio began and played silence.
    parts.push(
      `[${i + 1}:a]atrim=0:${e.play},asetpts=PTS-STARTPTS,` +
      `afade=t=out:st=${(e.play - 0.5).toFixed(2)}:d=0.5,` +
      `adelay=${delay}|${delay}[a${i}]`,
    );
    labels.push(`[a${i}]`);
  });

  const filter = `${parts.join(';')};${labels.join('')}amix=inputs=${labels.length}:` +
    `duration=longest:dropout_transition=0:normalize=0[mix]`;

  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...inputs,
    '-filter_complex', filter,
    '-map', '[v]', '-map', '[mix]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    outFile,
  ], { stdio: 'inherit' });

  return anchor;
};

/* ─────────────────────────────── the run ───────────────────────────────── */

mkdirSync(OUT, { recursive: true });
const only = flagOf('lang');
const langs = LANGS.filter((l) => !only || l.code === only);

for (const lang of langs) {
  process.stdout.write(`\n${lang.code}  recording...\n`);
  const { raw, events, total } = await record(lang);
  const outFile = join(OUT, `kairos-handbook-${lang.code}.mp4`);
  writeFileSync(join(TMP, lang.code, 'events.json'),
    JSON.stringify({ events, total }, null, 2));
  const anchor = mux(raw, events, outFile);
  const dur = parseFloat(execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile],
    { encoding: 'utf8' }).trim());
  console.log(`${lang.code}  ${outFile.split('/').pop()}  ${dur.toFixed(1)}s` +
    `  (sync anchor ${anchor.toFixed(2)}s, ${events.length} narrated stops, walk ${(total / 1000).toFixed(0)}s)`);
}
