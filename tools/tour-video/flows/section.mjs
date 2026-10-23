/**
 * Build a flow for one short section clip.
 *
 * Every handbook section answers the same shape of question — where is this,
 * what am I looking at, what do I do here — so the clips are generated from a
 * table rather than written out 42 times. A clip that needs something unusual
 * can still pass `extra` and do it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { estimateTimings } from '../lib/estimate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Ceiling for a section clip. Still a ceiling — but it is no longer a target.
 *
 * It used to be both: the budget was divided between the beats and each beat
 * stood still for its share, which is how a two-stop clip ended up with
 * fourteen seconds of motionless page per beat and 49% silence overall. Now
 * each beat films for about as long as its line takes to say, and the clips
 * come out as long as they need to be — comfortably inside this.
 */
export const MAX_SECONDS = 30;

/** How much footage to shoot per second of narration. */
const FOOTAGE_RATIO = 1.6;
/** Bounds, for a beat whose line is unusually short or long. */
const MIN_BEAT = 3.5;
const MAX_BEAT = 11;

/**
 * How long each beat should film for, from how long its line takes to say.
 *
 * The recorder cannot measure the narration — that needs Deepgram, and this
 * runs before it — but the script is on disk, and estimating from the text is
 * close enough. Shooting a little over keeps the footage running faster than
 * real time in the finished clip, which is what makes it feel edited; the
 * scheduler clamps anything wildly off.
 */
function beatBudgets(id, count) {
  const path = join(HERE, '..', 'narration', `${id}.json`);
  if (!existsSync(path)) return Array.from({ length: count }, () => 7);

  try {
    const { stops } = JSON.parse(readFileSync(path, 'utf8'));
    return Array.from({ length: count }, (_, i) => {
      const speech = stops?.[i]?.speech;
      if (!speech) return 7;
      const { duration } = estimateTimings(speech);
      return Math.min(MAX_BEAT, Math.max(MIN_BEAT, duration * FOOTAGE_RATIO));
    });
  } catch {
    return Array.from({ length: count }, () => 7);
  }
}

/**
 * Perform a beat's declared action. Best-effort throughout: a selector that
 * no longer matches costs this beat its gesture, not the clip.
 */
async function perform(k, act) {
  if (!act) return;
  if (typeof act === 'function') return void (await act(k));
  if (act === 'open') return void (await k.openFirst());
  if (act.open) {
    return void (await k.openFirst(typeof act.open === 'string' ? act.open : undefined));
  }
  if (act.search) {
    const into = act.into ?? 'input[type="search"], input[placeholder*="earch" i]';
    return void (await k.typeInto(into, act.search));
  }
  if (act.click) return void (await k.clickText(act.click));
}

/**
 * @param spec.slug    the handbook page, e.g. 'platform/members'
 * @param spec.path    where to go in the app
 * @param spec.account which demo account sees this screen properly
 * @param spec.stops   two or three beats:
 *                     { title, at?, point?, scroll?, act?, extra? }
 */
export function sectionFlow(spec) {
  const beats = spec.stops;
  const id = spec.slug.replace(/\//g, '-');
  const budgets = beatBudgets(id, beats.length);

  return {
    id,
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
        await perform(k, beat.act);
        if (beat.extra) await beat.extra(k);
        // Whatever is left of the beat is spent showing the screen rather
        // than standing on it.
        await k.showcase(budgets[i] * 1000);
      },
    })),
  };
}
