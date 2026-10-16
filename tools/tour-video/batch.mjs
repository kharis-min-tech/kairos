#!/usr/bin/env node
/**
 * Produce every clip, in every language.
 *
 *   node batch.mjs                     everything
 *   node batch.mjs --lang en           one language
 *   node batch.mjs --only platform-members
 *   node batch.mjs --plan              list the work and stop
 *
 * Each video is record → narrate → render. That is a few minutes apiece and
 * there are a lot of them, so the run is resumable: anything already in
 * `out/` is left alone unless `--force` is given. Stopping and restarting
 * costs nothing.
 *
 * English and French are narrated by Deepgram. Krio and Twi have no voice in
 * any engine available, so those are captions over the footage with no audio
 * track — chosen over reading somebody English in place of their own language.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listFlows } from './flows/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flagOf = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

/** Languages the handbook is published in. Voice only where one exists. */
export const LANGS = [
  { code: 'en', voice: 'athena' },
  { code: 'fr', voice: 'athena' },
  { code: 'kri', voice: null },
  { code: 'tw', voice: null },
];

const only = flagOf('only');
const langFilter = flagOf('lang');
const force = has('force');

const flows = (await listFlows()).filter((f) => !only || f === only);
const langs = LANGS.filter((l) => !langFilter || l.code === langFilter);

const jobs = [];
for (const flow of flows) {
  for (const lang of langs) {
    const slug = lang.code === 'en' ? flow : `${flow}-${lang.code}`;
    jobs.push({ flow, lang, slug, out: join(HERE, 'out', `tour-${slug}.mp4`) });
  }
}

const todo = jobs.filter((j) => force || !existsSync(j.out));

console.log(`${flows.length} flows × ${langs.length} languages = ${jobs.length} videos`);
console.log(`${jobs.length - todo.length} already rendered, ${todo.length} to do\n`);

if (has('plan')) {
  for (const j of todo) console.log(`  ${j.slug.padEnd(42)} ${j.lang.voice ?? 'captions only'}`);
  process.exit(0);
}

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: HERE, stdio: 'inherit', env: process.env });

let done = 0;
let failed = 0;
const started = Date.now();

for (const job of todo) {
  const n = `${String(++done).padStart(3)}/${todo.length}`;
  const narration = join(HERE, 'narration', `${job.slug}.json`);
  console.log(`\n${'─'.repeat(70)}\n${n}  ${job.slug}`);

  if (!existsSync(narration)) {
    console.log(`  no narration script at narration/${job.slug}.json — skipped`);
    failed++;
    continue;
  }

  try {
    run('node', ['record.mjs', job.flow, '--lang', job.lang.code]);
    run('node', [
      'voice.mjs', job.slug,
      ...(job.lang.voice ? ['--voice', job.lang.voice] : ['--silent']),
    ]);
    run('node', ['render.mjs', job.slug]);
  } catch (err) {
    console.log(`  FAILED: ${err.message.split('\n')[0]}`);
    failed++;
    continue;
  }

  const mins = (Date.now() - started) / 60000;
  const rate = mins / done;
  console.log(`  ${mins.toFixed(0)}m elapsed, ~${(rate * (todo.length - done)).toFixed(0)}m left`);
}

console.log(`\n${'═'.repeat(70)}`);
console.log(`${done - failed} rendered, ${failed} failed, ${((Date.now() - started) / 60000).toFixed(0)}m total`);
