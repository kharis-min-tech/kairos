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

test('a stop whose narration fits inside its footage holds nothing', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 10 }],
    [stop(1, 4), stop(2, 3)],
    20,
  );
  assert.equal(segments[0].hold, 0);
  assert.equal(segments[0].span, 10, 'segment lasts as long as its footage');
});

test('a line longer than its footage freezes the picture, never clips the line', () => {
  const { segments } = buildSchedule(
    [{ n: 1, start: 0 }, { n: 2, start: 2 }],
    [stop(1, 6), stop(2, 3)],
    10,
  );
  assert.equal(segments[0].capturePlays, 2);
  assert.equal(segments[0].hold, 4, 'four seconds of held frame');
  assert.equal(segments[0].span, 6, 'the segment lasts as long as the sentence');
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

console.log(`\n${passed} scheduler tests passed`);
