/**
 * The scheduler, tested offline. No key, no network, no Deepgram.
 *
 *   node lib/schedule.test.mjs
 */
import assert from 'node:assert/strict';

import { buildSchedule, GAP, TAIL } from './schedule.mjs';

/** Seconds accumulate as floats, so compare to the frame, not the bit. */
const near = (a, b, msg) =>
  assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} (${a} vs ${b})`);

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

const stop = (n, duration, words = []) => ({
  n,
  title: `Stop ${n}`,
  caption: `Caption ${n}`,
  file: `voice/test/0${n}.wav`,
  duration,
  words,
});

test('a segment lasts as long as its line, not as long as its footage', () => {
  // This assertion used to read `span === 10` — the footage length — and that
  // was the defect, not the requirement. Ten seconds of capture behind a
  // four-second line meant six seconds of silence on a still page, and across
  // the 128 section clips it worked out at 49% of the running time. The line
  // leads now, and the footage is fitted into it.
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 10 }],
    [stop(1, 4), stop(2, 3)],
    20,
  );
  assert.equal(segments[0].hold, 0);
  assert.equal(segments[0].span, 4, 'the segment is the length of the sentence');
  assert.ok(segments[0].rate > 1, 'the footage is sped up to fill the line');
  near(segments[0].playedFor, 4, 'picture moves for the whole line');
});

test('a line longer than its footage freezes the picture, never clips the line', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 2 }],
    [stop(1, 6), stop(2, 3)],
    10,
  );
  assert.equal(segments[0].capturePlays, 2, 'all the footage there is');
  assert.equal(segments[0].span, 6, 'the segment lasts as long as the sentence');
  // Two seconds of capture under a six-second line. Stretching it to 0.6x
  // covers 3.33 of those seconds with moving picture and freezes the rest;
  // the old scheduler froze all four of them.
  near(segments[0].rate, 0.6, 'slowed, not frozen');
  assert.ok(segments[0].hold < 3, `less frozen than before (${segments[0].hold})`);
});

test('stops never overlap: each starts after the one before, plus a breath', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 1 }, { n: 3, start: 2 }],
    [stop(1, 5), stop(2, 5), stop(3, 5)],
    6,
  );
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    assert.ok(
      segments[i].at >= prev.at + prev.span,
      `stop ${segments[i].n} starts after stop ${prev.n} ends`,
    );
    near(segments[i].at - (prev.at + prev.span), GAP, 'exactly one gap between stops');
  }
});

test('word times are shifted from audio-relative to timeline-absolute', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 3 }],
    [
      stop(1, 3, [{ word: 'Hello', start: 0.1, end: 0.5 }]),
      stop(2, 3, [{ word: 'Again', start: 0.2, end: 0.6 }]),
    ],
    6,
  );
  assert.equal(segments[0].words[0].start, 0.1);
  // Second stop begins at 3s of footage + the gap, so its first word moves with it.
  near(segments[1].words[0].start, segments[1].at + 0.2);
});

test('a mark with no narration is skipped rather than rendered silent', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 5 }],
    [stop(1, 4)],
    10,
  );
  assert.equal(segments.length, 1);
});

test('the video is the segments, not the capture it was cut from', () => {
  // A capture carries the sign-in at the front and whatever was still
  // recording at the end. Taking the longer of the timeline and the capture
  // pinned a 30-second section clip to 79 seconds that opened on a login
  // screen, so the timeline alone decides.
  const { duration, segments } = buildSchedule(
    [{ n: 1, start: 24 }, { n: 2, start: 30 }],
    [stop(1, 4), stop(2, 4)],
    79,
  );
  const lastEnds = segments.at(-1).at + segments.at(-1).span;
  near(duration, lastEnds, 'duration ends with the last segment');
  assert.ok(duration < 60, `a two-stop clip is not 79 seconds (got ${duration})`);
});

test('a capped clip trims footage but never the narration', () => {
  const { segments, duration } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 40 }],
    [stop(1, 9), stop(2, 9)],
    120,
    { maxSeconds: 30 },
  );
  // Both lines survive in full.
  for (const s of segments) assert.ok(s.span >= s.spoken, 'the line is never cut short');
  // `<= 32` was the old assertion, and it described the bug rather than the
  // requirement: a "thirty-second" clip rendered at 32.3 and this passed.
  assert.ok(
    duration + TAIL <= 30,
    `the finished video fits the cap (got ${(duration + TAIL).toFixed(2)})`,
  );
});

test('the cap is on the finished video, gaps and tail included', () => {
  // The composition renders `duration + TAIL`, so that is what has to fit.
  // Dividing maxSeconds by the stop count and ignoring the overhead is what
  // put every section clip at 32.34 seconds.
  for (const count of [2, 3, 4]) {
    const marks = Array.from({ length: count }, (_, i) => ({ n: i + 1, start: i * 40 }));
    const stops = marks.map((m) => stop(m.n, 6));
    const { duration } = buildSchedule(marks, stops, 400, { maxSeconds: 30 });
    assert.ok(
      duration + TAIL <= 30 + 1e-9,
      `${count} stops fit in 30s (got ${(duration + TAIL).toFixed(2)})`,
    );
  }
});

test('one long line borrows the slack from short ones', () => {
  // The case that produced eleven clips between 30.1 and 35 seconds: stop 2
  // speaks for longer than an equal share, while stops 1 and 3 have seconds
  // of pure picture they are not using.
  const { segments, duration } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 20 }, { n: 3, start: 40 }],
    [stop(1, 6.8), stop(2, 9.7), stop(3, 6.8)],
    80,
    { maxSeconds: 30 },
  );
  assert.ok(duration + TAIL <= 30 + 1e-9, `fits (got ${(duration + TAIL).toFixed(2)})`);
  const long = segments.find((s) => s.n === 2);
  assert.ok(long.span >= 9.7, 'the long line still plays in full');
  for (const s of segments) assert.ok(s.span >= s.spoken, 'no line is cut');
});

test('a stop with little footage does not hoard budget it cannot use', () => {
  // Stop 2 only has two seconds of capture behind it, so the spare seconds
  // belong to the stops that can actually show something.
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 30 }, { n: 3, start: 32 }],
    [stop(1, 4), stop(2, 1), stop(3, 4)],
    60,
    { maxSeconds: 30 },
  );
  const short = segments.find((s) => s.n === 2);
  assert.ok(short.capturePlays <= 2 + 1e-9, 'it is held to the footage it has');
});

test('a clip with no cap is still as long as it needs to be', () => {
  const { duration } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 50 }],
    [stop(1, 40), stop(2, 40)],
    100,
  );
  assert.ok(duration > 30, 'an uncapped tour is not silently truncated');
});

test('a cap cannot cut a line in half, even an over-long one', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }],
    [stop(1, 45)],
    60,
    { maxSeconds: 30 },
  );
  assert.equal(segments[0].spoken, 45);
  assert.ok(segments[0].span >= 45, 'a 45-second line is not squeezed into 30');
});

test('marks arriving out of order are put back in time order', () => {
  const { segments } = buildSchedule(
    [{ n: 2, start: 8 }, { n: 1, start: 0 }],
    [stop(1, 2), stop(2, 2)],
    12,
  );
  assert.deepEqual(segments.map((s) => s.n), [1, 2]);
});

test('no segment is ever padded past its line', () => {
  // The whole complaint, as an assertion: a clip with generous footage and
  // short lines must not come out half silent.
  const { segments, duration } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 14 }, { n: 3, start: 28 }],
    [stop(1, 5), stop(2, 6), stop(3, 4)],
    42,
    { maxSeconds: 30 },
  );
  for (const s of segments) near(s.span, s.spoken, `stop ${s.n} is not padded`);
  const spoken = segments.reduce((n, s) => n + s.spoken, 0);
  const silence = duration - spoken;
  assert.ok(silence <= GAP * 2 + 1e-9, `silence is only the breaths (${silence})`);
});

test('footage is never pushed past the point where it reads as comic', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 90 }],
    [stop(1, 3), stop(2, 3)],
    120,
  );
  assert.ok(segments[0].rate <= 2.2 + 1e-9, `capped (${segments[0].rate})`);
  // Past the cap the remaining footage is simply not used, rather than the
  // line being stretched to cover it.
  assert.ok(segments[0].capturePlays < 90, 'the surplus is dropped, not raced through');
});

test('a click is placed where it falls on the finished timeline, not the capture', () => {
  // The composition punches in on clicks. A click 8 seconds into a capture
  // that is playing at 2x lands 4 seconds into the segment, so the zoom has
  // to be told the timeline moment, not the recorder's.
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 20 }],
    [stop(1, 10), stop(2, 5)],
    40,
    { gestures: [{ t: 8, x: 400, y: 300, kind: 'click' }] },
  );
  const [click] = segments[0].clicks;
  assert.ok(click, 'the click survived into the schedule');
  near(click.at, 8 / segments[0].rate, 'rescaled by the playback rate');
  assert.deepEqual([click.x, click.y], [400, 300], 'in capture pixels, untouched');
});

test('a stop with no gesture simply has no focus point', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }],
    [stop(1, 4)],
    10,
  );
  assert.equal(segments[0].focus, null);
  assert.deepEqual(segments[0].clicks, []);
});

test('a cap that speech alone overruns is reported rather than enforced', () => {
  const { over } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 30 }],
    [stop(1, 20), stop(2, 20)],
    60,
    { maxSeconds: 30 },
  );
  assert.ok(over > 0, 'the overrun is surfaced');
});

console.log(`\n${passed} scheduler tests passed`);
