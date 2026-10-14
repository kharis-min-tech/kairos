import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { Tour, type TourProps, type Mark } from './Tour';

const FPS = 30;
/** Seconds held after the last line so the closing words are not clipped. */
const TAIL = 2;

/**
 * Props come from --props on the command line, so one composition renders any
 * role. render.mjs builds them from the recorder's marks file.
 */
export const RemotionRoot: React.FC = () => {
  const input = getInputProps() as Partial<TourProps>;
  const marks: Mark[] = input.marks ?? [];
  const lastLineEnds = marks.reduce((max, m) => Math.max(max, m.start + m.audio), 0);
  const seconds = Math.max(input.captureDuration ?? 0, lastLineEnds) + TAIL;

  return (
    <Composition
      id="Tour"
      component={Tour}
      durationInFrames={Math.max(1, Math.round(seconds * FPS))}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        role: input.role ?? 'member',
        video: input.video ?? 'capture/member.webm',
        marks,
        captureDuration: input.captureDuration ?? 0,
      }}
    />
  );
};
