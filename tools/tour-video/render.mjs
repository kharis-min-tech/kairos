#!/usr/bin/env node
/**
 * Render one role's tour with Remotion.
 *
 *   node render.mjs member
 *
 * Expects, relative to this folder:
 *   public/capture/<role>.webm   the screen capture from the Playwright run
 *   public/voice/NN.wav          that role's narration, one file per stop
 *   marks-<role>.json            the timeline the recorder wrote
 *
 * The narration is placed at the offsets the recorder measured while it was
 * performing each step, so picture and sound cannot drift apart.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const role = process.argv[2];

if (!role) {
  console.error('usage: node render.mjs <member|leader|admin>');
  process.exit(1);
}

const marksPath = join(HERE, `marks-${role}.json`);
const capture = join(HERE, 'public', 'capture', `${role}.webm`);

for (const [label, path] of [['timeline', marksPath], ['capture', capture]]) {
  if (!existsSync(path)) {
    console.error(`missing ${label}: ${path}`);
    process.exit(1);
  }
}

const { marks } = JSON.parse(readFileSync(marksPath, 'utf8'));

// Trust the file on disk over whatever the recorder believed at the time.
const captureDuration = parseFloat(
  execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', capture,
  ]).toString().trim(),
);

const props = {
  role,
  video: `capture/${role}.webm`,
  marks,
  captureDuration,
};

mkdirSync(join(HERE, 'out'), { recursive: true });
const out = join(HERE, 'out', `tour-${role}.mp4`);

const lastLineEnds = marks.reduce((m, k) => Math.max(m, k.start + k.audio), 0);
console.log(
  `${role}: ${marks.length} stops, capture ${captureDuration.toFixed(1)}s, ` +
  `last line ends ${lastLineEnds.toFixed(1)}s`,
);

execFileSync(
  'npx',
  [
    'remotion', 'render', 'src/index.ts', 'Tour', out,
    '--props', JSON.stringify(props),
    '--codec', 'h264',
    '--crf', '21',
    // Matches the sample rate the narration was written at.
    '--audio-bitrate', '192k',
    '--log', 'info',
  ],
  { cwd: HERE, stdio: 'inherit' },
);

console.log(`\nwrote ${out}`);
