/**
 * Caption timings when the words on screen are not the words being spoken.
 *
 * Two cases use this. A language with no audio at all, where the pace has to
 * be guessed; and a dubbed language — Krio and Twi are narrated in English,
 * so the audio is one language and the subtitle another. Their word counts
 * do not match, so no caption word can be pinned to a spoken word; they are
 * spread across the line instead.
 *
 * Either way the weighting is reading-paced rather than speech-paced: a
 * caption has to be on screen long enough to read, and a long word earns
 * more of the line than a short one.
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

/**
 * The same weighting, but stretched to fit audio whose length is already
 * known — the dubbed case, where English is being spoken over a Krio or Twi
 * subtitle. The caption tracks the sentence rather than the word, which is
 * the most honest thing it can do when the two languages do not line up.
 */
export function spreadWords(text, duration) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || !(duration > 0)) return [];

  const weights = words.map((w) => Math.max(MIN_WORD, w.length * 0.055 + 0.12));
  const total = weights.reduce((a, b) => a + b, 0);
  const scale = duration / total;

  let t = 0;
  return words.map((word, i) => {
    const span = weights[i] * scale;
    const entry = { word, start: t, end: Math.min(duration, t + span), approximate: true };
    t += span;
    return entry;
  });
}
