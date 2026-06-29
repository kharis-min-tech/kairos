'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

// ── Context ───────────────────────────────────────────────
//
// Threads the controlled active value + onChange through the subtree so
// triggers and panels don't need to receive them by prop. Trigger refs are
// registered into the context so keyboard nav (ArrowLeft/Right, Home/End)
// can move focus across siblings.

interface TabsContextValue {
  value: string;
  onValueChange: (next: string) => void;
  /** Stable id prefix derived from useId() — used to wire trigger↔panel aria. */
  baseId: string;
  /** Registry of trigger nodes in insertion order, for keyboard nav. */
  registerTrigger: (value: string, node: HTMLButtonElement | null) => void;
  /** Ordered values matching trigger registration. */
  getOrderedValues: () => string[];
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <Tabs>.`);
  }
  return ctx;
}

// Helpers to derive stable per-value ids from the Tabs baseId. Used by both
// the trigger (for its own id + aria-controls) and the panel (for aria-labelledby).
function triggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`;
}
function panelId(baseId: string, value: string) {
  return `${baseId}-panel-${value}`;
}

// ── Tabs root ─────────────────────────────────────────────
//
// Controlled only. Both consumers in apps/web already manage tab state via
// useState, so we don't pay the dual-mode complexity tax.

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    const baseId = React.useId();

    // Trigger registry — Map preserves insertion order, which matches DOM order
    // since registration happens in effect-order. We expose getOrderedValues()
    // rather than the Map itself so callers can't accidentally mutate it.
    const triggersRef = React.useRef(new Map<string, HTMLButtonElement>());

    const registerTrigger = React.useCallback(
      (val: string, node: HTMLButtonElement | null) => {
        if (node) {
          triggersRef.current.set(val, node);
        } else {
          triggersRef.current.delete(val);
        }
      },
      [],
    );

    const getOrderedValues = React.useCallback(
      () => Array.from(triggersRef.current.keys()),
      [],
    );

    const ctx = React.useMemo<TabsContextValue>(
      () => ({ value, onValueChange, baseId, registerTrigger, getOrderedValues }),
      [value, onValueChange, baseId, registerTrigger, getOrderedValues],
    );

    return (
      <TabsContext.Provider value={ctx}>
        <div ref={ref} className={cn('space-y-3', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

// ── TabsList ──────────────────────────────────────────────
//
// Container styling matches the established Kairos selector pattern
// (PipelineToolbar sort selector, etc.): muted gray surface in light mode,
// translucent white surface in dark. No border — the surface tier shift
// alone delineates the control per DESIGN.md ("no 1px solid borders for
// sectioning"). role="tablist" + accepts aria-label/labelledby.

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06]',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

// ── TabsTrigger ───────────────────────────────────────────
//
// Active state: in light mode the trigger lifts to a white "card" with a
// soft shadow (matches PipelineToolbar / SortSelector pattern); in dark mode
// it fills with Modern Sanctuary primary (#5D3FD3). This dual treatment is
// the established Kairos selector pattern — dark surfaces use the brand
// color, light surfaces use surface elevation. Inactive triggers stay muted
// in both modes.

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, onKeyDown, ...props }, forwardedRef) => {
    const { value: active, onValueChange, baseId, registerTrigger, getOrderedValues } =
      useTabsContext('TabsTrigger');

    const isActive = active === value;

    // Combine the forwarded ref with our internal registration ref so consumers
    // can still attach a ref while the registry keeps a node reference for
    // keyboard focus moves.
    const localRef = React.useRef<HTMLButtonElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        localRef.current = node;
        registerTrigger(value, node);
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }
      },
      [forwardedRef, registerTrigger, value],
    );

    // Cleanup the registry entry when the trigger unmounts (e.g. availableTabs
    // narrows in /reports). Pair with the null-call from setRefs.
    React.useEffect(() => {
      return () => registerTrigger(value, null);
    }, [registerTrigger, value]);

    // Keyboard nav per ARIA Authoring Practices for the Tab pattern:
    // ArrowRight/Left wrap across the row, Home/End jump to ends. Activating
    // a sibling both moves focus to it and selects it.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(e.key)) return;

      const ordered = getOrderedValues();
      const idx = ordered.indexOf(value);
      if (idx === -1) return;

      let nextIdx = idx;
      if (e.key === 'ArrowRight') {
        nextIdx = (idx + 1) % ordered.length;
      } else if (e.key === 'ArrowLeft') {
        nextIdx = (idx - 1 + ordered.length) % ordered.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = ordered.length - 1;
      }

      const nextValue = ordered[nextIdx];
      if (nextValue === undefined || nextValue === value) return;

      e.preventDefault();
      onValueChange(nextValue);
      // Defer focus until after the parent's state flush so the newly active
      // trigger has tabIndex=0 by the time it receives focus.
      queueMicrotask(() => {
        const nextNode = localRef.current?.parentElement?.querySelector<HTMLButtonElement>(
          `#${CSS.escape(triggerId(baseId, nextValue))}`,
        );
        nextNode?.focus();
      });
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (!isActive) onValueChange(value);
    };

    return (
      <button
        ref={setRefs}
        type="button"
        role="tab"
        id={triggerId(baseId, value)}
        aria-selected={isActive}
        // aria-pressed mirrors aria-selected. Strictly, aria-pressed is for
        // toggle buttons (not tabs), but the two prior inline implementations
        // shipped with both attributes set and at least one downstream test
        // suite asserts against aria-pressed. Mirroring here keeps the
        // primitive a drop-in replacement; the canonical attribute remains
        // aria-selected.
        aria-pressed={isActive}
        aria-controls={panelId(baseId, value)}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-150',
          isActive
            ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
            : 'text-muted-foreground hover:text-foreground',
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

// ── TabsContent ───────────────────────────────────────────
//
// Only the active panel is rendered. The previous inline implementations
// branched on the state in the parent (e.g. `tab === 'fellowship' ? A : B`),
// so unmounting on switch matches existing semantics — panels were already
// mount/unmount, not show/hide. If a future caller needs SSR/SEO retention
// for inactive panels, swap return null for `<div hidden>`.

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: active, baseId } = useTabsContext('TabsContent');
    if (active !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={panelId(baseId, value)}
        aria-labelledby={triggerId(baseId, value)}
        tabIndex={0}
        className={cn(className)}
        {...props}
      />
    );
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
