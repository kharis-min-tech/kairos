#!/usr/bin/env node
/**
 * Re-synthesise and re-render the narrated clips.
 *
 *   node revoice.mjs            every en and fr clip
 *   node revoice.mjs --lang fr  one language
 *   node revoice.mjs --plan     list what would be redone
 *
 * For when the voice changes rather than the recording. The captures on disk
 * are still good, so this skips the browser entirely: Deepgram speaks the
 * script again, transcribes it for word times, and the composition is
 * re-rendered around the new timings.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOICE_FOR_LANG } from './lib/deepgram.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const plan = argv.includes('--plan');
const only = argv.indexOf('--lang') >= 0 ? argv[argv.indexOf('--lang') + 1] : null;

/** 'platform-members-fr' -> 'fr'; no suffix means English. */
const langOf = (slug) => (/-(fr|kri|tw)$/.exec(slug)?.[1] ?? 'en');

const jobs = readdirSync(HERE)
  .filter((f) => f.startsWith('marks-') && f.endsWith('.json'))
  .map((f) => f.slice('marks-'.length, -'.json'.length))
  .filter((slug) => slug !== 'smoke')
  .filter((slug) => VOICE_FOR_LANG[langOf(slug)])          // narrated languages only
  .filter((slug) => !only || langOf(slug) === only)
  .filter((slug) => existsSync(join(HERE, 'public', 'capture', `${slug}.webm`)))
  .sort();

if (!jobs.length) {
  console.error('nothing to do');
  process.exit(1);
}

console.log(`${jobs.length} clips to re-voice`);
for (const [lang, voice] of Object.entries(VOICE_FOR_LANG)) {
  const n = jobs.filter((s) => langOf(s) === lang).length;
  if (n) console.log(`  ${lang}: ${n} in ${voice}`);
}
console.log();
if (plan) process.exit(0);

let done = 0;
const failed = [];
for (const slug of jobs) {
  const voice = VOICE_FOR_LANG[langOf(slug)];
  process.stdout.write(`${String(++done).padStart(3)}/${jobs.length}  ${slug.padEnd(44)}`);
  try {
    execFileSync('node', ['voice.mjs', slug, '--voice', voice], { cwd: HERE, stdio: 'pipe' });
    execFileSync('node', ['render.mjs', slug], { cwd: HERE, stdio: 'pipe' });
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    failed.push(`${slug}: ${String(err.message).split('\n')[0]}`);
  }
}

console.log(`\n${done - failed.length} re-voiced${failed.length ? `, ${failed.length} failed` : ''}`);
for (const f of failed) console.log(`  ${f}`);
process.exit(failed.length ? 1 : 0);
