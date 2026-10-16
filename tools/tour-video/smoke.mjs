#!/usr/bin/env node
/**
 * Prove the render pipeline works without needing a real capture.
 *
 *   node smoke.mjs
 *
 * Builds a throwaway test pattern and two tones, renders them through the
 * same composition the real tours use, and leaves out/tour-smoke.mp4 behind.
 * Useful after a Remotion upgrade, or on a fresh machine.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { cwd: HERE });

mkdirSync(join(HERE, 'public/capture'), { recursive: true });
mkdirSync(join(HERE, 'public/voice'), { recursive: true });

ff(['-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=25:duration=6',
    '-c:v', 'libvpx', '-b:v', '1M', 'public/capture/smoke.webm']);
ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-ar', '24000', 'public/voice/01.wav']);
ff(['-f', 'lavfi', '-i', 'sine=frequency=560:duration=2', '-ar', '24000', 'public/voice/02.wav']);

writeFileSync(join(HERE, 'marks-smoke.json'), JSON.stringify({
  role: 'smoke',
  marks: [
    { n: 1, title: 'First stop', caption: 'Caption rendered by Remotion', start: 0.4, end: 3.0, audio: 2.0 },
    { n: 2, title: 'Second stop', caption: "Timed from the recorder's marks", start: 3.2, end: 6.0, audio: 2.0 },
  ],
}, null, 2));

execFileSync('node', ['render.mjs', 'smoke'], { cwd: HERE, stdio: 'inherit' });
