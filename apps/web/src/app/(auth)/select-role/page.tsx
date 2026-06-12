'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RoleOption } from '@kairos/types';
import { persistAuthSuccess, useFinalizeRole } from '@/hooks/use-auth';
import { useAuthStore } from '@/lib/auth-store';
import { useRoleSelectionStore } from '@/lib/role-selection-store';
import { KharisCardHeader } from '../kharis-logo';
import { RoleIcon } from '../_role-icon';

/**
 * Phase 2 of roadmap item 9 — the role picker. Multi-role users land here
 * after credentials succeed. They pick one role, we exchange the short-lived
 * sessionToken for real auth tokens (`/api/auth/finalize-role`), then route
 * by the existing mustChangePassword / isFirstLogin / dashboard rules.
 */
export default function SelectRolePage() {
  const router = useRouter();
  const finalize = useFinalizeRole();
  const sessionToken = useRoleSelectionStore((s) => s.sessionToken);
  const availableRoles = useRoleSelectionStore((s) => s.availableRoles);
  const clearRoleSelection = useRoleSelectionStore((s) => s.clearRoleSelection);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? The picker has no business here. Send to dashboard.
  useEffect(() => {
    if (accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, router]);

  // If the user lands here without going through `/login` first (direct
  // URL, refresh after the stash was cleared, back-button after success)
  // there's nothing to pick from — bounce back.
  useEffect(() => {
    if (accessToken) return;
    if (!sessionToken || availableRoles.length === 0) {
      router.replace('/login');
    }
  }, [accessToken, sessionToken, availableRoles.length, router]);

  async function handlePick(opt: RoleOption) {
    if (!sessionToken) return;
    setError(null);
    setPendingKey(opt.key);
    try {
      const result = await finalize.mutateAsync({
        sessionToken,
        activeRole: opt.activeRole,
        scope: opt.scope,
        key: opt.key,
      });

      persistAuthSuccess({
        tokens: result.tokens,
        member: result.member,
        activeRole: opt.activeRole,
      });
      clearRoleSelection();

      if (result.member.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push(result.isFirstLogin ? '/welcome' : '/dashboard');
      }
    } catch (err) {
      setPendingKey(null);
      setError(err instanceof Error ? err.message : 'Could not finish sign-in. Please return to login and try again.');
    }
  }

  // Render-empty placeholder while the effect redirects. Avoids a one-frame
  // flash of an empty card.
  if (!sessionToken || availableRoles.length === 0) {
    return null;
  }

  return (
    <>
      <KharisCardHeader heading="Choose how to sign in" subtitle="Your account has more than one role. Pick the one you want to use right now." />

      <div className="rounded-2xl bg-card p-6 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] sm:p-8">
        {error && (
          <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <ul className="space-y-3">
          {availableRoles.map((opt) => {
            const isPending = pendingKey === opt.key;
            const anyPending = pendingKey !== null;
            return (
              <li key={opt.key}>
                <button
                  type="button"
                  onClick={() => handlePick(opt)}
                  disabled={anyPending}
                  aria-label={`Continue as ${opt.displayLabel}`}
                  className="group flex w-full items-center gap-4 rounded-xl border border-muted-foreground/10 bg-background/40 p-4 text-left transition-all duration-150 hover:border-[#5D3FD3]/40 hover:bg-[#5D3FD3]/[0.04] focus-visible:border-[#f8b537] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8b537]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.02]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white">
                    <RoleIcon activeRole={opt.activeRole} />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{opt.displayLabel}</span>
                    <span className="block text-xs text-muted-foreground/70 capitalize">{opt.activeRole}</span>
                  </span>

                  {isPending ? (
                    <svg className="h-5 w-5 shrink-0 animate-spin text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            onClick={() => clearRoleSelection()}
            className="text-xs font-medium text-[#5D3FD3] hover:opacity-80"
          >
            Back to login
          </Link>
        </div>
      </div>
    </>
  );
}
