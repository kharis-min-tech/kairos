/** Alignment, offline. No key, no network. */
import assert from 'node:assert/strict';

import { alignWords, alignmentConfidence } from './align.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`); };

test('a clean transcript gives every script word its own timing', () => {
  const out = alignWords('Kairos brings every branch together', [
    { word: 'Kairos', start: 0.0, end: 0.4 },
    { word: 'brings', start: 0.4, end: 0.7 },
    { word: 'every', start: 0.7, end: 0.9 },
    { word: 'branch', start: 0.9, end: 1.3 },
    { word: 'together', start: 1.3, end: 1.8 },
  ], 1.8);
  assert.equal(out.length, 5);
  assert.equal(out[3].word, 'branch');
  assert.equal(out[3].start, 0.9);
  assert.equal(alignmentConfidence(out), 1);
});

test('a misheard word keeps the script spelling, not the transcript', () => {
  // The real failure: Deepgram returned "bridge" for "branch".
  const out = alignWords('every branch of the church', [
    { word: 'every', start: 0.0, end: 0.3 },
    { word: 'bridge', start: 0.3, end: 0.7 },
    { word: 'of', start: 0.7, end: 0.8 },
    { word: 'the', start: 0.8, end: 0.9 },
    { word: 'church', start: 0.9, end: 1.4 },
  ], 1.4);
  assert.deepEqual(out.map((w) => w.word), ['every', 'branch', 'of', 'the', 'church']);
  assert.ok(!out.some((w) => w.word === 'bridge'), 'the mishearing never reaches the screen');
  // It still lands roughly where the word was said.
  assert.ok(out[1].start >= 0 && out[1].start <= 0.7);
});

test('punctuation and case are not treated as differences', () => {
  const out = alignWords('Sign in to Kairos', [
    { word: 'Sign', start: 0, end: 0.2 },
    { word: 'in', start: 0.2, end: 0.3 },
    { word: 'to', start: 0.3, end: 0.4 },
    { word: 'Kairos.', start: 0.4, end: 0.9 },
  ], 0.9);
  assert.equal(alignmentConfidence(out), 1);
});

test('nothing transcribed still produces a caption, spread evenly', () => {
  const out = alignWords('one two three four', [], 4);
  assert.equal(out.length, 4);
  assert.equal(out[0].start, 0);
  assert.equal(out[3].end, 4);
  assert.ok(out.every((w) => w.approximate));
});

test('caption words never overlap, even after a guess', () => {
  const out = alignWords('a completely unheard phrase here', [
    { word: 'a', start: 0, end: 0.1 },
    { word: 'here', start: 1.8, end: 2.0 },
  ], 2);
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i].start >= out[i - 1].end, `word ${i} starts after word ${i - 1} ends`);
  }
});

test('confidence reports how much was actually recognised', () => {
  const out = alignWords('one two three four', [
    { word: 'one', start: 0, end: 0.3 },
    { word: 'two', start: 0.3, end: 0.6 },
  ], 1.2);
  assert.ok(alignmentConfidence(out) < 1, 'two of four guessed');
  assert.ok(alignmentConfidence(out) >= 0.5);
});

console.log(`\n${passed} alignment tests passed`);
