import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
// The scheduler owns the timing constants so there is one copy of each.
import { CROSS, GAP } from '../lib/schedule.mjs';

/** A word, with the moment it is spoken, in timeline seconds. */
export interface Word {
  word: string;
  start: number;
  end: number;
}

/** A point in the capture, in capture pixels (the frame is 1920×1080). */
export interface Point {
  x: number;
  y: number;
}

export interface Click extends Point {
  /** Timeline seconds. */
  at: number;
}

/** One stop, after the schedule has fitted the capture to the narration. */
export interface Segment {
  n: number;
  title: string;
  caption: string;
  /** Path under public/, or null where the language has no voice. */
  audio: string | null;
  at: number;
  span: number;
  captureFrom: number;
  capturePlays: number;
  /** How fast the footage runs, so the stop's capture fills its line. */
  rate: number;
  playedFor: number;
  hold: number;
  spoken: number;
  /** Where the camera favours, or null to sit centred. */
  focus: Point | null;
  clicks: Click[];
  words: Word[];
}

export interface TourProps {
  // Remotion types composition props as a record; the index signature is what
  // lets a typed interface be passed to <Composition>.
  [key: string]: unknown;
  // The music bed is deliberately NOT here. It is mixed into the finished
  // file by music.mjs instead, because baking it into the render means every
  // adjustment to its level costs a full re-render of all 144 clips -- and a
  // music level is exactly the kind of thing somebody wants to hear and then
  // change. Mixed afterwards the video is stream-copied untouched and only
  // the audio is rebuilt, so a change costs minutes.

  role: string;
  /** 'en' | 'fr' | 'kri' | 'tw'. Only the step counter needs it. */
  lang: string;
  /** Path under public/, e.g. "capture/member.webm". */
  video: string;
  segments: Segment[];
  duration: number;
}

// The step counter that used to live here ("Step 2 of 2", translated four
// ways) went with the lower-third card. Nothing on screen is English-only
// now: the subtitle is the narration, and the rest is the app's own
// interface, which is already translated.
const PURPLE = '#3b0764';

/**
 * How loud the music is at a given moment.
 *
 * The bed sits well under the voice and drops further while anybody is
 * speaking, which is the difference between music and interference. The duck
 * is ramped rather than switched: a hard cut on every sentence boundary
 * pumps audibly, and on a clip with nine stops that is nine pumps.
 *
 * Narration windows come from the segments themselves, so the music follows
 * whatever the scheduler decided rather than a second, drifting copy of it.
 */
const W = 1920;
const H = 1080;

/** The camera, as the frame sees it. */
interface Camera {
  scale: number;
  /** Transform origin, in capture pixels. Scaling about it pins it in place. */
  ox: number;
  oy: number;
}

/**
 * Where the camera is, this frame.
 *
 * Two movements, added together.
 *
 * The first is a slow push in across the whole stop — 1.03 to 1.09 — aimed at
 * whatever the cursor last touched. On its own it is nearly subliminal, but
 * it is the difference between a video and a screenshot: something is always
 * moving, so the eye stays on it.
 *
 * The second is the punch. On a click the camera dives to 1.5x centred on the
 * pointer, holds while the page reacts, then eases back out. That is the shot
 * that makes a click legible — a 22-pixel cursor on a 1920-pixel frame is
 * about nine pixels wide once the handbook has scaled the clip down, and no
 * amount of ring animation rescues something that small. Zooming does.
 */
