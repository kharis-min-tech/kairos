import { cn } from '../lib/utils';

export interface StatusTextProps {
  /** The status as a person reads it: "Reviewed", "Probation failed". */
  label: string;
  /**
   * True when this status is a job somebody still owes. Derive it from
   * `isAwaitingAction` in `@kairos/types` rather than deciding per screen.
   */
  awaiting?: boolean;
  className?: string;
}

/**
 * One status, down a list.
 *
 * Statuses used to be filled pills, one tint per value, so a list of twenty
 * rows was twenty coloured areas at equal weight and none of them stood out.
 * Colour here means attention: the one value waiting on a person takes the
 * gold dot, every other value is plain text. A list with nothing pending is
 * monochrome, which is the correct amount of noise for a list with nothing
 * pending.
 *
 * The dot is decorative. The label carries the meaning, so a screen reader
 * and a monochrome display both read the same thing.
 */
export function StatusText({ label, awaiting = false, className }: StatusTextProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm',
        awaiting ? 'font-semibold text-[#b8860b] dark:text-[#f8b537]' : 'text-muted-foreground',
        className,
      )}
    >
      {awaiting ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-[#b8860b] dark:bg-[#f8b537]"
        />
      ) : null}
      {label}
    </span>
  );
}
