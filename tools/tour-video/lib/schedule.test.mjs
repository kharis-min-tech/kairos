/**
 * The scheduler, tested offline. No key, no network, no Deepgram.
 *
 *   node lib/schedule.test.mjs
 */
import assert from 'node:assert/strict';

import { buildSchedule, GAP } from './schedule.mjs';

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

test('the finished video is never shorter than the capture', () => {
  const { duration } = buildSchedule([{ n: 1, start: 0 }], [stop(1, 1)], 30);
  assert.ok(duration >= 30);
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
