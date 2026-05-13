'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export interface NumberStepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** Optional suffix shown after the value, e.g. "d" or "days" */
  suffix?: string;
  ariaLabel?: string;
}

export function NumberStepper({
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
  className,
  suffix,
  ariaLabel,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const decrement = () => onValueChange(clamp(value - step));
  const increment = () => onValueChange(clamp(value + step));

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-[4px] bg-[#f0f0f3] dark:bg-white/[0.06] px-1.5 text-sm font-semibold text-foreground',
        disabled && 'opacity-50',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || atMin}
        aria-label="Decrease"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <span className="flex-1 text-center tabular-nums">
        {value.toLocaleString()}
        {suffix ? <span className="ml-0.5 text-muted-foreground">{suffix}</span> : null}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || atMax}
        aria-label="Increase"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
