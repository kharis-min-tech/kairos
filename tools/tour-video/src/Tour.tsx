import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

/** One stop on the tour, as the recorder measured it. */
export interface Mark {
  n: number;
  title: string;
  caption: string;
  /** Seconds from the start of the capture. */
  start: number;
  end: number;
  /** Length of this stop's narration file, in seconds. */
  audio: number;
}

export interface TourProps {
  // Remotion types composition props as a record, so the index signature is
  // what lets a typed interface be passed to <Composition>.
  [key: string]: unknown;
  role: string;
  /** Path under public/, e.g. "capture/member.webm". */
  video: string;
  marks: Mark[];
  /** Length of the capture in seconds, from ffprobe. */
  captureDuration: number;
}

const PURPLE = '#3b0764';
const GOLD = '#f8b537';
const LILAC = '#e9dcff';

/**
 * The lower-third caption.
 *
 * This is the part that moved out of the browser. It used to be a div injected
 * into Kairos itself, which meant restyling or rewording a caption needed the
 * whole tour recorded again. Here it is a React component over the footage, so
 * the words and the design are editable without touching the recording.
 */
const Caption: React.FC<{ mark: Mark; total: number }> = ({ mark, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 0.35 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const lift = interpolate(frame, [0, 0.35 * fps], [14, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start' }}>
      <div
        style={{
          margin: '0 0 36px 40px',
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
          {`Step ${mark.n} of ${total}`}
        </div>
        <div style={{ fontSize: 23, fontWeight: 700, marginTop: 3, letterSpacing: -0.2 }}>
          {mark.title}
        </div>
        <div style={{ fontSize: 15, color: LILAC, marginTop: 2 }}>{mark.caption}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Tour: React.FC<TourProps> = ({ video, marks, captureDuration }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const sec = (s: number) => Math.round(s * fps);

  // Fade the whole frame in at the top and out at the tail.
  const fade = interpolate(
    frame,
    [0, 0.8 * fps, durationInFrames - 1.8 * fps, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: PURPLE, opacity: fade }}>
      {/* The capture can be shorter than the narration, so hold its last
          frame rather than cutting the closing line off. */}
      <OffthreadVideo
        src={staticFile(video)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        endAt={sec(captureDuration) - 1}
        muted
      />

      {marks.map((m) => (
        <Sequence
          key={`a-${m.n}`}
          from={sec(m.start)}
          durationInFrames={Math.max(1, sec(m.audio))}
          layout="none"
        >
          <Audio src={staticFile(`voice/${m.n.toString().padStart(2, '0')}.wav`)} />
        </Sequence>
      ))}

      {marks.map((m) => (
        <Sequence
          key={`c-${m.n}`}
          from={sec(m.start)}
          durationInFrames={Math.max(1, sec(m.end - m.start))}
        >
          <Caption mark={m} total={marks.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
