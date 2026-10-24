#!/usr/bin/env node
/**
 * Does every clip actually play like a video?
 *
 *   node check-pace.mjs
 *   node check-pace.mjs --verbose
 *
 * The three things that were wrong, as three measurements:
 *
 *   silence   how much of the clip nobody is speaking over. This was 49% on
 *             average and is the whole reason the clips felt like slides.
 *   gestures  whether the recorder did anything at all on that screen.
 *   clicks    whether anything was opened, which is what the narration
 *             keeps saying happens.
 *
 * Reads what is already on disk — no browser, no Deepgram, no render.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSchedule, TAIL } from './lib/schedule.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const verbose = process.argv.includes('--verbose');

/** A clip with this much un-narrated time has the old defect back. */
const SILENCE_LIMIT = 0.08;

const slugs = readdirSync(HERE)
  .filter((f) => f.startsWith('marks-') && f.endsWith('.json'))
  .map((f) => f.slice('marks-'.length, -'.json'.length))
  .filter((s) => s !== 'smoke')
  .filter((s) => existsSync(join(HERE, 'out', `tour-${s}.mp4`)))
  .sort();

if (!slugs.length) {
  console.error('no rendered clips to check');
  process.exit(1);
}

const rows = [];
for (const slug of slugs) {
  const marksPath = join(HERE, `marks-${slug}.json`);
  const timingsPath = join(HERE, 'timings', `${slug}.json`);
  const capturePath = join(HERE, 'public', 'capture', `${slug}.webm`);
  if (!existsSync(timingsPath) || !existsSync(capturePath)) continue;

  const { marks, maxSeconds, gestures = [] } = JSON.parse(readFileSync(marksPath, 'utf8'));
  const { stops, voice, dubbedFrom } = JSON.parse(readFileSync(timingsPath, 'utf8'));
  const capture = parseFloat(
    execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', capturePath,
    ]).toString().trim(),
  );

  const { segments, duration } = buildSchedule(marks, stops, capture, { maxSeconds, gestures });
  const spoken = segments.reduce((n, s) => n + s.spoken, 0);
  const clicks = segments.reduce((n, s) => n + s.clicks.length, 0);
  const focused = segments.filter((s) => s.focus).length;

  rows.push({
    slug,
    lang: /-(fr|kri|tw)$/.exec(slug)?.[1] ?? 'en',
    stops: segments.length,
    duration: duration + TAIL,
    silence: duration > 0 ? (duration - spoken) / duration : 1,
    gestures: gestures.length,
    clicks,
    focused,
    capped: maxSeconds ?? null,
    over: maxSeconds ? duration + TAIL - maxSeconds : 0,
    voice,
    dubbedFrom,
  });
}

const problems = [];
for (const r of rows) {
  if (r.silence > SILENCE_LIMIT) {
    problems.push(`${r.slug}: ${(r.silence * 100).toFixed(0)}% silent`);
  }
  if (!r.gestures) problems.push(`${r.slug}: nothing happens on screen (no gestures)`);
  if (!r.focused) problems.push(`${r.slug}: camera has nothing to aim at`);
  if (r.capped && r.over > 1e-6) {
    problems.push(`${r.slug}: ${r.over.toFixed(1)}s over its ${r.capped}s cap`);
  }
}

const avg = (f) => rows.reduce((n, r) => n + f(r), 0) / rows.length;

if (verbose) {
  console.log('clip'.padEnd(46) + 'len   silence  gest  clicks');
  for (const r of rows) {
    console.log(
      r.slug.padEnd(46) +
      `${r.duration.toFixed(1).padStart(5)}  ${(r.silence * 100).toFixed(0).padStart(5)}%  ` +
      `${String(r.gestures).padStart(4)}  ${String(r.clicks).padStart(6)}`,
    );
  }
  console.log();
}

console.log(`${rows.length} clips checked`);
console.log(`  average length    ${avg((r) => r.duration).toFixed(1)}s`);
console.log(`  average silence   ${(avg((r) => r.silence) * 100).toFixed(1)}%   (was 49%)`);
console.log(`  clips with clicks ${rows.filter((r) => r.clicks).length}/${rows.length}`);
console.log(`  total click zooms ${rows.reduce((n, r) => n + r.clicks, 0)}`);
console.log(`  gestures per clip ${avg((r) => r.gestures).toFixed(0)}`);

const byLang = {};
for (const r of rows) (byLang[r.lang] ??= []).push(r);
console.log('\nby language:');
for (const [lang, rs] of Object.entries(byLang)) {
  const v = [...new Set(rs.map((r) => r.voice))].join(', ');
  console.log(
    `  ${lang.padEnd(4)} ${String(rs.length).padStart(3)} clips  ` +
    `${(rs.reduce((n, r) => n + r.silence, 0) / rs.length * 100).toFixed(1)}% silent  ` +
    `voice ${v}`,
  );
}

if (problems.length) {
  console.log(`\n${problems.length} problems:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log('\nevery clip is narrated throughout, moves, and fits its cap');
