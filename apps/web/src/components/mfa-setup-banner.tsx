'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, X } from 'lucide-react';
import { Button } from '@kairos/ui';
import { useMfaStatus } from '@/hooks/use-mfa';
import { useAuthStore } from '@/lib/auth-store';

const DISMISS_KEY = 'kairos.mfa_nag_dismissed';

/**
 * The nag for a privileged member who has not set up a second factor.
 *
 * Driven by `/api/auth/mfa/status` rather than by a flag on the login
 * response, so it is still right after a refresh, still right if a grant was
 * added an hour ago, and gone the moment they enrol. The server decides who
 * is privileged; this component only reads the answer.
 *
 * Dismissal lasts the browser session and no longer. There is a date after
 * which these members cannot sign in without a factor, so a banner they can
 * silence forever would be a trap rather than a warning. Coming back at the
 * next sign-in is the point.
 */
export function MfaSetupBanner() {
  const { user } = useAuthStore();
  const { data, isLoading } = useMfaStatus(Boolean(user));
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // Storage blocked. Showing the banner is the safe failure here.
      return false;
    }
  });

  if (!user || isLoading || !data) return null;
  if (!data.required || data.enrolled || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Not worth telling anyone. It reappears on the next page load.
    }
  }

  return (
    <div className="border-b border-[#f8b537]/30 bg-[#f8b537]/10 px-6 py-4">
      <div className="container mx-auto flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#b07d12]" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Set up two-step sign-in</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Your role lets you see other people&apos;s personal details, so we will soon ask for
              a code from your phone as well as your password. It takes about a minute.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/profile/settings/security">
            <Button size="sm" className="rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white">
              Set it up
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Dismiss until next sign-in"
            onClick={dismiss}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
