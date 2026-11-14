/**
 * Deepgram, for the tour narration and its captions.
 *
 * ## Where the key lives
 *
 * `DEEPGRAM_API_KEY`, read from the environment at call time and nowhere else.
 * It is never written to a file this tool produces, never passed to Remotion
 * as a prop, never printed, and never included in an error message — a failed
 * request reports the status and Deepgram's own message, not the credential
 * that made it. There is no browser anywhere in this path: these scripts are
 * Node CLIs that write WAVs and JSON to disk, so the key has no route to a
 * frontend to leak through.
 *
 * Set it in `tools/tour-video/.env`, which the root .gitignore already covers.
 *
 * ## Why Deepgram rather than what was here
 *
 * The narration was Kokoro, run locally. Deepgram's Aura-2 gives a British
 * voice that carries a training video better, and — the part that actually
 * changes the pipeline — the same vendor will transcribe that generated audio
 * back with per-word timings. The captions stop being placed by hand against
 * the recorder's stopwatch and start being placed on the word.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/**
 * The voices, per language.
 *
 * A voice speaks one language. Pointing an English voice at French text does
 * not give a French accent, it gives an American reading French words — which
 * is what the French clips sounded like until Agathe replaced Athena there.
 *
 * Krio and Twi have no voice in Deepgram's catalogue. They are narrated in
 * Athena by explicit choice: an English voice reading Krio or Twi mispronounces
 * it, and Krio — being English-based — fares better than Twi. The subtitles
 * are always the real language, because the captions come from the script and
 * never from what the voice was heard to say. Set either back to `null` here
 * and that language returns to captions over silence.
 */
export const VOICES = {
  // en-GB
  pandora: 'aura-2-pandora-en',
  draco: 'aura-2-draco-en',
  // en-US
  athena: 'aura-2-athena-en',
  // fr-FR
  agathe: 'aura-2-agathe-fr',
  hector: 'aura-2-hector-fr',
};

/** The voice each language is read in. `null` means captions over silence. */
export const VOICE_FOR_LANG = {
  en: VOICES.athena,
  // Hector rather than Agathe: Deepgram has exactly two French voices in a
  // catalogue of 103, and Agathe was the one that read as mechanical. The
  // French scripts were also repunctuated at the same time — Aura takes its
  // phrasing from the commas, and a run of short unbroken clauses is most of
  // what makes any of these voices sound like a machine.
  fr: VOICES.hector,
  kri: VOICES.athena,
  tw: VOICES.athena,
};

/**
 * Languages whose audio is another language's script.
 *
 * Deepgram has no Krio or Twi voice, and an English voice reading Krio aloud
 * mispronounces it. So those clips are narrated in English and subtitled in
 * the reader's language — ordinary subtitling. The captions are never
 * translated from the audio; both come from their own narration table, so
 * they say the same thing in two languages.
 */
export const DUB_FROM = { kri: 'en', tw: 'en' };

export const DEFAULT_VOICE = VOICES.athena;

/**
 * 24 kHz linear16. Deepgram accepts 8/16/24/32/48 kHz for linear16 and wraps
 * it in a WAV container by default, which is what Remotion's <Audio> wants.
 */
export const SAMPLE_RATE = 24000;

/**
 * Load `.env` from this tool's folder if the variable is not already set.
 *
 * Deliberately minimal: it reads `KEY=value` lines and does not expand or
 * interpolate anything, so nothing in the file can be made to execute.
 */
function loadDotEnv() {
  if (process.env.DEEPGRAM_API_KEY) return;
  const file = join(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const name = line.slice(0, eq).trim();
    if (process.env[name]) continue;
    process.env[name] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
}

/**
 * The key, or a message saying how to set it.
 *
 * The error names the variable and the file and stops there. It does not
 * report what it found, because "expected a key, got sk-abc…" is how a
 * credential ends up in a terminal history or a CI log.
 */
export function readKey() {
  loadDotEnv();
  const key = process.env.DEEPGRAM_API_KEY;
  if (typeof key === 'string' && key.trim().length > 0) return key.trim();
  throw new Error(
    'DEEPGRAM_API_KEY is not set.\n' +
      '  Put it in tools/tour-video/.env (gitignored) as:\n' +
      '    DEEPGRAM_API_KEY=<your key>\n' +
      '  or export it in the shell before running this script.',
  );
}

/** True if a key is available, without revealing anything about it. */
export function hasKey() {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
}

async function failure(res) {
  let detail = '';
  try {
    const body = await res.text();
    detail = body.slice(0, 400);
  } catch {
    /* a body we cannot read is not worth failing twice over */
  }
  return new Error(`Deepgram ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
}

/**
 * Speak `text`, returning WAV bytes.
 *
 * Deepgram caps a single /v1/speak request, so a long line is split on
 * sentence boundaries and the parts are concatenated. Splitting mid-sentence
 * would put an audible seam in the middle of a clause.
 */
export async function speak(text, { voice = DEFAULT_VOICE, signal } = {}) {
  const key = readKey();
  const chunks = splitForSpeech(text);
  const parts = [];

  for (const chunk of chunks) {
    const url =
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}` +
      `&encoding=linear16&sample_rate=${SAMPLE_RATE}&container=wav`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk }),
      signal,
    });
    if (!res.ok) throw await failure(res);
    parts.push(Buffer.from(await res.arrayBuffer()));
  }

  return parts.length === 1 ? parts[0] : concatWav(parts);
}

