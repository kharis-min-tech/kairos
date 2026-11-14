#!/usr/bin/env node
/**
 * Prove the Deepgram key works, without showing it to anybody.
 *
 *   node check-deepgram.mjs
 *
 * Speaks one short sentence, transcribes it back, and reports what came
 * through. The key is never printed and never written to disk; the only
 * things that leave this script are a duration, a word count and whether the
 * round trip matched.
 *
 * Costs a few seconds of TTS and STT. Run it after setting the key, and
 * after any Deepgram change, before committing to a full render.
 */
import { speak, transcribe, readKey, VOICES, SAMPLE_RATE } from './lib/deepgram.mjs';

const LINE = 'Kairos brings every branch of the church into one place.';

try {
  readKey();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
console.log('✓ DEEPGRAM_API_KEY found in the environment (value not shown)');

const voice = process.argv[2] ?? 'athena';
const model = VOICES[voice] ?? voice;

console.log(`\n→ speaking with ${model} at ${SAMPLE_RATE} Hz…`);
let wav;
try {
  wav = await speak(LINE, { voice: model });
} catch (err) {
  console.error(`✗ text-to-speech failed: ${err.message}`);
  process.exit(1);
}
console.log(`✓ ${(wav.length / 1024).toFixed(0)} KB of WAV came back`);

console.log('\n→ transcribing it back for word timings…');
let result;
try {
  result = await transcribe(wav);
} catch (err) {
  console.error(`✗ transcription failed: ${err.message}`);
  process.exit(1);
}

console.log(`✓ ${result.duration.toFixed(2)}s, ${result.words.length} words`);
console.log(`  heard: ${result.transcript}`);
if (result.words.length) {
  const w = result.words[0];
  const last = result.words.at(-1);
  console.log(`  first word "${w.word}" at ${w.start.toFixed(2)}s, last "${last.word}" ends ${last.end.toFixed(2)}s`);
}

// Loose comparison: Deepgram punctuates and capitalises, so compare the words.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
const want = norm(LINE);
const got = norm(result.transcript);
const same = want.length === got.length && want.every((w, i) => w === got[i]);
console.log(`\n${same ? '✓ round trip matched the script' : '⚠ transcript differs from the script — check the voice and language'}`);
process.exit(same ? 0 : 1);
