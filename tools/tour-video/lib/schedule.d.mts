/**
 * Types for the scheduler, which is plain JavaScript because the recorder and
 * the render script run it under node without a build step. The composition
 * imports TAIL from it, so TypeScript needs this much.
 */
export declare const GAP: number;
export declare const TAIL: number;

export interface ScheduleWord {
  word: string;
  start: number;
  end: number;
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
  hold: number;
  spoken: number;
  words: ScheduleWord[];
}

export declare function buildSchedule(
  marks: { n: number; start: number }[],
  stops: { n: number; duration: number; [key: string]: unknown }[],
  capture: number,
  opts?: { maxSeconds?: number },
): { segments: ScheduleSegment[]; duration: number };
