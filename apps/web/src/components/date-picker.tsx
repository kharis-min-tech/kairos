'use client';

import { useState, useRef, useEffect } from 'react';

type CalendarView = 'days' | 'months' | 'years';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  highlightedDates?: string[]; // Array of YYYY-MM-DD strings to highlight
  alwaysOpen?: boolean; // Keep calendar always visible (no dropdown)
}

export function DatePicker({ value, onChange, label, placeholder = 'Select date', className, highlightedDates, alwaysOpen }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CalendarView>('days');
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDay = (day: number, isCurrentMonth: boolean) => {
    const d = new Date(viewDate);
    if (!isCurrentMonth) return;
    d.setDate(day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    if (!alwaysOpen) setIsOpen(false);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const d = new Date(viewDate);
    d.setMonth(monthIndex);
    setViewDate(d);
    setView('days');
  };

  const handleSelectYear = (year: number) => {
    const d = new Date(viewDate);
    d.setFullYear(year);
    setViewDate(d);
    setView('months');
  };

  const handlePrev = () => {
    const d = new Date(viewDate);
    if (view === 'days') d.setMonth(d.getMonth() - 1);
    else if (view === 'months') d.setFullYear(d.getFullYear() - 1);
    else d.setFullYear(d.getFullYear() - 12);
    setViewDate(d);
  };

  const handleNext = () => {
    const d = new Date(viewDate);
    if (view === 'days') d.setMonth(d.getMonth() + 1);
    else if (view === 'months') d.setFullYear(d.getFullYear() + 1);
    else d.setFullYear(d.getFullYear() + 12);
    setViewDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Generate calendar days
  const getDaysGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const highlightedSet = new Set(highlightedDates ?? []);

    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isHighlighted: boolean }> = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false, isSelected: false, isHighlighted: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      const isSelected = selectedDate ? selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === i : false;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isHighlighted = highlightedSet.has(dateStr);
      days.push({ day: i, isCurrentMonth: true, isToday, isSelected, isHighlighted });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, isToday: false, isSelected: false, isHighlighted: false });
    }

    return days;
  };

  // Year range for year view
  const getYearRange = () => {
    const currentYear = viewDate.getFullYear();
    const startYear = currentYear - (currentYear % 12);
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  };

  const headerText = () => {
    if (view === 'days') {
      return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    } else if (view === 'months') {
      return `${viewDate.getFullYear()}`;
    } else {
      const years = getYearRange();
      return `${years[0]} – ${years[years.length - 1]}`;
    }
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })
    : '';

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {!alwaysOpen && label && <label className="text-sm font-medium">{label}</label>}
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${label ? 'mt-1' : ''} flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm hover:bg-accent/50 transition-colors`}
        >
          <span className={displayValue ? '' : 'text-muted-foreground'}>
            {displayValue || placeholder}
          </span>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </button>
      )}

      {(isOpen || alwaysOpen) && (
        <div className={alwaysOpen ? 'w-full rounded-xl border bg-popover p-4' : 'absolute z-50 mt-1 w-72 rounded-xl border bg-popover p-4 shadow-lg animate-in fade-in-0 zoom-in-95'}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={handlePrev} className="p-1 rounded hover:bg-accent transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'years')}
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              {headerText()}
            </button>
            <button type="button" onClick={handleNext} className="p-1 rounded hover:bg-accent transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Days View */}
          {view === 'days' && (
            <div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getDaysGrid().map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectDay(d.day, d.isCurrentMonth)}
                    disabled={!d.isCurrentMonth}
                    className={`relative h-9 w-9 mx-auto rounded-full text-sm transition-colors flex items-center justify-center
                      ${!d.isCurrentMonth ? 'text-muted-foreground/40' : ''}
                      ${d.isCurrentMonth && !d.isSelected && !d.isToday && !d.isHighlighted ? 'hover:bg-accent' : ''}
                      ${d.isCurrentMonth && d.isHighlighted && !d.isSelected ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20' : ''}
                      ${d.isToday && !d.isSelected ? 'text-primary font-bold' : ''}
                      ${d.isSelected ? 'bg-primary text-primary-foreground font-bold' : ''}
                    `}
                  >
                    {d.day}
                    {d.isHighlighted && !d.isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Months View */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, i) => {
                const isSelected = selectedDate && selectedDate.getMonth() === i && selectedDate.getFullYear() === viewDate.getFullYear();
                const isCurrent = today.getMonth() === i && today.getFullYear() === viewDate.getFullYear();
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMonth(i)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                      ${isCurrent && !isSelected ? 'border border-primary/50 text-primary' : ''}
                      ${!isSelected && !isCurrent ? 'hover:bg-accent' : ''}
                    `}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Years View */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-2">
              {getYearRange().map((y) => {
                const isSelected = selectedDate && selectedDate.getFullYear() === y;
                const isCurrent = today.getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleSelectYear(y)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                      ${isCurrent && !isSelected ? 'border border-primary/50 text-primary' : ''}
                      ${!isSelected && !isCurrent ? 'hover:bg-accent' : ''}
                    `}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <button type="button" onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
            <button type="button" onClick={handleToday} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
