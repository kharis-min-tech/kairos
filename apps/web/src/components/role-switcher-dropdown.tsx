'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoleOption, RoleScope, SystemRole } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { persistAuthSuccess, useSwitchRole } from '@/hooks/use-auth';
import { cn } from '@kairos/ui';

/**
 * Phase 3: in-app role switcher. The sidebar's user row gets this
 * dropdown when the caller has more than one available role. Clicking
 * an option calls /api/auth/switch-role, re-persists the fresh token
 * pair, and runs router.refresh() so server components re-render
 * against the new authority. Single-role callers see a plain label —
 * no chevron, no menu.
 *
 * Hand-rolled disclosure (button + ul) instead of a primitive — the
 * dropdown is one of one in the app and pulling in a Menu primitive
 * for it would be overkill.
 */

function rolesEqual(a: RoleOption, target: { activeRole: SystemRole; scope: RoleScope | null }) {
  if (a.activeRole !== target.activeRole) return false;
  const aScope = a.scope ?? null;
  if (aScope === null && target.scope === null) return true;
  if (aScope === null || target.scope === null) return false;
  return aScope.kind === target.scope.kind && aScope.id === target.scope.id;
}

function friendlyFallbackLabel(activeRole: SystemRole | null): string {
  switch (activeRole) {
    case 'admin':
      return 'Administrator';
    case 'pastor':
      return 'Pastor';
    case 'leader':
      return 'Leader';
    case 'member':
      return 'Member';
    default:
      return 'Member';
  }
}

interface RoleSwitcherDropdownProps {
  className?: string;
}

export function RoleSwitcherDropdown({ className }: RoleSwitcherDropdownProps) {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const scope = useAuthStore((s) => s.scope);
  const availableRoles = useAuthStore((s) => s.availableRoles);

  const switchRole = useSwitchRole();
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const menuId = useId();

  const currentLabel = useMemo(() => {
    const match = availableRoles.find((opt) =>
      rolesEqual(opt, { activeRole: activeRole ?? 'member', scope: scope ?? null }),
    );
    return match?.displayLabel ?? friendlyFallbackLabel(activeRole);
  }, [availableRoles, activeRole, scope]);

  const hasMultiple = availableRoles.length > 1;

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setFocusIndex(-1);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus the active menuitem when arrow keys move.
  useEffect(() => {
    if (!open || focusIndex < 0) return;
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items?.[focusIndex]?.focus();
  }, [focusIndex, open]);

  // When opening, seed focus on the current role (or first item).
  function handleToggle() {
    if (!hasMultiple) return;
    setError(null);
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const idx = availableRoles.findIndex((opt) =>
          rolesEqual(opt, { activeRole: activeRole ?? 'member', scope: scope ?? null }),
        );
        setFocusIndex(idx >= 0 ? idx : 0);
      } else {
        setFocusIndex(-1);
      }
      return next;
    });
  }

  async function handlePick(opt: RoleOption) {
    setError(null);
    setPendingKey(opt.key);
    try {
      const result = await switchRole.mutateAsync({
        activeRole: opt.activeRole,
        scope: opt.scope,
        key: opt.key,
      });
      persistAuthSuccess({
        tokens: result.tokens,
        member: result.member,
        activeRole: opt.activeRole,
        // switch-role responses don't echo availableRoles — keep the
        // existing list, the server re-validates against fresh state
        // on every call so a stale option would have been rejected.
      });
      setOpen(false);
      setPendingKey(null);
      setFocusIndex(-1);
      router.refresh();
    } catch (err) {
      setPendingKey(null);
      setError(err instanceof Error ? err.message : 'Could not switch role. Please try again.');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!hasMultiple) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleToggle();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setFocusIndex(-1);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => (i + 1) % availableRoles.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => (i - 1 + availableRoles.length) % availableRoles.length);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setFocusIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setFocusIndex(availableRoles.length - 1);
      return;
    }
  }

  // Single-role: plain text, no chevron, no aria controls.
  if (!hasMultiple) {
    return (
      <p className={cn('truncate text-xs text-muted-foreground', className)}>
        {currentLabel}
      </p>
    );
  }

  return (
    <div className={cn('relative', className)} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Acting as ${currentLabel}. Switch role.`}
        className={cn(
          'flex items-center gap-1 truncate rounded text-xs text-muted-foreground transition-colors',
          'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8b537]/30',
        )}
      >
        <span className="truncate">{currentLabel}</span>
        <svg
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <ul
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Switch role"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-muted-foreground/10 bg-white/95 backdrop-blur-[20px] shadow-[0_8px_40px_rgba(26,28,28,0.10)] dark:bg-[#0f0f12]/95 dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        >
          {error && (
            <li role="none" className="border-b border-muted-foreground/10 bg-destructive/10 px-3 py-2">
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            </li>
          )}
          {availableRoles.map((opt) => {
            const isCurrent = rolesEqual(opt, {
              activeRole: activeRole ?? 'member',
              scope: scope ?? null,
            });
            const isPending = pendingKey === opt.key;
            const anyPending = pendingKey !== null;
            return (
              <li key={opt.key} role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => handlePick(opt)}
                  disabled={anyPending}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors',
                    'hover:bg-[#5D3FD3]/[0.06] focus-visible:bg-[#5D3FD3]/[0.06] focus-visible:outline-none',
                    isCurrent && 'bg-[#5D3FD3]/[0.04]',
                    anyPending && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isCurrent ? (
                      <svg
                        className="h-3.5 w-3.5 text-[#5D3FD3]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="flex-1 truncate font-medium text-foreground">
                    {opt.displayLabel}
                  </span>
                  {isPending && (
                    <svg
                      className="h-3.5 w-3.5 shrink-0 animate-spin text-[#5D3FD3]"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
