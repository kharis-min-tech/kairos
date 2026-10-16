import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

/** A word, with the moment it is spoken, in timeline seconds. */
export interface Word {
  word: string;
  start: number;
  end: number;
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
  hold: number;
  spoken: number;
  words: Word[];
}

export interface TourProps {
  // Remotion types composition props as a record; the index signature is what
  // lets a typed interface be passed to <Composition>.
  [key: string]: unknown;
  role: string;
  /** Path under public/, e.g. "capture/member.webm". */
  video: string;
  segments: Segment[];
  duration: number;
}

const PURPLE = '#3b0764';
const GOLD = '#f8b537';
const LILAC = '#e9dcff';

/**
 * The lower third, lit a word at a time.
 *
 * The caption line is the written summary and stays put. Underneath it the
 * spoken sentence plays back word by word, each one brightening as Deepgram
 * reports it being said. That is only possible because the narration is
 * transcribed after it is generated: the words were always known, their
 * position in time was not.
 */
const Caption: React.FC<{ segment: Segment; total: number }> = ({ segment, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Sequence-relative frame -> timeline seconds.
  const now = segment.at + frame / fps;

  const enter = interpolate(frame, [0, 0.35 * fps], [0, 1], { extrapolateRight: 'clamp' });
  const lift = interpolate(frame, [0, 0.35 * fps], [14, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start' }}>
      <div
        style={{
          margin: '0 0 36px 40px',
          maxWidth: 1180,
          padding: '14px 22px',
          borderRadius: 10,
          background: 'rgba(59, 7, 100, 0.93)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
          color: '#fff',
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          opacity: enter,
          transform: `translateY(${lift}px)`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: GOLD,
          }}
        >
          {`Step ${segment.n} of ${total}`}
        </div>
        <div style={{ fontSize: 23, fontWeight: 700, marginTop: 3, letterSpacing: -0.2 }}>
          {segment.title}
        </div>
        <div style={{ fontSize: 15, color: LILAC, marginTop: 2 }}>{segment.caption}</div>

        {segment.words.length > 0 && (
          <div style={{ fontSize: 17, marginTop: 10, lineHeight: 1.45, maxWidth: 1080 }}>
            {segment.words.map((w, i) => {
              const spoken = now >= w.start;
              const saying = now >= w.start && now <= w.end;
              return (
                <span
                  key={`${w.start}-${i}`}
                  style={{
                    color: spoken ? '#fff' : 'rgba(255,255,255,0.38)',
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
    </AbsoluteFill>
  );
};

/**
 * The capture for one stop: it plays, then freezes on its last frame for as
 * long as the narration still has to run.
 */
const Shot: React.FC<{ video: string; segment: Segment; fps: number }> = ({
  video,
  segment,
  fps,
}) => {
  const sec = (s: number) => Math.max(1, Math.round(s * fps));
  const plays = segment.capturePlays;

  return (
    <>
      {plays > 0 && (
        <Sequence durationInFrames={sec(plays)} layout="none">
          <OffthreadVideo
            src={staticFile(video)}
            startFrom={Math.round(segment.captureFrom * fps)}
            endAt={Math.round((segment.captureFrom + plays) * fps)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
          />
        </Sequence>
      )}
      {segment.hold > 0 && (
        <Sequence from={sec(plays)} durationInFrames={sec(segment.hold)} layout="none">
          {/* The last frame of the segment, held while the line finishes.
              An OffthreadVideo given a one-frame window renders that frame
              once and then nothing at all, which left half the first cut as
              bare background. <Freeze> pins the whole subtree to one frame,
              which is what actually holds a picture on screen. */}
          <Freeze frame={0}>
            <OffthreadVideo
              src={staticFile(video)}
              startFrom={Math.max(0, Math.round((segment.captureFrom + plays) * fps) - 1)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
            />
          </Freeze>
        </Sequence>
      )}
    </>
  );
};

export const Tour: React.FC<TourProps> = ({ video, segments }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const sec = (s: number) => Math.round(s * fps);

  const fade = interpolate(
    frame,
    [0, 0.8 * fps, durationInFrames - 1.8 * fps, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: PURPLE, opacity: fade }}>
      {segments.map((s) => (
        <Sequence
          key={`v-${s.n}`}
          from={sec(s.at)}
          durationInFrames={Math.max(1, sec(s.span))}
          layout="none"
        >
          <Shot video={video} segment={s} fps={fps} />
        </Sequence>
      ))}

      {/* Krio and Twi have no voice, so those cuts carry captions and no
          audio track at all rather than English over somebody's own language. */}
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
          <Caption segment={s} total={segments.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
