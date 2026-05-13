'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** "default" fills available width like an Input; "sm" is compact inline */
  size?: 'sm' | 'default';
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  id,
  className,
  size = 'default',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  const toggleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedPanelHeight = Math.min(options.length * 36 + 8, 300);
      setOpenUpward(spaceBelow < estimatedPanelHeight);
    }
    setOpen((o) => !o);
  };

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label;

  const panel = (
    <div
      className={cn(
        'absolute left-0 z-50 rounded-xl bg-white dark:bg-[#1c1c1f] shadow-lg border border-foreground/[0.08] py-1',
        openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        size === 'sm' ? 'min-w-max' : 'min-w-full',
      )}
    >
      {options.map((opt) => (
        <button
          key={`${opt.value}-${opt.label}`}
          type="button"
          disabled={opt.disabled}
          onClick={() => {
            onValueChange(opt.value);
            setOpen(false);
          }}
          className={cn(
            'w-full text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            size === 'sm'
              ? 'px-3 py-1.5 text-xs font-semibold'
              : 'px-3 py-2 text-sm font-medium',
            value === opt.value && !opt.disabled
              ? 'bg-primary/10 text-primary dark:bg-[#5D3FD3]/20 dark:text-violet-300'
              : 'text-foreground hover:bg-foreground/[0.05]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (size === 'sm') {
    return (
      <div ref={ref} className={cn('relative inline-block', className)}>
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={toggleOpen}
          onKeyDown={handleKeyDown}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#f0f0f3] dark:bg-white/[0.06] text-xs font-semibold text-foreground transition-colors hover:bg-[#e4e4e8] dark:hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{displayLabel ?? placeholder}</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 text-muted-foreground transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>
        {open && panel}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-input/15 bg-background px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          displayLabel ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span>{displayLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-150 flex-shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && panel}
    </div>
  );
}