function camera(segment: Segment, local: number): Camera {
  const fx = segment.focus?.x ?? W / 2;
  const fy = segment.focus?.y ?? H / 2;

  const drift = interpolate(local, [0, Math.max(0.001, segment.span)], [1.03, 1.09], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });

  // The nearest click whose window this frame falls in. Clicks are at least
  // a gesture apart in practice, so the first match is the right one.
  // The punch has to be out of the way before the page changes under it.
  // It used to hold 1.5x for 0.55s and ease out over 0.85s, so for nearly a
  // second and a half the camera stayed locked on the pixel that was
  // clicked -- by which time the click had opened a different screen, and
  // that pixel was now empty margin. The shot was a 1.5x close-up of
  // whitespace. Shorter, and slightly shallower, so a near miss costs less.
  const LEAD = 0.34; // start diving just before the press
  const HOLD = 0.3; // only while the old screen is still up
  const OUT = 0.6; // then release

  for (const click of segment.clicks) {
    const rel = segment.at + local - click.at;
    if (rel < -LEAD || rel > HOLD + OUT) continue;

    const e =
      rel < 0
        ? interpolate(rel, [-LEAD, 0], [0, 1], {
            extrapolateLeft: 'clamp',
            easing: Easing.out(Easing.cubic),
          })
        : rel <= HOLD
          ? 1
          : interpolate(rel, [HOLD, HOLD + OUT], [1, 0], {
              extrapolateRight: 'clamp',
              easing: Easing.inOut(Easing.ease),
            });

    return {
      scale: drift + (1.38 - drift) * e,
      ox: fx + (click.x - fx) * e,
      oy: fy + (click.y - fy) * e,
    };
  }

  return { scale: drift, ox: fx, oy: fy };
}

/**
 * The capture for one stop, under the camera.
 *
 * The footage runs at `rate` so the stop's capture fills the length of its
 * line — no padding and no dead air, which is what the old picture-led
 * schedule produced. Where there was less footage than speech even at 0.6x,
 * the last frame is held for the remainder.
 *
 * Each shot also outlives its segment by a gap plus a dissolve, holding that
 * last frame, so the next one has something to fade in over.
 */
