'use client';

import { useEffect, useState } from 'react';

/**
 * DateSelect — a styled three-part (Month / Day / Year) date selector.
 * Works with react-hook-form via controlled value (YYYY-MM-DD string) or
 * as a standalone controlled component.
 *
 * Props:
 *  value       — ISO date string "YYYY-MM-DD" (controlled)
 *  onChange    — called with "YYYY-MM-DD" when all three parts are filled,
 *                or "" when all are cleared
 *  minYear     — earliest year shown in the dropdown (default: 1920)
 *  maxYear     — latest year shown (default: current year)
 *  disabled    — disables all three selects
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

function parseValue(value: string): [number, number, number] {
  const parts = value ? value.split('-') : [];
  return [
    parts[0] ? parseInt(parts[0], 10) : 0,
    parts[1] ? parseInt(parts[1], 10) : 0,
    parts[2] ? parseInt(parts[2], 10) : 0,
  ];
}

interface DateSelectProps {
  value?: string;
  onChange?: (iso: string) => void;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  className?: string;
}

export function DateSelect({
  value = '',
  onChange,
  minYear = 1920,
  maxYear = new Date().getFullYear(),
  disabled = false,
  className,
}: DateSelectProps) {
  const [year, setYear] = useState<number>(() => parseValue(value)[0]);
  const [month, setMonth] = useState<number>(() => parseValue(value)[1]);
  const [day, setDay] = useState<number>(() => parseValue(value)[2]);

  // Sync local state when the external value is reset (e.g. form.reset())
  useEffect(() => {
    const [y, m, d] = parseValue(value);
    setYear(y);
    setMonth(m);
    setDay(d);
  }, [value]);

  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  function handleChange(nextYear: number, nextMonth: number, nextDay: number) {
    // Clamp day if it exceeds the days available in the new month/year
    const max = daysInMonth(nextMonth, nextYear);
    const clampedDay = nextDay > max ? max : nextDay;

    setYear(nextYear);
    setMonth(nextMonth);
    setDay(clampedDay);

    if (!onChange) return;
    if (!nextYear && !nextMonth && !clampedDay) { onChange(''); return; }
    if (nextYear && nextMonth && clampedDay) {
      const m = String(nextMonth).padStart(2, '0');
      const d = String(clampedDay).padStart(2, '0');
      onChange(`${nextYear}-${m}-${d}`);
    }
  }

  const selectClass =
    'flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {/* Month */}
      <select
        aria-label="Month"
        value={month || ''}
        disabled={disabled}
        onChange={(e) => handleChange(year, Number(e.target.value), day)}
        className={selectClass}
      >
        <option value="">Month</option>
        {MONTHS.map((name, idx) => (
          <option key={name} value={idx + 1}>{name}</option>
        ))}
      </select>

      {/* Day */}
      <select
        aria-label="Day"
        value={day || ''}
        disabled={disabled}
        onChange={(e) => handleChange(year, month, Number(e.target.value))}
        className={`${selectClass} w-20`}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Year */}
      <select
        aria-label="Year"
        value={year || ''}
        disabled={disabled}
        onChange={(e) => handleChange(Number(e.target.value), month, day)}
        className={`${selectClass} w-28`}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
