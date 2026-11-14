import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { Tour, type TourProps, type Segment } from './Tour';
// The schedule has to subtract this to keep a capped clip under its cap, so
// it owns the constant and this reads it rather than keeping a second copy.
import { TAIL } from '../lib/schedule.mjs';

const FPS = 30;

/**
 * Props come from --props on the command line, so one composition renders any
 * role. render.mjs builds them: the schedule has already fitted the capture
 * to the measured narration, so the composition only has to lay it out.
 */
export const RemotionRoot: React.FC = () => {
  const input = getInputProps() as Partial<TourProps>;
  const segments: Segment[] = input.segments ?? [];
  const seconds = (input.duration ?? 0) + TAIL;

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
        lang: input.lang ?? 'en',
        video: input.video ?? 'capture/member.webm',
        segments,
        duration: input.duration ?? 0,
      }}
    />
  );
};
