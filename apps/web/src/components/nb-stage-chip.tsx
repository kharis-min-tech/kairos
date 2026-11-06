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

/**
 * A member's current New Believers stage, on a roster row.
 *
 * A stage is a position in a pipeline, not a status: nobody is waiting on
 * "Session 2", it is simply where someone has got to. It used to render as
 * one of seven tinted chips, a sky-to-violet-to-gold rainbow that made a
 * roster look like a legend for something, and the colours were in no order
 * a reader could learn. The words already say it, so the words are all that
 * is left.
 *
 * Renders nothing when the stage is null: no active enrollment, or a caller
 * who is not privileged to see it.
 */
export function NbStageChip({ stage }: NbStageChipProps) {
  if (!stage) return null;
  const label = STAGE_LABELS[stage] ?? stage;
  return (
    <span
      className="whitespace-nowrap text-xs text-muted-foreground"
      title={`Current New Believers stage: ${label}`}
    >
      {label}
    </span>
  );
}
