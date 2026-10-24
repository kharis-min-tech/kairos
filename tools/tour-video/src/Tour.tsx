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
  role: string;
  /** 'en' | 'fr' | 'kri' | 'tw'. Only the step counter needs it. */
  lang: string;
  /** Path under public/, e.g. "capture/member.webm". */
  video: string;
  segments: Segment[];
  duration: number;
}

/**
 * "Step 2 of 2" was the last English string left on a French clip: everything
 * else on screen is the app's own interface, which is already translated.
 */
const STEP: Record<string, (n: number, total: number) => string> = {
  en: (n, total) => `Step ${n} of ${total}`,
  fr: (n, total) => `Étape ${n} sur ${total}`,
  kri: (n, total) => `Stɛp ${n} pan ${total}`,
  tw: (n, total) => `Ɔkwan ${n} wɔ ${total} mu`,
};

const PURPLE = '#3b0764';
const GOLD = '#f8b537';
const LILAC = '#e9dcff';

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
  const LEAD = 0.34; // start diving just before the press
  const HOLD = 0.55; // stay in while the page responds
  const OUT = 0.85; // and come back out unhurriedly

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
      scale: drift + (1.5 - drift) * e,
      ox: fx + (click.x - fx) * e,
      oy: fy + (click.y - fy) * e,
    };
  }

  return { scale: drift, ox: fx, oy: fy };
}

/**
 * The ring a click leaves behind.
 *
 * The page draws its own at capture time, but that one is recorded at
 * whatever speed the footage ends up running at and is the same few pixels as
 * the cursor. This one is drawn at render time, inside the same transformed
 * space as the video, so it lands on the pixel that was clicked and reads
 * clearly at any zoom.
 */
const Ripple: React.FC<{ click: Click; now: number }> = ({ click, now }) => {
  const rel = now - click.at;
  // Half a second, and gone. A longer ring outlived the navigation it caused
  // and ended up circling an arbitrary spot on the page that had just
  // loaded — pointing at the wrong thing is worse than not pointing.
  const LIFE = 0.5;
  if (rel < 0 || rel > LIFE) return null;

  const scale = interpolate(rel, [0, LIFE], [0.25, 1.75], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(rel, [0, 0.08, LIFE], [0, 0.9, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: click.x,
        top: click.y,
        width: 112,
        height: 112,
        marginLeft: -56,
        marginTop: -56,
        borderRadius: '50%',
        border: `4px solid ${GOLD}`,
        boxShadow: `0 0 26px ${GOLD}`,
        opacity,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
      }}
    />
  );
};

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

        {segment.clicks.map((c, i) => (
          <Ripple key={`r-${i}`} click={c} now={segment.at + local} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * The lower third, lit a word at a time.
 *
 * The caption line is the written summary and stays put. Underneath it the
 * spoken sentence plays back word by word, each one brightening as Deepgram
 * reports it being said. That is only possible because the narration is
 * transcribed after it is generated: the words were always known, their
 * position in time was not.
 */
const Caption: React.FC<{ segment: Segment; total: number; lang: string }> = ({
  segment,
  total,
  lang,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Sequence-relative frame -> timeline seconds.
  const local = frame / fps;
  const now = segment.at + local;

  // In on a slide, out before the dissolve, so two captions are never up at
  // once and the card is never caught mid-cross-fade.
  //
  // The two moments are derived from the span rather than fixed, because
  // interpolate() requires a strictly increasing input range: a line short
  // enough that `span - OUT` fell at or below the fade-in produced
  // [0, 0.42, 0.42, span] and threw, taking the whole render with it. No
  // narration line is currently under two seconds, so this has never fired —
  // it is a trap laid for whoever writes a three-word one.
  const IN = Math.min(0.42, segment.span * 0.3);
  const OUT = Math.min(0.3, segment.span * 0.25);
  const outAt = Math.max(IN + 1e-3, segment.span - OUT);
  const end = Math.max(outAt + 1e-3, segment.span);
  const opacity = interpolate(local, [0, IN, outAt, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  const lift = interpolate(local, [0, Math.max(1e-3, IN)], [26, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const through = interpolate(local, [0, Math.max(0.001, segment.span)], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start' }}>
      <div
        style={{
          margin: '0 0 44px 48px',
          maxWidth: 1180,
          borderRadius: 14,
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, rgba(49,5,86,0.95) 0%, rgba(26,2,48,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 26px 70px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          color: '#fff',
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          opacity,
          transform: `translateY(${lift}px)`,
        }}
      >
        <div style={{ padding: '16px 26px 18px' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: GOLD,
            }}
          >
            {(STEP[lang] ?? STEP.en)(segment.n, total)}
          </div>
          <div style={{ fontSize: 25, fontWeight: 700, marginTop: 4, letterSpacing: -0.3 }}>
            {segment.title}
          </div>
          <div style={{ fontSize: 15, color: LILAC, marginTop: 3 }}>{segment.caption}</div>

          {segment.words.length > 0 && (
            <div style={{ fontSize: 17, marginTop: 11, lineHeight: 1.45, maxWidth: 1080 }}>
              {segment.words.map((w, i) => {
                const spoken = now >= w.start;
                const saying = now >= w.start && now <= w.end;
                return (
                  <span
                    key={`${w.start}-${i}`}
                    style={{
                      color: spoken ? '#fff' : 'rgba(255,255,255,0.36)',
                      textShadow: saying ? `0 0 18px ${GOLD}` : 'none',
                      transition: 'none',
                    }}
                  >
                    {w.word}{' '}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* How far through this stop is — the one piece of chrome that tells
            a viewer the clip is going somewhere. */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.12)' }}>
          <div style={{ height: '100%', width: `${through * 100}%`, background: GOLD }} />
        </div>
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
