#!/usr/bin/env node
/**
 * Put the finished clips into the handbook.
 *
 *   node publish.mjs            copy everything rendered
 *   node publish.mjs --dry      list what would move
 *
 * Copies `out/tour-<slug>.mp4` to `apps/docs/public/clips/<slug>.mp4` and
 * extracts a poster frame beside it, so a page shows a still rather than a
 * black rectangle before anybody presses play.
 *
 * The videos are not in git: they are large, regenerable, and belong wherever
 * the docs site is published rather than in the repository. This is the step
 * that puts them where a build will pick them up.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const DEST = join(HERE, '..', '..', 'apps', 'docs', 'public', 'clips');
const dry = process.argv.includes('--dry');

if (!existsSync(OUT)) {
  console.error('nothing rendered yet');
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

const clips = readdirSync(OUT)
  .filter((f) => f.startsWith('tour-') && f.endsWith('.mp4') && f !== 'tour-smoke.mp4')
  .sort();

let copied = 0;
let posters = 0;
let bytes = 0;

for (const file of clips) {
  const slug = file.replace(/^tour-/, '').replace(/\.mp4$/, '');
  const from = join(OUT, file);
  const to = join(DEST, `${slug}.mp4`);
  const poster = join(DEST, `${slug}.jpg`);

  const src = statSync(from);
  const fresh = !existsSync(to) || statSync(to).mtimeMs < src.mtimeMs;
  if (!fresh) continue;

  bytes += src.size;
  if (dry) {
    console.log(`  ${slug.padEnd(44)} ${(src.size / 1e6).toFixed(1)} MB`);
    copied++;
    continue;
  }

  copyFileSync(from, to);
  copied++;

  // A frame from a little way in: the first second is a fade from the
  // background colour, which makes a poster of nothing.
  try {
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', '-ss', '3', '-i', to,
      '-frames:v', '1', '-q:v', '4', poster,
    ]);
    posters++;
  } catch {
    // A clip shorter than the seek point still publishes; it just opens black.
  }
}

console.log(
  dry
    ? `\n${copied} clips would be published (${(bytes / 1e6).toFixed(0)} MB)`
    : `published ${copied} clips and ${posters} posters to apps/docs/public/clips/ (${(bytes / 1e6).toFixed(0)} MB)`,
);
