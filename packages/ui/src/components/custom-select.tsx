'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const POPOVER_GAP = 6;
const VIEWPORT_PADDING = 12;

interface PanelPosition {
  top: number;
  left: number;
  /** Set for the default size, so the panel matches the field. `sm` hugs its options instead. */
  width: number | undefined;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
}

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
  /**
   * Extra classes for the trigger itself, merged over its own. For surfaces
   * whose fields are not the dashboard's -- the marketing pages size and
   * round theirs differently. The panel is unaffected.
   */
  triggerClassName?: string;
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
  triggerClassName,
  size = 'default',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = ref.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedTrigger && !clickedPanel) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;

      const spaceBelow = window.innerHeight - rect.bottom;
      const panelHeight = panelRef.current?.getBoundingClientRect().height
        ?? Math.min(options.length * 36 + 8, 300);
      const maxWidth = Math.max(120, window.innerWidth - VIEWPORT_PADDING * 2);
      const minWidth = Math.min(rect.width, maxWidth);
      /*
       * The panel is sized from the trigger, not from its own content.
       *
       * Measuring the content is what this used to do, and it cannot work
       * here: the options are `w-full`, so their width is a percentage of
       * the panel that is itself being sized by them. Chrome resolves that
       * cycle by handing each option the full available width, so the
       * measurement came back as roughly the whole window -- which then set
       * `left` to the viewport padding and pinned a window-wide panel to the
       * left edge of the screen, nowhere near the field that opened it.
       *
       * `sm` keeps the old behaviour because it is a different shape of
       * control: it opts into `w-max`, so its panel really does hug its
       * options and has no `w-full` cycle to fall into.
       */
      const measured = size === 'sm'
        ? panelRef.current?.getBoundingClientRect().width ?? rect.width
        : rect.width;
      const panelWidth = Math.min(Math.max(measured, minWidth), maxWidth);
      const opensUpward =
        spaceBelow - POPOVER_GAP - VIEWPORT_PADDING < panelHeight
        && rect.top > spaceBelow;
      const top = opensUpward
        ? Math.max(VIEWPORT_PADDING, rect.top - panelHeight - POPOVER_GAP)
        : Math.min(rect.bottom + POPOVER_GAP, window.innerHeight - VIEWPORT_PADDING);
      const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - panelWidth - VIEWPORT_PADDING);
      const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxLeft);
      const maxHeight = opensUpward
        ? Math.max(120, rect.top - POPOVER_GAP - VIEWPORT_PADDING)
        : Math.max(120, window.innerHeight - top - VIEWPORT_PADDING);

      setPanelPosition({
        top,
        left,
        width: size === 'sm' ? undefined : panelWidth,
        minWidth,
        maxWidth,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, options.length, size]);

  const toggleOpen = () => {
    setOpen((o) => !o);
  };

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label;
  const portalContainer =
    typeof document !== 'undefined'
      ? ref.current?.closest('[role="dialog"]') ?? document.body
      : null;

  const panel = open && portalContainer
    ? createPortal(
        <div
          ref={panelRef}
          className={cn(
            'fixed z-50 max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl bg-white dark:bg-[#1c1c1f] shadow-lg border border-foreground/[0.08] py-1',
            size === 'sm' && 'w-max',
          )}
          style={{
            top: panelPosition?.top ?? 0,
            left: panelPosition?.left ?? 0,
            width: panelPosition?.width,
            minWidth: panelPosition?.minWidth,
            maxWidth: panelPosition?.maxWidth,
            maxHeight: panelPosition?.maxHeight,
            visibility: panelPosition ? 'visible' : 'hidden',
            pointerEvents: 'auto',
          }}
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
        </div>,
        portalContainer,
      )
    : null;

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
        {panel}
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
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input/15 bg-background px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          displayLabel ? 'text-foreground' : 'text-muted-foreground',
          triggerClassName,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{displayLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-150 flex-shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>
      {panel}
    </div>
  );
}
