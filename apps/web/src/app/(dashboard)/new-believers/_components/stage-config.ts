import type { NewBelieverStageValue } from '@kairos/types';

export interface StageDef {
  value: NewBelieverStageValue;
  label: string;
  topic?: string;
  /** Tailwind class for the leading dot in the column header / card identity row */
  dotColor: string;
}

/**
 * Single source of truth for new-believer pipeline stages.
 * Order here must mirror the `NewBelieverStage` enum in `@kairos/types`.
 */
export const STAGES: StageDef[] = [
  { value: 'enrolled',   label: 'Enrolled',            dotColor: 'bg-slate-400' },
  { value: 'session-1',  label: 'Session 1', topic: 'Foundations of Faith',         dotColor: 'bg-sky-500' },
  { value: 'session-2',  label: 'Session 2', topic: 'Who is a Christian',           dotColor: 'bg-indigo-500' },
  { value: 'session-3',  label: 'Session 3', topic: 'Working out your Salvation',   dotColor: 'bg-violet-500' },
  { value: 'session-4',  label: 'Session 4', topic: 'The Importance of Fellowship', dotColor: 'bg-amber-500' },
  { value: 'completed',  label: 'Completed',           dotColor: 'bg-emerald-500' },
  { value: 'integrated', label: 'Joined a Department', dotColor: 'bg-[#f8b537]' },
];

export const SESSION_STAGE_VALUES: ReadonlySet<NewBelieverStageValue> = new Set([
  'session-1',
  'session-2',
  'session-3',
  'session-4',
]);

/** Cap on cards selected in a single bulk-advance action. */
export const MAX_BULK_SELECT = 5;

/** Minimum days since last update before an enrollment is flagged "stale". */
export const STALE_DAYS_THRESHOLD = 7;

export function getStageByValue(value: string): StageDef | undefined {
  return STAGES.find((s) => s.value === value);
}

export function getNextStage(value: string): StageDef | undefined {
  const idx = STAGES.findIndex((s) => s.value === value);
  if (idx < 0 || idx >= STAGES.length - 1) return undefined;
  return STAGES[idx + 1];
}

/**
 * Returns the number of days since `updatedAt` if it exceeds the
 * `STALE_DAYS_THRESHOLD` and the stage is still in progress; otherwise null.
 */
export function getStaleDays(
  updatedAt: string | Date,
  stage: string,
): number | null {
  if (stage === 'completed' || stage === 'integrated') return null;
  const last = new Date(updatedAt).getTime();
  if (Number.isNaN(last)) return null;
  const days = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
  return days >= STALE_DAYS_THRESHOLD ? days : null;
}