const Shot: React.FC<{ video: string; segment: Segment; fps: number; first: boolean }> = ({
  video,
  segment,
  fps,
  first,
}) => {
  const frame = useCurrentFrame();
  const local = frame / fps;
  const sec = (s: number) => Math.max(1, Math.round(s * fps));

  const cam = camera(segment, Math.min(local, segment.span));

  // The dissolve in. The first shot has nothing underneath it to dissolve
  // from, so it rides the composition's own opening fade instead of fading up
  // from the purple background a second time.
  const enter = first
    ? 1
    : interpolate(local, [0, CROSS], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.ease),
      });

  const plays = segment.playedFor;
  const held = segment.span - plays + GAP + CROSS;

  const fill: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <AbsoluteFill
        style={{
          transform: `scale(${cam.scale})`,
          transformOrigin: `${cam.ox}px ${cam.oy}px`,
        }}
      >
        {plays > 0 && (
          <Sequence durationInFrames={sec(plays)} layout="none">
            <OffthreadVideo
              src={staticFile(video)}
              startFrom={Math.round(segment.captureFrom * fps)}
              endAt={Math.round((segment.captureFrom + segment.capturePlays) * fps)}
              playbackRate={segment.rate}
              style={fill}
              muted
            />
          </Sequence>
        )}
        {held > 0 && (
          <Sequence from={sec(plays)} durationInFrames={sec(held)} layout="none">
            {/* The last frame of the segment, held through the dissolve.
                An OffthreadVideo given a one-frame window renders that frame
                once and then nothing at all, which left half the first cut as
                bare background. <Freeze> pins the whole subtree to one frame,
                which is what actually holds a picture on screen. */}
            <Freeze frame={0}>
              <OffthreadVideo
                src={staticFile(video)}
                startFrom={Math.max(
                  0,
                  Math.round((segment.captureFrom + segment.capturePlays) * fps) - 1,
                )}
                style={fill}
                muted
              />
            </Freeze>
          </Sequence>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * The subtitle.
 *
 * This replaced a lower-third card that stacked five things on top of each
 * other: a gold "STEP 2 OF 2" chip, a bold title, a lilac summary line, the
 * spoken sentence lit word-by-word as it was said, and a gold progress bar
 * along the bottom. Every one of them was defensible on its own and together
 * they read as a beginner's tutorial -- the karaoke highlight especially,
 * which is the single most recognisable tell of a hobby screencast.
 *
 * What is left is what a subtitle is for: the sentence being spoken, once,
 * legibly, out of the way. The step counter went because a viewer watching a
 * fifteen-second clip does not need a progress indicator, the summary line
 * went because it restated the narration, and the title went because the
 * handbook page the clip sits in is already headed with it.
 *
 * It sits bottom-centre rather than bottom-left so it reads as part of the
 * video rather than as a badge stuck on one corner of it.
 */
const Caption: React.FC<{ segment: Segment; total: number; lang: string }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps;

  // Derived from the span, not fixed: interpolate() needs a strictly
  // increasing input range, and a line short enough that `span - OUT` fell at
  // or below the fade-in would otherwise throw and take the render with it.
  const IN = Math.min(0.26, segment.span * 0.22);
  const OUT = Math.min(0.24, segment.span * 0.2);
  const outAt = Math.max(IN + 1e-3, segment.span - OUT);
  const end = Math.max(outAt + 1e-3, segment.span);
  const opacity = interpolate(local, [0, IN, outAt, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  const lift = interpolate(local, [0, Math.max(1e-3, IN)], [14, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // The spoken sentence. Where a language has no word timings the written
  // caption stands in, so a subtitle is never missing entirely.
  const line = segment.words.length
    ? segment.words.map((w) => w.word).join(' ')
    : segment.caption;
  if (!line) return null;

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
      <div
        style={{
          margin: '0 0 58px',
          maxWidth: 1320,
          padding: '18px 34px',
          borderRadius: 12,
          // A scrim that hugs the text, not a bordered card. The app behind
          // is mostly white, so the subtitle needs its own ground to stay
          // readable, but it should read as a caption rather than as chrome.
          background: 'rgba(11,7,20,0.80)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 20px 56px rgba(0,0,0,0.44)',
          color: '#fff',
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          fontSize: 31,
          fontWeight: 500,
          lineHeight: 1.36,
          letterSpacing: -0.2,
          textAlign: 'center',
          textWrap: 'balance',
          opacity,
          transform: `translateY(${lift}px)`,
        }}
      >
        {line}
      </div>
    </AbsoluteFill>
  );
};

export const Tour: React.FC<TourProps> = ({ video, segments, lang }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const sec = (s: number) => Math.round(s * fps);

  const fade = interpolate(
    frame,
    [0, 0.6 * fps, durationInFrames - 1.1 * fps, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: PURPLE, opacity: fade }}>
      {segments.map((s) => (
        <Sequence
          key={`v-${s.n}`}
          from={sec(s.at)}
          // Outlives its own segment by the gap and the dissolve, so the next
          // shot fades in over a held frame rather than over the background.
          durationInFrames={Math.max(1, sec(s.span + GAP + CROSS))}
          layout="none"
        >
          <Shot video={video} segment={s} fps={fps} first={s.n === segments[0]?.n} />
        </Sequence>
      ))}

      {/* A language with no voice at all carries captions over silence. Krio
          and Twi are narrated in English and subtitled in their own language,
          so they do have an audio track. */}
      {segments
        .filter((s) => s.audio)
        .map((s) => (
          <Sequence
            key={`a-${s.n}`}
            from={sec(s.at)}
            durationInFrames={Math.max(1, sec(s.spoken))}
            layout="none"
          >
            <Audio src={staticFile(s.audio as string)} />
          </Sequence>
        ))}

      {segments.map((s) => (
        <Sequence key={`c-${s.n}`} from={sec(s.at)} durationInFrames={Math.max(1, sec(s.span))}>
          <Caption segment={s} total={segments.length} lang={lang} />
        </Sequence>
      ))}

    </AbsoluteFill>
  );
};