/**
 * Transcribe WAV bytes, returning the words with their start and end times.
 *
 * This is run over audio Deepgram itself just produced, which sounds circular
 * until you want a caption to light up on the word being said. The script text
 * is already known; what is not known is where each word lands in time, to the
 * millisecond, and that is what comes back here.
 */
/**
 * Vocabulary a general model mishears. The first test run returned "every
 * bridge of the church" for "every branch of the church"; these are boosted
 * so the timings land on the right tokens. Nova-3 takes one `keyterm` per
 * occurrence rather than a list.
 */
export const KEYTERMS = [
  'Kairos', 'Kharis', 'branch', 'branches', 'fellowship', 'fellowships',
  'department', 'departments', 'pastor', 'safeguarding', 'discipleship',
  'K-Group', 'rota', 'cohort', 'congregation',
];

export async function transcribe(wav, { language = 'en', keyterms = KEYTERMS, signal } = {}) {
  const key = readKey();
  const boost = keyterms.map((t) => `&keyterm=${encodeURIComponent(t)}`).join('');
  const url =
    'https://api.deepgram.com/v1/listen?model=nova-3' +
    `&language=${encodeURIComponent(language)}` +
    '&punctuate=true&smart_format=true&utterances=true' +
    boost;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Token ${key}`, 'Content-Type': 'audio/wav' },
    body: wav,
    signal,
  });
  if (!res.ok) throw await failure(res);

  const json = await res.json();
  const alt = json?.results?.channels?.[0]?.alternatives?.[0];
  const words = (alt?.words ?? []).map((w) => ({
    word: w.punctuated_word ?? w.word,
    start: w.start,
    end: w.end,
  }));

  return {
    transcript: alt?.transcript ?? '',
    words,
    /** Audio length in seconds, as Deepgram measured it. */
    duration: json?.metadata?.duration ?? (words.at(-1)?.end ?? 0),
  };
}

/** Split on sentence ends, keeping each part under Deepgram's request limit. */
export function splitForSpeech(text, limit = 1800) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const out = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > limit && current) {
      out.push(current.trim());
      current = '';
    }
    current += s;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Join several WAVs into one.
 *
 * Every part comes from the same endpoint with the same encoding and sample
 * rate, so the payloads can be concatenated behind the first part's header
 * once the two length fields are corrected.
 */
export function concatWav(buffers) {
  const bodies = buffers.map((b) => {
    // Walk the RIFF chunks rather than assuming a 44-byte header: Deepgram's
    // WAV carries a LIST chunk ahead of the data on some responses, and
    // slicing a fixed 44 would paste that metadata in as audio.
    let offset = 12;
    while (offset + 8 <= b.length) {
      const id = b.toString('ascii', offset, offset + 4);
      const size = b.readUInt32LE(offset + 4);
      if (id === 'data') return b.subarray(offset + 8, offset + 8 + size);
      offset += 8 + size + (size % 2);
    }
    return b.subarray(44);
  });

  const header = Buffer.from(buffers[0].subarray(0, 44));
  const data = Buffer.concat(bodies);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  header.writeUInt32LE(36 + data.length, 4);
  return Buffer.concat([header, data]);
}

/**
 * How long a WAV runs, read from its own header.
 *
 * A dubbed clip spreads its caption across the audio rather than pinning
 * each word to a spoken one, so the only thing the transcript was giving it
 * was the length — which the file already knows. Reading it here saves a
 * Deepgram round trip per stop on every Krio and Twi clip, and the credits
 * that go with them.
 *
 * Walks the RIFF chunks for the same reason concatWav does: a fixed 44-byte
 * header is a guess that some responses break.
 */
export function wavDuration(buf) {
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(offset + 16);
    if (id === 'data') {
      // Deepgram streams its WAV, so the data chunk carries a placeholder
      // length of 0x7FFFF000 rather than the real one — believing it gives a
      // twelve-hour clip. What is actually in the file is the truth.
      const real = Math.min(size, buf.length - (offset + 8));
      return byteRate > 0 ? real / byteRate : 0;
    }
    offset += 8 + size + (size % 2);
  }
  return 0;
}
