#!/usr/bin/env node
/**
 * Turn a narration script into spoken audio and per-word caption timings.
 *
 *   node voice.mjs member
 *   node voice.mjs member --voice draco
 *   node voice.mjs member --only 3        # just re-do stop 3 after a reword
 *
 * Reads  narration/<role>.json
 * Writes public/voice/<role>/NN.wav      one file per stop, 24 kHz linear16
 *        timings/<role>.json             every stop's duration and word times
 *
 * The timings file is what lets the video follow the voice rather than the
 * other way round. Each stop's length is whatever Deepgram actually spoke,
 * measured from the audio, so rewording a line reflows the video without
 * anybody re-timing it by hand.
 *
 * Needs DEEPGRAM_API_KEY. The key is read from the environment inside
 * lib/deepgram.mjs and is never written to either output.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { speak, transcribe, VOICES, DEFAULT_VOICE } from './lib/deepgram.mjs';
import { alignWords, alignmentConfidence } from './lib/align.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const role = argv.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

if (!role) {
  console.error('usage: node voice.mjs <role> [--voice athena|draco] [--only N]');
  process.exit(1);
}

const scriptPath = join(HERE, 'narration', `${role}.json`);
if (!existsSync(scriptPath)) {
  console.error(`no narration script at ${scriptPath}`);
  process.exit(1);
}

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
const voiceName = flag('voice') ?? script.voice;
const voice = VOICES[voiceName] ?? (voiceName?.startsWith('aura-') ? voiceName : DEFAULT_VOICE);
const only = flag('only') ? Number(flag('only')) : undefined;

const voiceDir = join(HERE, 'public', 'voice', role);
const timingsDir = join(HERE, 'timings');
mkdirSync(voiceDir, { recursive: true });
mkdirSync(timingsDir, { recursive: true });

const timingsPath = join(timingsDir, `${role}.json`);
const previous = existsSync(timingsPath)
  ? JSON.parse(readFileSync(timingsPath, 'utf8'))
  : { role, voice: voiceName ?? 'athena', stops: [] };

console.log(`${role}: ${script.stops.length} stops, voice ${voice}`);

const stops = [];
for (const stop of script.stops) {
  const name = `${String(stop.n).padStart(2, '0')}.wav`;
  const file = join(voiceDir, name);

  if (only !== undefined && stop.n !== only) {
    const kept = previous.stops.find((s) => s.n === stop.n);
    if (kept) {
      stops.push(kept);
      continue;
    }
  }

  process.stdout.write(`  ${String(stop.n).padStart(2)} ${stop.title.slice(0, 44).padEnd(46)}`);

  const wav = await speak(stop.speech, { voice });
  writeFileSync(file, wav);

  // Transcribing audio we just generated is not as circular as it looks: the
  // words are known, their position in time is not, and that is what puts a
  // caption on the word instead of near it.
  //
  // Only the timing is taken from the transcript. The words shown come from
  // the script, so a mishearing can shift a caption slightly but can never
  // put a word on screen that nobody said.
  const { words: heard, duration } = await transcribe(wav);
  const words = alignWords(stop.speech, heard, duration);
  const confidence = alignmentConfidence(words);

  stops.push({
    n: stop.n,
    title: stop.title,
    caption: stop.caption,
    file: `voice/${role}/${name}`,
    duration,
    words,
  });

  const warn = confidence < 0.9 ? `  ⚠ ${Math.round(confidence * 100)}% aligned` : '';
  console.log(`${duration.toFixed(2)}s  ${words.length} words${warn}`);
}

writeFileSync(
  timingsPath,
  `${JSON.stringify({ role, voice: voiceName ?? 'athena', stops }, null, 2)}\n`,
);

const total = stops.reduce((n, s) => n + s.duration, 0);
console.log(`\nwrote ${stops.length} files to public/voice/${role}/`);
console.log(`wrote timings/${role}.json  (${total.toFixed(1)}s of narration)`);
