'use client';

import { CustomSelect } from './custom-select';
import { cn } from '../lib/utils';

export interface TimeSelectProps {
  /** Time as 24-hour "HH:MM" string, or empty string for unset. */
  value: string;
  onValueChange: (value: string) => void;
  /** Minute step (default 5). */
  minuteStep?: number;
  /** Render an explicit "—" option allowing the user to clear. */
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
}

const HOURS: string[] = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0'),
);

function buildMinutes(step: number): string[] {
  const out: string[] = [];
  for (let m = 0; m < 60; m += step) out.push(String(m).padStart(2, '0'));
  return out;
}

/**
 * Design-system 24-hour time selector built from two CustomSelects
 * (hours and minutes). Emits `"HH:MM"` strings, or `""` when cleared.
 */
export function TimeSelect({
  value,
  onValueChange,
  minuteStep = 5,
  allowEmpty = true,
  disabled = false,
  className,
}: TimeSelectProps) {
  const minutes = buildMinutes(minuteStep);
  const [hh, mm] = value && /^\d{2}:\d{2}$/.test(value) ? value.split(':') as [string, string] : ['', ''];

  const setHour = (h: string) => {
    if (!h) {
      onValueChange('');
      return;
    }
    onValueChange(`${h}:${mm || minutes[0]}`);
  };
  const setMinute = (m: string) => {
    onValueChange(`${hh || '09'}:${m}`);
  };

  const hourOptions = [
    ...(allowEmpty ? [{ value: '', label: 'HH' }] : []),
    ...HOURS.map((h) => ({ value: h, label: h })),
  ];
  const minuteOptions = minutes.map((m) => ({ value: m, label: m }));

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <CustomSelect
        value={hh}
        onValueChange={setHour}
        options={hourOptions}
        placeholder="HH"
        disabled={disabled}
        size="sm"
        className="w-[72px]"
      />
      <span className="text-sm text-muted-foreground" aria-hidden="true">
        :
      </span>
      <CustomSelect
        value={mm}
        onValueChange={setMinute}
        options={minuteOptions}
        placeholder="MM"
        disabled={disabled || !hh}
        size="sm"
        className="w-[72px]"
      />
    </div>
  );
}
