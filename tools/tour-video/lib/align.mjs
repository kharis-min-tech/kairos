/**
 * Put the script's words on Deepgram's clock.
 *
 * Transcribing audio we generated gives excellent timings and imperfect
 * words: the first test run heard "every bridge of the church" for "every
 * branch of the church". Church vocabulary — branch, fellowship, Kairos,
 * Kharis — is exactly what a general model guesses at, and a caption that
 * says "bridge" is worse than no caption.
 *
 * The fix is to take only the timing from the transcript. The words come from
 * the script, which is what was actually spoken and what the writer intended.
 * Alignment is by position, with a small amount of give where Deepgram split
 * or merged a token.
 */

/** Compare loosely: case, punctuation and hyphens are not differences. */
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * @param script  the line as written
 * @param heard   Deepgram's words: [{ word, start, end }]
 * @param total   the audio's length in seconds, for the final fallback
 * @returns the script's words, each with a start and end
 */
export function alignWords(script, heard, total) {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Nothing came back: spread the words evenly rather than lose the caption.
  if (heard.length === 0) {
    const each = total / words.length;
    return words.map((word, i) => ({
      word,
      start: i * each,
      end: (i + 1) * each,
      approximate: true,
    }));
  }

  // Walk both lists together. A matching word takes its own timing; a word
  // Deepgram missed or misheard borrows the span between its neighbours, so
  // the caption keeps moving at the right pace through the uncertain patch.
  const out = [];
  let h = 0;

  for (let i = 0; i < words.length; i++) {
    const want = norm(words[i]);
    let matched = -1;

    // Look a couple of tokens ahead: Deepgram sometimes splits a hyphenated
    // word in two, or merges a number with its unit.
    for (let look = h; look < Math.min(h + 3, heard.length); look++) {
      const got = norm(heard[look].word);
      if (got && (got === want || got.startsWith(want) || want.startsWith(got))) {
        matched = look;
        break;
      }
    }

    if (matched >= 0) {
      out.push({ word: words[i], start: heard[matched].start, end: heard[matched].end });
      h = matched + 1;
    } else {
      // Unknown: sit between the last word placed and whatever comes next.
      const prevEnd = out.at(-1)?.end ?? 0;
      const nextStart = heard[h]?.start ?? total;
      const span = Math.max(0.08, (nextStart - prevEnd) / 2);
      out.push({ word: words[i], start: prevEnd, end: prevEnd + span, approximate: true });
    }
  }

  // Never let a caption word start before the one before it ended.
  for (let i = 1; i < out.length; i++) {
    if (out[i].start < out[i - 1].end) out[i].start = out[i - 1].end;
    if (out[i].end < out[i].start) out[i].end = out[i].start + 0.08;
  }

  return out;
}

/** How much of the script Deepgram actually recognised, 0..1. */
export function alignmentConfidence(aligned) {
  if (aligned.length === 0) return 1;
  const guessed = aligned.filter((w) => w.approximate).length;
  return 1 - guessed / aligned.length;
}
