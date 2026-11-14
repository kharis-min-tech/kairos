/**
 * Fit the screen capture to the narration.
 *
 * The recorder timestamps each stop as it performs it, which says *where in
 * the capture* the thing being described is on screen. The narration says
 * *how long* describing it takes. Those two rarely agree.
 *
 * ## What this used to do, and why it was wrong
 *
 * The first version let the picture lead: a segment lasted as long as its
 * footage, and froze the last frame if the sentence overran. Then a cap was
 * added for the short section clips, and the leftover budget was poured back
 * into footage so each clip filled its thirty seconds.
 *
 * Measured across the 128 section clips, that put 15.2 seconds of narration
 * into a 30-second clip — **49% of every clip was silence**, held on a page
 * that was not moving, because the recorder's own dwell was a 14-second
 * `settle()` per beat. The clips did not read as video. They read as
 * screenshots with gaps.
 *
 * ## What it does now
 *
 * The narration leads. A segment lasts exactly as long as its line, and the
 * footage behind it is *time-fitted* to that length: sped up when there is
 * more capture than speech, gently slowed when there is less. Nothing is
 * padded, so there is no dead air, and the picture is moving for as much of
 * the line as there is footage to move.
 *
 * Speech is still never cut. That rule has not changed — it is the reason a
 * cap trims footage and not sentences.
 */

/** Silence between stops, so lines do not run into each other. */
export const GAP = 0.12;

/**
 * Seconds held after the last line so the closing words are not clipped.
 * The composition appends this, so a cap has to allow for it.
 */
export const TAIL = 0.9;

/**
 * Cross-dissolve between stops, in seconds.
 *
 * Purely a composition concern: the outgoing shot holds its last frame this
 * much longer and the incoming one fades in over the top. Segment start times
 * are untouched, so the audio still never overlaps.
 */
export const CROSS = 0.4;

/**
 * How far the footage may be pushed off real time.
 *
 * Screen recordings take speed well — a cursor crossing a list at 2x still
 * reads as somebody using software, and it is what makes a clip feel edited
 * rather than observed. Past about 2.2 it starts to read as comic.
 *
 * The floor matters just as much: given less footage than speech, stretching
 * what there is to 0.6x looks far better than freezing a frame. Freezing is
 * the last resort, not the first.
 */
const MAX_RATE = 2.2;
const MIN_RATE = 0.6;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * @param marks    recorder marks: [{ n, start }], ordered, seconds into the capture
 * @param stops    measured narration: [{ n, duration, words, title, caption }]
 * @param capture  length of the capture in seconds
 * @param opts.maxSeconds  cap for a short section clip, trimming footage only
 * @param opts.gestures    recorder gestures: [{ t, x, y, kind }], capture-relative
 * @returns one entry per stop, in timeline order
 */
export function buildSchedule(marks, stops, capture, { maxSeconds, gestures = [] } = {}) {
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
    const room = Math.max(0, captureTo - captureFrom);

    // The line is the length of the segment. Everything else bends to it.
    const spoken = stop.duration;
    const span = spoken;

    // Fit the footage into the line.
    const rate = room > 0 && spoken > 0 ? clamp(room / spoken, MIN_RATE, MAX_RATE) : 1;
    const plays = Math.min(room, spoken * rate);
    const playedFor = rate > 0 ? plays / rate : 0;

    const focus = lastGestureIn(gestures, captureFrom, captureFrom + plays);

    out.push({
      n: stop.n,
      title: stop.title,
      caption: stop.caption,
      audio: stop.file,
      /** Where this segment begins on the finished timeline. */
      at: timeline,
      /** How long it lasts. Equal to the line: no padding, ever. */
      span,
      /** Where to seek into the capture, and how much of it is consumed. */
      captureFrom,
      capturePlays: plays,
      /** How fast that footage runs, so `plays` seconds fill `playedFor`. */
      rate,
      /** Timeline seconds of moving picture. */
      playedFor,
      /** Still frame, only where there was not enough footage even at 0.6x. */
      hold: Math.max(0, span - playedFor),
      spoken,
      /**
       * Where the camera should favour, in capture pixels, or null to sit
       * centred. Taken from the last thing the cursor did in this stop,
       * which is the thing the line has just finished describing.
       */
      focus: focus ? { x: focus.x, y: focus.y } : null,
      /** Clicks to punch in on, in timeline seconds. */
      clicks: gestures
        .filter((g) => g.kind === 'click' && g.t >= captureFrom && g.t < captureFrom + plays)
        .map((g) => ({ at: timeline + (g.t - captureFrom) / rate, x: g.x, y: g.y })),
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
  const duration = Math.max(0, timeline - GAP);

  // A cap can no longer be met by trimming footage, because the footage is
  // already fitted to the speech. If the speech alone overruns, say so and
  // let it overrun: cutting a sentence in half to hit a number is worse.
  if (maxSeconds && duration + TAIL > maxSeconds + 1e-9) {
    out.over = +(duration + TAIL - maxSeconds).toFixed(2);
  }

  return { segments: out, duration, over: out.over ?? 0 };
}

/** The last gesture inside a window, which is what the stop ended on. */
function lastGestureIn(gestures, from, to) {
  let best = null;
  for (const g of gestures) {
    if (g.t >= from && g.t < to && (!best || g.t > best.t)) best = g;
  }
  return best;
}
