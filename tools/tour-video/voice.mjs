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

import { speak, transcribe, wavDuration, VOICES, DEFAULT_VOICE } from './lib/deepgram.mjs';
import { alignWords, alignmentConfidence } from './lib/align.mjs';
import { estimateTimings, spreadWords } from './lib/estimate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const role = argv.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

if (!role) {
  console.error(
    'usage: node voice.mjs <flow> [--voice <name|model>] [--dub <slug>] [--only N] [--silent]',
  );
  process.exit(1);
}

/**
 * A language can still be narrated with `--silent`, which writes captions
 * over no audio at all. Krio and Twi used that until they were given an
 * English voice by choice; the note below is why the option exists.
 *
 * Krio and Twi have no voice in any text-to-speech engine I can reach —
 * Deepgram's models do not cover either, and neither did Kokoro. Those clips
 * are captions over the footage with no audio track, which is what we chose
 * rather than narrating somebody's language at them in English.
 *
 * With no audio there is nothing to transcribe, so the word timings are
 * estimated from the text instead of measured.
 */
const silent = argv.includes('--silent');

const scriptPath = join(HERE, 'narration', `${role}.json`);
if (!existsSync(scriptPath)) {
  console.error(`no narration script at ${scriptPath}`);
  process.exit(1);
}

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
/**
 * `--dub <slug>` speaks that script while captioning this one. Krio and Twi
 * have no voice of their own, and an English voice reading Krio aloud
 * mispronounces it, so the audio is the English narration and the subtitle
 * stays in the reader's language — ordinary subtitling, rather than a voice
 * stumbling through an orthography it does not know.
 */
/** 'platform-members-fr' -> 'fr'; no suffix means English. */
const langOf = (slug) => (/-(fr|kri|tw)$/.exec(slug)?.[1] ?? 'en');

const dubFrom = flag('dub');
const dubScript = dubFrom
  ? JSON.parse(readFileSync(join(HERE, 'narration', `${dubFrom}.json`), 'utf8'))
  : null;

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
  : { role, voice: silent ? null : (voiceName ?? DEFAULT_VOICE), stops: [] };

console.log(
  silent
    ? `${role}: ${script.stops.length} stops, captions only (no voice for this language)`
    : `${role}: ${script.stops.length} stops, voice ${voice}`,
);

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

  if (silent) {
    const { words, duration } = estimateTimings(stop.speech);
    stops.push({
      n: stop.n,
      title: stop.title,
      caption: stop.caption,
      file: null,
      duration,
      words,
    });
    console.log(`${duration.toFixed(2)}s  ${words.length} words  (estimated)`);
    continue;
  }

  // Dubbed: the audio is the other script's sentence, the caption is this
  // one's. The two never line up word for word, so the caption is spread
  // across the line rather than pinned to a spoken word.
  const spokenText = dubScript
    ? (dubScript.stops.find((x) => x.n === stop.n)?.speech ?? stop.speech)
    : stop.speech;

  const wav = await speak(spokenText, { voice });
  writeFileSync(file, wav);

  // Transcribing audio we just generated is not as circular as it looks: the
  // words are known, their position in time is not, and that is what puts a
  // caption on the word instead of near it.
  //
  // Only the timing is taken from the transcript. The words shown come from
  // the script, so a mishearing can shift a caption slightly but can never
  // put a word on screen that nobody said.
  // Transcribe in the language that was actually spoken. This defaulted to
  // English, so French audio went to an English model, almost nothing was
  // recognised, and alignWords fell back to even spacing — every French
  // caption word was `approximate`, which is to say the word-by-word
  // highlighting was guessed rather than measured. A dubbed clip is spoken
  // in the language it is dubbed from.
  // A dubbed clip needs the length and nothing else, and the WAV knows its
  // own length — so it skips the transcription entirely.
  let duration;
  let words;
  let confidence = 1;
  if (dubScript) {
    duration = wavDuration(wav);
    words = spreadWords(stop.speech, duration);
  } else {
    const spokenLang = langOf(role);
    const heard = await transcribe(wav, { language: spokenLang });
    duration = heard.duration;
    words = alignWords(stop.speech, heard.words, duration);
    confidence = alignmentConfidence(words);
  }

  stops.push({
    n: stop.n,
    title: stop.title,
    caption: stop.caption,
    file: `voice/${role}/${name}`,
    duration,
    words,
  });

  const warn = confidence < 0.9 ? `  ⚠ ${Math.round(confidence * 100)}% aligned` : '';
  const how = dubScript ? '  (dubbed)' : '';
  console.log(`${duration.toFixed(2)}s  ${words.length} words${warn}${how}`);
}

writeFileSync(
  timingsPath,
  `${JSON.stringify({ role, voice: silent ? null : (voiceName ?? DEFAULT_VOICE), dubbedFrom: dubFrom ? langOf(dubFrom) : null, stops }, null, 2)}\n`,
);

const total = stops.reduce((n, s) => n + s.duration, 0);
console.log(
  silent
    ? `\nno audio written — this language has no voice`
    : `\nwrote ${stops.length} files to public/voice/${role}/`,
);
console.log(`wrote timings/${role}.json  (${total.toFixed(1)}s of narration)`);
