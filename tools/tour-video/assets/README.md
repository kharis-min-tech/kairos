# assets

## bed.mp3 — the music under the clips

Drop a single licensed instrumental here as `bed.mp3` and every clip picks it
up on the next render. Nothing else to change.

- It is **looped**, so it does not need to be any particular length. Thirty
  seconds of something that loops cleanly is plenty; the clips run from about
  twelve seconds to ninety.
- It is mixed at roughly **-18dB** under the narration and ducks a further
  **-6dB** whenever anybody is speaking, ramped over 0.3s so it does not pump
  on every sentence. Those numbers are `MUSIC_BASE`, `MUSIC_DUCK` and
  `DUCK_RAMP` in `src/Tour.tsx`.
- It fades in over 1.5s and out over 2s.
- Pick something without a strong beat or melody in the mid range — that is
  where the voice sits, and a tune fighting it is worse than no music.

This directory is not tracked: the licence for whatever you put here is yours,
and a repository is the wrong place to assert one. `public/bed.mp3` is a
generated copy and is ignored too.
