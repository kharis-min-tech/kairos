#!/usr/bin/env node
/**
 * Re-render every clip that already has a capture and a voice track.
 *
 *   node rerender.mjs          re-render them all
 *   node rerender.mjs --plan   list what would be re-rendered
 *
 * `batch.mjs` always records and re-synthesises before it renders, which is
 * the right default — but when only the composition or the scheduler changes,
 * the captures and the Deepgram audio on disk are still good. This re-runs
 * the last step alone: no browser, no Deepgram, no credits.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const plan = process.argv.includes('--plan');

const slugs = readdirSync(HERE)
  .filter((f) => f.startsWith('marks-') && f.endsWith('.json'))
  .map((f) => f.slice('marks-'.length, -'.json'.length))
  // `smoke` is the pipeline's own test clip, not a handbook video.
  .filter((slug) => slug !== 'smoke')
  .filter((slug) =>
    existsSync(join(HERE, 'timings', `${slug}.json`)) &&
    existsSync(join(HERE, 'public', 'capture', `${slug}.webm`)))
  .sort();

if (!slugs.length) {
  console.error('nothing to re-render: no slug has both a capture and timings');
  process.exit(1);
}

console.log(`${slugs.length} clips can be re-rendered from what is already on disk\n`);
if (plan) {
  for (const s of slugs) console.log(`  ${s}`);
  process.exit(0);
}

let done = 0;
const failed = [];
for (const slug of slugs) {
  process.stdout.write(`${String(++done).padStart(3)}/${slugs.length}  ${slug.padEnd(46)}`);
  try {
    execFileSync('node', ['render.mjs', slug], { cwd: HERE, stdio: 'pipe' });
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    failed.push(`${slug}: ${String(err.message).split('\n')[0]}`);
  }
}

console.log(`\n${done - failed.length} re-rendered${failed.length ? `, ${failed.length} failed` : ''}`);
for (const f of failed) console.log(`  ${f}`);
process.exit(failed.length ? 1 : 0);
