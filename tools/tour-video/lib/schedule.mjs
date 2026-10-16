/**
 * Fit the screen capture to the narration.
 *
 * The recorder timestamps each stop as it performs it, which says *where in
 * the capture* the thing being described is on screen. The narration says
 * *how long* describing it takes. Those two rarely agree: a line that reads
 * in four seconds can sit over a page that was on screen for two.
 *
 * The old pipeline placed the audio at the recorder's mark and let the
 * mismatch fall where it may — a line could still be talking about the
 * members list while the capture had moved on to attendance.
 *
 * Here the capture is cut into one segment per stop and each segment holds
 * its last frame for however long the narration overruns it. Nothing is sped
 * up and nothing is clipped: the picture waits for the sentence to finish.
 */

/** Silence between stops, so lines do not run into each other. */
export const GAP = 0.35;

/**
 * @param marks    recorder marks: [{ n, start }], ordered, seconds into the capture
 * @param stops    measured narration: [{ n, duration, words, title, caption }]
 * @param capture  length of the capture in seconds
 * @returns one entry per stop, in timeline order
 */
export function buildSchedule(marks, stops, capture) {
  const byN = new Map(stops.map((s) => [s.n, s]));
  const ordered = [...marks].sort((a, b) => a.start - b.start);

  const out = [];
  let timeline = 0;

  for (let i = 0; i < ordered.length; i++) {
    const mark = ordered[i];
    const stop = byN.get(mark.n);
    if (!stop) continue;

    // How much capture this stop owns: up to the next mark, or to the end.
    const captureFrom = mark.start;
    const captureTo = ordered[i + 1]?.start ?? capture;
    const captureSpan = Math.max(0, captureTo - captureFrom);

    // The segment lasts as long as whichever is longer, then a breath.
    const spoken = stop.duration;
    const span = Math.max(captureSpan, spoken);

    out.push({
      n: stop.n,
      title: stop.title,
      caption: stop.caption,
      audio: stop.file,
      /** Where this segment begins on the finished timeline. */
      at: timeline,
      /** How long it lasts, including any held frame. */
      span,
      /** Where to seek into the capture, and how much of it actually plays. */
      captureFrom,
      capturePlays: captureSpan,
      /** Still frame held after the capture runs out, so the line can finish. */
      hold: Math.max(0, spoken - captureSpan),
      spoken,
      /** Word times, shifted from audio-relative to timeline-absolute. */
      words: (stop.words ?? []).map((w) => ({
        word: w.word,
        start: timeline + w.start,
        end: timeline + w.end,
      })),
    });

    timeline += span + GAP;
  }

  return { segments: out, duration: Math.max(timeline, capture) };
}
