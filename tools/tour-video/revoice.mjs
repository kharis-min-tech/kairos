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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOICE_FOR_LANG, DUB_FROM } from './lib/deepgram.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const plan = argv.includes('--plan');
const force = argv.includes('--force');

/**
 * Already done, and done with the voice we are asking for.
 *
 * A sleeping laptop wedged a Remotion render for five and a half hours and
 * the whole queue sat behind it; restarting then meant redoing 26 clips that
 * were already correct. A pass is now resumable: a clip whose timings record
 * the target voice, and whose video is newer than those timings, is left
 * alone unless --force says otherwise.
 */
const alreadyDone = (slug, voice) => {
  if (force) return false;
  const t = join(HERE, 'timings', `${slug}.json`);
  const v = join(HERE, 'out', `tour-${slug}.mp4`);
  if (!existsSync(t) || !existsSync(v)) return false;
  try {
    const timings = JSON.parse(readFileSync(t, 'utf8'));
    if (timings.voice !== voice) return false;

    // A dubbed clip and one voiced in its own language record the same voice,
    // so the voice alone cannot tell them apart. voice.mjs writes which
    // script it spoke; an older file without the field predates dubbing and
    // is redone. Inferring this from `approximate` would have been wrong:
    // that flag also means "timing was guessed", which the French clips all
    // were while they went to an English transcriber.
    const wantsDub = DUB_FROM[langOf(slug)] ?? null;
    if ((timings.dubbedFrom ?? null) !== (wantsDub ? wantsDub : null)) return false;
  } catch {
    return false;
  }
  return statSync(v).mtimeMs >= statSync(t).mtimeMs;
};
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

const todo = jobs.filter((slug) => !alreadyDone(slug, VOICE_FOR_LANG[langOf(slug)]));
const skipped = jobs.length - todo.length;

console.log(`${jobs.length} clips, ${skipped} already done, ${todo.length} to re-voice`);
for (const [lang, voice] of Object.entries(VOICE_FOR_LANG)) {
  const n = todo.filter((s) => langOf(s) === lang).length;
  if (n) console.log(`  ${lang}: ${n} in ${voice}`);
}
console.log();
if (plan) process.exit(0);

let done = 0;
const failed = [];
for (const slug of todo) {
  const voice = VOICE_FOR_LANG[langOf(slug)];
  process.stdout.write(`${String(++done).padStart(3)}/${todo.length}  ${slug.padEnd(44)}`);
  try {
    const lang = langOf(slug);
    const dub = DUB_FROM[lang];
    // The English script of the same flow: the slug without its suffix.
    const base = lang === 'en' ? slug : slug.replace(new RegExp(`-${lang}$`), '');
    // A tour renders in about ninety seconds; ten minutes means something is
    // wedged, and a wedged step used to stop the whole queue indefinitely.
    const STEP_TIMEOUT = 10 * 60 * 1000;
    execFileSync('node', [
      'voice.mjs', slug, '--voice', voice,
      ...(dub ? ['--dub', base] : []),
    ], { cwd: HERE, stdio: 'pipe', timeout: STEP_TIMEOUT });
    execFileSync('node', ['render.mjs', slug], { cwd: HERE, stdio: 'pipe', timeout: STEP_TIMEOUT });
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    failed.push(`${slug}: ${String(err.message).split('\n')[0]}`);
  }
}

console.log(`\n${done - failed.length} re-voiced${failed.length ? `, ${failed.length} failed` : ''}`);
for (const f of failed) console.log(`  ${f}`);
process.exit(failed.length ? 1 : 0);
