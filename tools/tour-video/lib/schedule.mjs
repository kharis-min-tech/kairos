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
 * Seconds held after the last line so the closing words are not clipped.
 * The composition appends this, so the cap has to allow for it: a clip
 * budgeted to exactly `maxSeconds` of segments came out `maxSeconds` plus the
 * gaps plus this, and every "thirty-second" section clip rendered at 32.3.
 */
export const TAIL = 2;

/**
 * @param marks    recorder marks: [{ n, start }], ordered, seconds into the capture
 * @param stops    measured narration: [{ n, duration, words, title, caption }]
 * @param capture  length of the capture in seconds
 * @param opts.maxSeconds  cap for a short section clip, trimming footage only
 * @returns one entry per stop, in timeline order
 */
export function buildSchedule(marks, stops, capture, { maxSeconds } = {}) {
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
    let captureSpan = Math.max(0, captureTo - captureFrom);

    // A short clip trims footage, never speech. Cutting a sentence in half to
    // hit a number is worse than a clip that runs two seconds over, so the
    // cap squeezes the picture down towards the length of the line and stops.
    //
    // The budget is what is left of `maxSeconds` after the gaps between stops
    // and the tail the composition appends — dividing `maxSeconds` itself by
    // the number of stops spent the whole budget on picture and then added
    // the gaps and the tail on top.
    if (maxSeconds) {
      const overhead = (ordered.length - 1) * GAP + TAIL;
      const share = Math.max(1, (maxSeconds - overhead) / ordered.length);
      captureSpan = Math.min(captureSpan, Math.max(share, stop.duration));
    }

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

  // The timeline is the video. An earlier version took the longer of this
  // and the capture, which pinned every clip to the full recording — sign-in
  // included — and turned a thirty-second section clip into eighty seconds
  // that opened on a login screen.
  return { segments: out, duration: Math.max(0, timeline - GAP) };
}
