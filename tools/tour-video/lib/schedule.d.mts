/**
 * Types for the scheduler, which is plain JavaScript because the recorder and
 * the render script run it under node without a build step. The composition
 * imports TAIL and CROSS from it, so TypeScript needs this much.
 */
export declare const GAP: number;
export declare const TAIL: number;
export declare const CROSS: number;

export interface ScheduleWord {
  word: string;
  start: number;
  end: number;
}

/** A point in the capture, in capture pixels. */
export interface SchedulePoint {
  x: number;
  y: number;
}

export interface ScheduleClick extends SchedulePoint {
  /** Timeline seconds, already rescaled by the segment's playback rate. */
  at: number;
}

export interface ScheduleSegment {
  n: number;
  title: string;
  caption: string;
  audio: string | null;
  at: number;
  span: number;
  captureFrom: number;
  capturePlays: number;
  rate: number;
  playedFor: number;
  hold: number;
  spoken: number;
  focus: SchedulePoint | null;
  clicks: ScheduleClick[];
  words: ScheduleWord[];
}

export interface ScheduleGesture extends SchedulePoint {
  /** Seconds into the capture. */
  t: number;
  kind: 'move' | 'click' | 'scroll';
}

export declare function buildSchedule(
  marks: { n: number; start: number }[],
  stops: { n: number; duration: number; [key: string]: unknown }[],
  capture: number,
  opts?: { maxSeconds?: number; gestures?: ScheduleGesture[] },
): { segments: ScheduleSegment[]; duration: number; over: number };
