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

// `maxSeconds` comes from the flow that was recorded: a section clip caps
// itself, a role tour runs as long as it needs to.
// `gestures` is where the camera aims: captures recorded before the recorder
// logged them simply have none, and those clips render with a centred push-in
// and no click punches rather than failing.
const { marks, maxSeconds, gestures = [] } = JSON.parse(readFileSync(marksPath, 'utf8'));
const { stops } = JSON.parse(readFileSync(timingsPath, 'utf8'));

// Trust the file on disk over whatever the recorder believed at the time.
const captureDuration = parseFloat(
  execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', capture,
  ]).toString().trim(),
);

const { segments, duration, over } = buildSchedule(marks, stops, captureDuration, {
  maxSeconds,
  gestures,
});

// The lower third's step counter is the one piece of chrome the narration
// does not cover, so the composition needs to know the language too.
const lang = /-(fr|kri|tw)$/.exec(role)?.[1] ?? 'en';

const props = { role, lang, video: `capture/${role}.webm`, segments, duration };

mkdirSync(join(HERE, 'out'), { recursive: true });
const out = join(HERE, 'out', `tour-${role}.mp4`);

const held = segments.reduce((n, s) => n + s.hold, 0);
const words = segments.reduce((n, s) => n + s.words.length, 0);
const spoken = segments.reduce((n, s) => n + s.spoken, 0);
const clicks = segments.reduce((n, s) => n + s.clicks.length, 0);
const rate = segments.reduce((n, s) => n + s.rate, 0) / Math.max(1, segments.length);
// Silence is the number this pipeline got wrong for a long time, so it is
// reported on every render rather than left to be measured afterwards.
const silence = duration - spoken;
console.log(
  `${role}: ${segments.length} stops, capture ${captureDuration.toFixed(1)}s, ` +
  `narration ${spoken.toFixed(1)}s, final ${duration.toFixed(1)}s, ` +
  `silence ${silence.toFixed(1)}s (${((silence / Math.max(0.001, duration)) * 100).toFixed(0)}%), ` +
  `footage ${rate.toFixed(2)}x, ${held.toFixed(1)}s held, ` +
  `${clicks} click zooms, ${words} caption words`,
);
if (over) console.log(`  (narration alone runs ${over}s past the ${maxSeconds}s cap)`);

execFileSync(
  'npx',
  [
    'remotion', 'render', 'src/index.ts', 'Tour', out,
    '--props', JSON.stringify(props),
    '--codec', 'h264',
    '--crf', '21',
    '--audio-bitrate', '192k',
    // Playwright writes a streaming VP8 webm with no seek index, so pulling a
    // frame from deep inside a long capture means decoding everything before
    // it. On the 87-second role tours that can pass Remotion's 28-second
    // default and fail the whole render for a frame that was merely slow.
    '--timeout', '180000',
    '--log', 'info',
  ],
  { cwd: HERE, stdio: 'inherit' },
);

console.log(`\nwrote ${out}`);
