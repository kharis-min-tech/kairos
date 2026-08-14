'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { formatShortDate } from '@kairos/core';

/**
 * DateSelect — the application's standard date picker.
 *
 * A popover calendar with day / month / year views. Renders as either:
 *  - `variant="input"` (default) — full-width bordered field that visually
 *     matches the standard `<Input>` and `<CustomSelect>` components. Use in
 *     forms.
 *  - `variant="pill"` — compact chip with calendar icon. Use in toolbars,
 *     dashboard filter bars, and other dense control rows.
 *
 * Always controlled. Value is an ISO `YYYY-MM-DD` string (or empty string).
 * This is the only date-picker component in the app — do not use native
 * `<input type="date">` or other ad-hoc pickers.
 */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const POPOVER_WIDTH = 280;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

interface DateSelectProps {
  value?: string;
  onChange?: (iso: string) => void;
  /** Visual style of the trigger. Defaults to `"input"`. */
  variant?: 'input' | 'pill';
  placeholder?: string;
  /** Earliest selectable date (ISO `YYYY-MM-DD`). */
  minDate?: string;
  /** Latest selectable date (ISO `YYYY-MM-DD`). */
  maxDate?: string;
  /** Legacy: shorthand for `minDate = ${minYear}-01-01`. */
  minYear?: number;
  /** Legacy: shorthand for `maxDate = ${maxYear}-12-31`. */
  maxYear?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function DateSelect({
  value = '',
  onChange,
  variant = 'input',
  placeholder = 'Select date',
  minDate,
  maxDate,
  minYear,
  maxYear,
  disabled = false,
  id,
  className,
}: DateSelectProps) {
  const effectiveMinDate = minDate ?? (minYear ? `${minYear}-01-01` : undefined);
  const effectiveMaxDate = maxDate ?? (maxYear ? `${maxYear}-12-31` : undefined);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'day' | 'month' | 'year'>('day');
  const [viewMonth, setViewMonth] = useState<Date>(() => parseIso(value) ?? new Date());
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep the calendar's view month in sync when the external value changes
  // (e.g. form reset).
  useEffect(() => {
    const parsed = parseIso(value);
    if (parsed) setViewMonth(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = wrapperRef.current?.contains(target);
      const clickedPopover = popoverRef.current?.contains(target);
      if (!clickedTrigger && !clickedPopover) {
        setOpen(false);
        setView('day');
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setView('day');
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = wrapperRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const popoverHeight = popoverRef.current?.getBoundingClientRect().height ?? 360;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(POPOVER_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);
      const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
      const left = Math.min(
        Math.max(trigger.left, VIEWPORT_PADDING),
        maxLeft,
      );

      const spaceBelow = viewportHeight - trigger.bottom - POPOVER_GAP - VIEWPORT_PADDING;
      const spaceAbove = trigger.top - POPOVER_GAP - VIEWPORT_PADDING;
      const opensUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
      const top = opensUpward
        ? Math.max(VIEWPORT_PADDING, trigger.top - popoverHeight - POPOVER_GAP)
        : Math.min(trigger.bottom + POPOVER_GAP, viewportHeight - VIEWPORT_PADDING);
      const availableHeight = opensUpward
        ? Math.max(160, trigger.top - POPOVER_GAP - VIEWPORT_PADDING)
        : Math.max(160, viewportHeight - top - VIEWPORT_PADDING);

      setPopoverPosition({ top, left, width, maxHeight: availableHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, view, viewMonth]);

  const min = effectiveMinDate ? parseIso(effectiveMinDate) : null;
  const max = effectiveMaxDate ? parseIso(effectiveMaxDate) : null;
  const selected = parseIso(value);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const display = value ? formatShortDate(value, '') : '';
  const portalContainer =
    typeof document !== 'undefined'
      ? wrapperRef.current?.closest('[role="dialog"]') ?? document.body
      : null;

  const isDayDisabled = (d: Date) => {
    if (min && isBefore(d, min)) return true;
    if (max && isAfter(d, max)) return true;
    return false;
  };

  const isMonthDisabled = (year: number, monthIdx: number) => {
    const firstDay = startOfMonth(new Date(year, monthIdx, 1));
    const lastDay = endOfMonth(new Date(year, monthIdx, 1));
    if (max && isAfter(firstDay, max)) return true;
    if (min && isBefore(lastDay, min)) return true;
    return false;
  };

  const isYearDisabled = (year: number) => {
    if (max && year > max.getFullYear()) return true;
    if (min && year < min.getFullYear()) return true;
    return false;
  };

  const handleSelect = (d: Date) => {
    onChange?.(format(d, 'yyyy-MM-dd'));
    setOpen(false);
    setView('day');
  };

  const currentYear = viewMonth.getFullYear();
  const yearGridStart = Math.floor(currentYear / 12) * 12;
  const yearGrid = Array.from({ length: 12 }, (_, i) => yearGridStart + i);

  // Trigger styles
  const triggerClass =
    variant === 'pill'
      ? 'inline-flex items-center gap-2 rounded bg-[#f0f0f3] px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-150 hover:bg-[#e6e6ea] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60'
      : 'flex h-10 w-full items-center justify-between gap-2 rounded border border-input/15 bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-input/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const wrapperClass = variant === 'pill' ? 'relative inline-block' : 'relative w-full';

  return (
    <div ref={wrapperRef} className={`${wrapperClass} ${className ?? ''}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        {variant === 'pill' ? (
          <>
            <Calendar className="h-4 w-4 text-primary" />
            <span className={display ? 'text-foreground' : 'text-muted-foreground'}>
              {display || placeholder}
            </span>
          </>
        ) : (
          <>
            <span className={display ? 'text-foreground' : 'text-muted-foreground'}>
              {display || placeholder}
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </button>
      {open && portalContainer &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-[280px] overflow-y-auto rounded bg-card p-4 shadow-ambient-lg dark:bg-[#1a1a1f]"
            style={{
              top: popoverPosition?.top ?? 0,
              left: popoverPosition?.left ?? 0,
              width: popoverPosition?.width,
              maxHeight: popoverPosition?.maxHeight,
              visibility: popoverPosition ? 'visible' : 'hidden',
              pointerEvents: 'auto',
            }}
          >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (view === 'day') setViewMonth((m) => addMonths(m, -1));
                else if (view === 'month') setViewMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1));
                else setViewMonth((m) => new Date(m.getFullYear() - 12, m.getMonth(), 1));
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'day' ? 'month' : view === 'month' ? 'year' : 'day')}
              className="rounded px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {view === 'day' && format(viewMonth, 'MMMM yyyy')}
              {view === 'month' && format(viewMonth, 'yyyy')}
              {view === 'year' && `${yearGridStart} – ${yearGridStart + 11}`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (view === 'day') setViewMonth((m) => addMonths(m, 1));
                else if (view === 'month') setViewMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1));
                else setViewMonth((m) => new Date(m.getFullYear() + 12, m.getMonth(), 1));
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day grid */}
          {view === 'day' && (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="flex h-8 items-center justify-center text-xs font-semibold text-muted-foreground">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const inMonth = isSameMonth(d, viewMonth);
                  const isSelected = selected ? isSameDay(d, selected) : false;
                  const isToday = isSameDay(d, new Date());
                  const dis = isDayDisabled(d);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={dis}
                      onClick={() => handleSelect(d)}
                      className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm hover:bg-primary/90'
                          : dis
                          ? 'cursor-not-allowed text-muted-foreground/30'
                          : inMonth
                          ? 'text-foreground hover:bg-muted'
                          : 'text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground'
                      } ${isToday && !isSelected ? 'ring-1 ring-primary/40' : ''}`}
                    >
                      {format(d, 'd')}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Month grid */}
          {view === 'month' && (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS_SHORT.map((m, idx) => {
                const dis = isMonthDisabled(currentYear, idx);
                const isSelected =
                  !!selected && selected.getFullYear() === currentYear && selected.getMonth() === idx;
                const isCurrent = viewMonth.getMonth() === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={dis}
                    onClick={() => {
                      setViewMonth(new Date(currentYear, idx, 1));
                      setView('day');
                    }}
                    className={`flex h-12 items-center justify-center rounded text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm hover:bg-primary/90'
                        : dis
                        ? 'cursor-not-allowed text-muted-foreground/30'
                        : 'text-foreground hover:bg-muted'
                    } ${isCurrent && !isSelected ? 'ring-1 ring-primary/40' : ''}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Year grid */}
          {view === 'year' && (
            <div className="grid grid-cols-3 gap-2">
              {yearGrid.map((y) => {
                const dis = isYearDisabled(y);
                const isSelected = !!selected && selected.getFullYear() === y;
                const isCurrent = currentYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={dis}
                    onClick={() => {
                      setViewMonth(new Date(y, viewMonth.getMonth(), 1));
                      setView('month');
                    }}
                    className={`flex h-12 items-center justify-center rounded text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm hover:bg-primary/90'
                        : dis
                        ? 'cursor-not-allowed text-muted-foreground/30'
                        : 'text-foreground hover:bg-muted'
                    } ${isCurrent && !isSelected ? 'ring-1 ring-primary/40' : ''}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border/10 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange?.('');
                setOpen(false);
                setView('day');
              }}
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                if (!isDayDisabled(today)) {
                  setViewMonth(today);
                  handleSelect(today);
                }
              }}
              className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Today
            </button>
          </div>
          </div>,
          portalContainer,
        )}
    </div>
  );
}
