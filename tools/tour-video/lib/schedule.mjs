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

  // A short clip trims footage, never speech. Cutting a sentence in half to
  // hit a number is worse than a clip that runs two seconds over.
  //
  // Dividing the budget into equal shares was not enough. A stop whose line
  // runs past its share takes the length it needs, while the others sit
  // padded out to a share they do not use — so one talkative stop pushed the
  // whole clip over while four seconds of pure picture sat beside it doing
  // nothing. Eleven clips came out between 30.1 and 35 seconds that way.
  //
  // So: every stop is first given exactly as long as its line, and what is
  // left of the budget is then poured over the stops that still have footage
  // to show, a level at a time, until it runs out or they are full. A long
  // line borrows the slack from a short one, and nothing is ever clipped.
  const budget = new Map();
  if (maxSeconds) {
    const live = ordered
      .map((m, i) => {
        const stop = byN.get(m.n);
        if (!stop) return null;
        const to = ordered[i + 1]?.start ?? capture;
        return { n: m.n, spoken: stop.duration, room: Math.max(0, to - m.start) };
      })
      .filter(Boolean);

    const overhead = Math.max(0, live.length - 1) * GAP + TAIL;
    let spare = maxSeconds - overhead - live.reduce((n, s) => n + s.spoken, 0);

    for (const s of live) budget.set(s.n, Math.min(s.room, s.spoken));

    // Water-filling: share what is spare between the stops that can still use
    // it, and go round again with whatever they could not take.
    let open = live.filter((s) => s.room > budget.get(s.n));
    while (spare > 1e-6 && open.length) {
      const slice = spare / open.length;
      let used = 0;
      for (const s of open) {
        const take = Math.min(slice, s.room - budget.get(s.n));
        budget.set(s.n, budget.get(s.n) + take);
        used += take;
      }
      if (used <= 1e-9) break;
      spare -= used;
      open = open.filter((s) => s.room - budget.get(s.n) > 1e-6);
    }
  }

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

    if (maxSeconds) captureSpan = Math.min(captureSpan, budget.get(stop.n) ?? captureSpan);

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
