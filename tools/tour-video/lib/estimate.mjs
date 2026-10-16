/**
 * Caption timings for a language with no voice.
 *
 * Krio and Twi have no text-to-speech model in Deepgram, and had none in
 * Kokoro either. Their clips carry captions over the footage and no audio,
 * so there is nothing to transcribe and the timings have to be estimated.
 *
 * The estimate is deliberately reading-paced rather than speech-paced: a
 * caption nobody is hearing has to be on screen long enough to read, and a
 * long word earns more of the line than a short one.
 */

/** Words per minute a caption can comfortably be read at. */
const WPM = 150;
/** Floor, so a one-letter word is still legible. */
const MIN_WORD = 0.16;

export function estimateTimings(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { words: [], duration: 0 };

  // Weight by length so "safeguarding" holds longer than "a", then scale the
  // whole line so it averages out at a readable pace.
  const weights = words.map((w) => Math.max(MIN_WORD, w.length * 0.055 + 0.12));
  const total = weights.reduce((a, b) => a + b, 0);
  const target = (words.length / WPM) * 60;
  const scale = target / total;

  let t = 0;
  const out = words.map((word, i) => {
    const span = weights[i] * scale;
    const entry = { word, start: t, end: t + span, approximate: true };
    t += span;
    return entry;
  });

  // A beat at the end so the last word is not cut as the clip changes.
  return { words: out, duration: t + 0.5 };
}
