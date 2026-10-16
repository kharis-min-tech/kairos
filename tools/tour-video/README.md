# Tour video rendering

Renders the narrated Kairos product tours. The composition is React, rendered
by [Remotion](https://remotion.dev).

## What this replaced

Narration was Kokoro, run locally. Deepgram's Aura-2 gives a British voice
that carries a training video better, and — the part that actually changed
the pipeline — the same vendor transcribes that generated audio back with
per-word timings, which is what moved the captions from the stopwatch onto
the word.

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
node voice.mjs member         # narration + word timings  (needs the key)
node render.mjs member        # the video                 (needs no key)
```

Inputs, relative to this folder:

| Path | What it is | Written by |
|---|---|---|
| `narration/<role>.json` | the script: title, caption and spoken line per stop | you |
| `public/capture/<role>.webm` | the screen capture | the Playwright run |
| `marks-<role>.json` | where each stop appears in the capture | the recorder |
| `public/voice/<role>/NN.wav` | the narration | `voice.mjs` |
| `timings/<role>.json` | each line's real length and every word's time | `voice.mjs` |

Output lands in `out/tour-<role>.mp4`. The generated files are all gitignored:
the media is large and regenerable, and the finished videos belong wherever
they are published, not in the repo.

### The key

`voice.mjs` needs `DEEPGRAM_API_KEY`. Put it in `tools/tour-video/.env`, which
is gitignored:

```bash
# in your own terminal, so the key is never echoed anywhere
read -rs -p 'Deepgram API key: ' k && printf 'DEEPGRAM_API_KEY=%s\n' "$k" > .env && unset k
chmod 600 .env
node check-deepgram.mjs        # speaks a line, transcribes it back, prints no key
```

`render.mjs` needs no key: it reads what `voice.mjs` already wrote. Only
regenerating the narration costs anything.

## How the picture follows the voice

The recorder's marks say *where in the capture* a stop appears. The timings
say *how long saying it takes*. Those rarely agree — a line that reads in four
seconds can sit over a page that was on screen for two.

`lib/schedule.mjs` reconciles them. The capture is cut into one segment per
stop, and each segment holds its last frame for however long the narration
overruns it. Nothing is sped up and nothing is clipped: the picture waits for
the sentence to finish, so a line can never end up describing a page the
capture has already left.

Rewording a line therefore reflows the video on its own. Nobody re-times
anything by hand, and nobody re-records.

## Captions

Deepgram transcribes the narration it just generated. That sounds circular —
the words were always known — but their *position in time* was not, and that
is the difference between a caption that appears near a sentence and one that
lights up on the word being said.

`voice.mjs` writes those word times into `timings/<role>.json`; `Tour.tsx`
renders them, each word brightening as it is spoken.

To see the composition and scrub it frame by frame:

```bash
npm run studio
```

## Checking it still works

```bash
npm test                 # the scheduler, offline, no key, no network
node smoke.mjs           # a full render from a test pattern, still no key
node check-deepgram.mjs  # the key itself: speak a line, transcribe it back
```

`smoke.mjs` generates a test pattern and two tones, invents timings of the
shape `voice.mjs` writes — including a line that overruns its footage, so the
held frame is exercised too — and renders them through the same composition
the real tours use. It stays deliberately offline so it runs on a fresh
machine and in CI, where there is no key and should not need to be one.

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
| Narration | **Deepgram Aura-2** (`aura-2-athena-en`), one WAV per stop |
| Word-level caption timings | **Deepgram Nova-3**, transcribing that narration |
| Fitting the picture to the voice | `lib/schedule.mjs` |
| Captions, fades, encoding | this project |

The cursor has to stay injected: it must exist in the capture, because
Playwright's synthetic mouse draws nothing. Everything else that used to be
burned into the recording now lives here.
