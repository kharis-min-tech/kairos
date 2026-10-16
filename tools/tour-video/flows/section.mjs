/**
 * Build a flow for one short section clip.
 *
 * Every handbook section answers the same shape of question — where is this,
 * what am I looking at, what do I do here — so the clips are generated from a
 * table rather than written out 42 times. A clip that needs something unusual
 * can still pass `extra` and do it.
 *
 * Capped at `MAX_SECONDS` of capture. The point of these is that somebody
 * watches one instead of asking for help, and nobody watches a long one.
 */
export const MAX_SECONDS = 30;

/**
 * @param spec.slug    the handbook page, e.g. 'platform/members'
 * @param spec.path    where to go in the app
 * @param spec.account which demo account sees this screen properly
 * @param spec.stops   two or three beats: { title, at?, point?, scroll?, extra? }
 */
export function sectionFlow(spec) {
  const beats = spec.stops;
  // Share the budget across the beats, leaving a moment at the end.
  const dwell = Math.floor(((MAX_SECONDS - 2) * 1000) / beats.length);

  return {
    id: spec.slug.replace(/\//g, '-'),
    slug: spec.slug,
    account: spec.account,
    maxSeconds: MAX_SECONDS,
    stops: beats.map((beat, i) => ({
      n: i + 1,
      title: beat.title,
      async run(k) {
        if (i === 0 || beat.at) await k.goto(beat.at ?? spec.path);
        if (beat.point) await k.moveTo(beat.point);
        if (beat.scroll) await k.scroll(beat.scroll);
        if (beat.extra) await beat.extra(k);
        await k.settle(dwell);
      },
    })),
  };
}
