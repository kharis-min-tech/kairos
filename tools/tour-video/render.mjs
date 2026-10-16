#!/usr/bin/env node
/**
 * Render one role's tour with Remotion.
 *
 *   node voice.mjs member     # first: narration + word timings from Deepgram
 *   node render.mjs member    # then: the video
 *
 * Expects, relative to this folder:
 *   public/capture/<role>.webm   the screen capture from the Playwright run
 *   public/voice/<role>/NN.wav   narration, written by voice.mjs
 *   timings/<role>.json          durations and word times, written by voice.mjs
 *   marks-<role>.json            the recorder's stop offsets into the capture
 *
 * The recorder's marks say where in the capture each stop appears; the
 * timings say how long saying it takes. `buildSchedule` reconciles the two by
 * holding the picture wherever the sentence outlasts the footage, so a line
 * can never end up describing a page the capture has already left.
 *
 * No credential is involved here — this step reads files voice.mjs produced.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSchedule } from './lib/schedule.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const role = process.argv[2];

if (!role) {
  console.error('usage: node render.mjs <member|leader|admin>');
  process.exit(1);
}

const marksPath = join(HERE, `marks-${role}.json`);
const timingsPath = join(HERE, 'timings', `${role}.json`);
const capture = join(HERE, 'public', 'capture', `${role}.webm`);

for (const [label, path, fix] of [
  ['timeline', marksPath, 'run the recorder'],
  ['timings', timingsPath, `run: node voice.mjs ${role}`],
  ['capture', capture, 'run the recorder'],
]) {
  if (!existsSync(path)) {
    console.error(`missing ${label}: ${path}\n  → ${fix}`);
    process.exit(1);
  }
}

const { marks } = JSON.parse(readFileSync(marksPath, 'utf8'));
const { stops } = JSON.parse(readFileSync(timingsPath, 'utf8'));

// Trust the file on disk over whatever the recorder believed at the time.
const captureDuration = parseFloat(
  execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', capture,
  ]).toString().trim(),
);

const { segments, duration } = buildSchedule(marks, stops, captureDuration);

const props = { role, video: `capture/${role}.webm`, segments, duration };

mkdirSync(join(HERE, 'out'), { recursive: true });
const out = join(HERE, 'out', `tour-${role}.mp4`);

const held = segments.reduce((n, s) => n + s.hold, 0);
const words = segments.reduce((n, s) => n + s.words.length, 0);
console.log(
  `${role}: ${segments.length} stops, capture ${captureDuration.toFixed(1)}s, ` +
  `narration ${segments.reduce((n, s) => n + s.spoken, 0).toFixed(1)}s, ` +
  `${held.toFixed(1)}s held, ${words} caption words, final ${duration.toFixed(1)}s`,
);

execFileSync(
  'npx',
  [
    'remotion', 'render', 'src/index.ts', 'Tour', out,
    '--props', JSON.stringify(props),
    '--codec', 'h264',
    '--crf', '21',
    '--audio-bitrate', '192k',
    '--log', 'info',
  ],
  { cwd: HERE, stdio: 'inherit' },
);

console.log(`\nwrote ${out}`);
