interface NbStageChipProps {
  stage: string | null | undefined;
}

const STAGE_LABELS: Record<string, string> = {
  enrolled: 'NB Enrolled',
  'session-1': 'NB Session 1',
  'session-2': 'NB Session 2',
  'session-3': 'NB Session 3',
  'session-4': 'NB Session 4',
  completed: 'NB Completed',
  integrated: 'Joined a Dept',
};

const STAGE_TONE: Record<string, string> = {
  enrolled: 'bg-muted/60 text-muted-foreground',
  'session-1': 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  'session-2': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'session-3': 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  'session-4': 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]',
  completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  integrated: 'bg-[#5D3FD3]/15 text-[#5D3FD3]',
};

/**
 * Small badge surfacing a member's current New Believers stage on a roster row.
 * Renders nothing when the stage is null (no active enrollment, or caller is not
 * privileged to see it).
 */
export function NbStageChip({ stage }: NbStageChipProps) {
  if (!stage) return null;
  const label = STAGE_LABELS[stage] ?? stage;
  const tone = STAGE_TONE[stage] ?? 'bg-muted/60 text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title={`Current New Believers stage: ${label}`}
    >
      {label}
    </span>
  );
}
