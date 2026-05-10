'use client';

import { useState, useRef, useEffect } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface MonthDayPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  max?: string;
  min?: string;
  label: string;
}

type View = 'year' | 'month' | 'day';

export function MonthDayPicker({ value, onChange, max, min, label }: MonthDayPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]!;
  const selected = value ? new Date(value + 'T00:00:00') : null;

  function formatDisplay() {
    if (!value) return label;
    const d = new Date(value + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isDisabled(dateStr: string) {
    if (max && dateStr > max) return true;
    if (min && dateStr < min) return true;
    return false;
  }

  // ── Year view ──────────────────────────────────────────
  function YearView() {
    const startYear = Math.floor(cursor.year / 10) * 10;
    const years = Array.from({ length: 12 }, (_, i) => startYear + i - 1);
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCursor(c => ({ ...c, year: c.year - 10 }))} className="p-1 hover:bg-slate-100 rounded text-slate-500">‹</button>
          <span className="font-semibold text-slate-700">{startYear} – {startYear + 9}</span>
          <button onClick={() => setCursor(c => ({ ...c, year: c.year + 10 }))} className="p-1 hover:bg-slate-100 rounded text-slate-500">›</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map(y => (
            <button
              key={y}
              onClick={() => { setCursor(c => ({ ...c, year: y })); setView('month'); }}
              className={`py-2 rounded-lg text-sm font-medium transition-colors
                ${y === cursor.year ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-100'}
                ${y < startYear || y > startYear + 9 ? 'text-slate-300' : ''}
              `}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Month view ─────────────────────────────────────────
  function MonthView() {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCursor(c => ({ ...c, year: c.year - 1 }))} className="p-1 hover:bg-slate-100 rounded text-slate-500">‹</button>
          <button onClick={() => setView('year')} className="font-semibold text-slate-700 hover:bg-slate-100 px-2 py-1 rounded">
            {cursor.year}
          </button>
          <button onClick={() => setCursor(c => ({ ...c, year: c.year + 1 }))} className="p-1 hover:bg-slate-100 rounded text-slate-500">›</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((m, i) => {
            const isCurrent = cursor.year === today.getFullYear() && i === today.getMonth();
            const isSelected = selected && cursor.year === selected.getFullYear() && i === selected.getMonth();
            // Disable future months beyond max
            const firstOfMonth = `${cursor.year}-${String(i + 1).padStart(2, '0')}-01`;
            const disabled = (max && firstOfMonth > max) || (min && `${cursor.year}-${String(i + 1).padStart(2, '0')}-31` < min);
            return (
              <button
                key={m}
                disabled={!!disabled}
                onClick={() => { setCursor(c => ({ ...c, month: i })); setView('day'); }}
                className={`py-3 rounded-xl text-sm font-medium transition-colors
                  ${isSelected ? 'bg-violet-600 text-white' : ''}
                  ${isCurrent && !isSelected ? 'border border-slate-300 text-slate-700' : ''}
                  ${!isSelected && !isCurrent ? 'text-slate-700 hover:bg-slate-100' : ''}
                  ${disabled ? 'text-slate-300 cursor-not-allowed hover:bg-transparent' : ''}
                `}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Day view ───────────────────────────────────────────
  function DayView() {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const daysInPrev = new Date(cursor.year, cursor.month, 0).getDate();

    const cells: Array<{ day: number; current: boolean }> = [];
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const d = new Date(cursor.year, cursor.month - 1, 1);
              setCursor({ year: d.getFullYear(), month: d.getMonth() });
            }}
            className="p-1 hover:bg-slate-100 rounded text-slate-500"
          >‹</button>
          <button onClick={() => setView('month')} className="font-semibold text-slate-700 hover:bg-slate-100 px-2 py-1 rounded">
            {MONTHS[cursor.month]} {cursor.year}
          </button>
          <button
            onClick={() => {
              const d = new Date(cursor.year, cursor.month + 1, 1);
              setCursor({ year: d.getFullYear(), month: d.getMonth() });
            }}
            className="p-1 hover:bg-slate-100 rounded text-slate-500"
          >›</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((cell, idx) => {
            if (!cell.current) return <div key={idx} className="text-center py-2 text-xs text-slate-300">{cell.day}</div>;
            const dateStr = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = value === dateStr;
            const disabled = isDisabled(dateStr);
            return (
              <button
                key={idx}
                disabled={disabled}
                onClick={() => { onChange(dateStr); setOpen(false); }}
                className={`text-center py-2 text-sm rounded-lg transition-colors mx-0.5
                  ${isSelected ? 'border-2 border-slate-400 font-semibold text-slate-700' : ''}
                  ${isToday && !isSelected ? 'text-violet-600 font-bold' : ''}
                  ${!isSelected && !isToday ? 'text-slate-700 hover:bg-slate-100' : ''}
                  ${disabled ? 'text-slate-300 cursor-not-allowed hover:bg-transparent' : ''}
                `}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); setView('day'); }}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 rounded-lg text-sm text-slate-200 hover:bg-slate-600/60 transition-colors"
      >
        <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={value ? 'text-slate-200' : 'text-slate-400'}>{formatDisplay()}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl p-4 w-72 border border-slate-100">
          {view === 'year' && <YearView />}
          {view === 'month' && <MonthView />}
          {view === 'day' && <DayView />}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const t = new Date();
                setCursor({ year: t.getFullYear(), month: t.getMonth() });
                onChange(todayStr);
                setOpen(false);
              }}
              className="text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
