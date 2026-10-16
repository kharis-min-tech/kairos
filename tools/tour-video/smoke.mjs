#!/usr/bin/env node
/**
 * Prove the render pipeline works, with no capture, no app and no API key.
 *
 *   node smoke.mjs
 *
 * Builds a throwaway test pattern and two tones, invents timings of the shape
 * voice.mjs writes, renders them through the same composition the real tours
 * use, and leaves out/tour-smoke.mp4 behind.
 *
 * Deliberately offline: this has to stay runnable on a fresh machine and in
 * CI, where there is no Deepgram key and should not need to be one. Use
 * check-deepgram.mjs to test the key itself.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { cwd: HERE });

mkdirSync(join(HERE, 'public/capture'), { recursive: true });
mkdirSync(join(HERE, 'public/voice/smoke'), { recursive: true });
mkdirSync(join(HERE, 'timings'), { recursive: true });

ff(['-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=25:duration=6',
    '-c:v', 'libvpx', '-b:v', '1M', 'public/capture/smoke.webm']);
ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-ar', '24000', 'public/voice/smoke/01.wav']);
ff(['-f', 'lavfi', '-i', 'sine=frequency=560:duration=3', '-ar', '24000', 'public/voice/smoke/02.wav']);

writeFileSync(join(HERE, 'marks-smoke.json'), `${JSON.stringify({
  role: 'smoke',
  marks: [{ n: 1, start: 0.4 }, { n: 2, start: 3.2 }],
}, null, 2)}\n`);

// What voice.mjs would have written. The second line runs three seconds over
// a capture that only has one left, so the smoke test also exercises the
// held frame rather than only the happy path.
const words = (text, from, each) =>
  text.split(' ').map((word, i) => ({
    word,
    start: from + i * each,
    end: from + (i + 1) * each - 0.02,
  }));

writeFileSync(join(HERE, 'timings', 'smoke.json'), `${JSON.stringify({
  role: 'smoke',
  voice: 'athena',
  stops: [
    {
      n: 1,
      title: 'First stop',
      caption: 'Caption rendered by Remotion',
      file: 'voice/smoke/01.wav',
      duration: 2,
      words: words('Captions are placed on the word', 0.05, 0.3),
    },
    {
      n: 2,
      title: 'Second stop',
      caption: 'Timed from the narration, not the stopwatch',
      file: 'voice/smoke/02.wav',
      duration: 3,
      words: words('The picture waits for the sentence to finish', 0.05, 0.33),
    },
  ],
}, null, 2)}\n`);

execFileSync('node', ['render.mjs', 'smoke'], { cwd: HERE, stdio: 'inherit' });
