# Tour video rendering

Renders the narrated Kairos product tours. The composition is React, rendered
by [Remotion](https://remotion.dev).

## What this replaced

The tours were previously assembled with a hand-written `ffmpeg` filter graph:
a chain of `adelay`, `amix`, `apad`, `atrim`, `loudnorm`, `tpad` and `fade`
built as a string in a Node script. It worked, but it was write-only — nobody
could look at it and tell what the video would do.

The captions were worse. They were a `<div>` injected into Kairos itself
during the recording, which meant restyling a caption, fixing a typo in one,
or changing the step numbering all required **recording the entire tour
again**.

Now the captions are a React component over the footage. The words and the
design are editable without the browser being involved.

One honest caveat: **Remotion has not removed ffmpeg.** It bundles its own
copy and encodes through it. What changed is the authoring layer, not the
encoder.

## Running it

```bash
npm install
node render.mjs member        # or leader, admin
```

Inputs, relative to this folder:

| Path | What it is |
|---|---|
| `public/capture/<role>.webm` | the screen capture from the Playwright run |
| `public/voice/NN.wav` | that role's narration, one file per stop |
| `marks-<role>.json` | the timeline the recorder wrote |

Output lands in `out/tour-<role>.mp4`. All four are gitignored: the media is
large and regenerable, and the finished videos belong wherever they are
published, not in the repo.

To see the composition and scrub it frame by frame:

```bash
npm run studio
```

## Checking it still works

```bash
node smoke.mjs
```

Generates a test pattern and two tones, renders them through the same
composition, and writes `out/tour-smoke.mp4`. Worth running after a Remotion
upgrade or on a fresh machine, since it needs no capture and no app.

## How the timing works

The recorder timestamps each stop **as it performs it** and writes those
offsets to `marks-<role>.json`. The composition places each narration file and
each caption at the offset actually measured, rather than at a time anyone
predicted. Picture and sound therefore cannot drift apart, however long a page
took to load on the day.

`Root.tsx` derives the composition length from whichever is longer: the
capture, or the moment the last narration line ends, plus two seconds. That
second case is not hypothetical — Playwright's `.webm` routinely runs a second
or two shorter than the session, and the earlier ffmpeg pipeline clipped the
closing line of all three tours before that was noticed.

## Where the pieces come from

| Stage | Tool |
|---|---|
| Driving the app, capturing the screen | Playwright, Chrome for Testing |
| On-screen cursor | `overlay.js`, injected during the recording |
| Narration | Kokoro (`bf_lily`), rendered to one WAV per stop |
| Captions, timing, fades, encoding | this project |

The cursor has to stay injected: it must exist in the capture, because
Playwright's synthetic mouse draws nothing. Everything else that used to be
burned into the recording now lives here.
