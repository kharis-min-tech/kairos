'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@kairos/ui';
import { CONSENT_TYPE_LABEL, ConsentType } from '@kairos/types';
import { useMyConsentStatuses, useRecordConsent } from '@/hooks/use-consent';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Dashboard-level banner. Renders when any REQUIRED consent needs accepting —
 * either it's never been granted or the env-driven version has bumped since
 * the last acceptance. Marketing is optional and surfaces on
 * /profile/settings/legal, not here.
 *
 * Required set is driven by the API's `status.required` flag, which the API
 * computes per-user: terms + privacy + acceptable_use for everyone, plus
 * admin_confidentiality for anyone holding a leadership / administrative
 * role.
 */

const LEGAL_DOC_HREF: Record<ConsentType, string> = {
  [ConsentType.Terms]: '/legal/terms',
  [ConsentType.Privacy]: '/legal/privacy',
  [ConsentType.Marketing]: '/profile/settings/legal',
  [ConsentType.AcceptableUse]: '/legal/acceptable-use',
  [ConsentType.AdminConfidentiality]: '/legal/confidentiality',
};
export function ConsentBanner() {
  const { user } = useAuthStore();
  const { data, isLoading } = useMyConsentStatuses();
  const record = useRecordConsent();
  const [accepting, setAccepting] = useState<ConsentType | null>(null);

  if (!user || isLoading || !data) return null;
  const pending = data.statuses.filter((s) => s.required && s.needsAccept);
  if (pending.length === 0) return null;

  async function acceptAll() {
    for (const status of pending) {
      setAccepting(status.consentType);
      try {
        await record.mutateAsync({ consentType: status.consentType, granted: true });
      } finally {
        setAccepting(null);
      }
    }
  }

  return (
    <div className="border-b border-[#5D3FD3]/20 bg-[#5D3FD3]/5 px-6 py-4">
      <div className="container mx-auto flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#5D3FD3]" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Please review our policies</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pending
                .map((s) => `${CONSENT_TYPE_LABEL[s.consentType]} (v${s.currentVersion})`)
                .join(' · ')}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {pending.map((s) => (
                <Link
                  key={s.consentType}
                  href={LEGAL_DOC_HREF[s.consentType]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#5D3FD3] underline underline-offset-2 hover:opacity-80"
                >
                  Read the {CONSENT_TYPE_LABEL[s.consentType]}
                </Link>
              ))}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white"
          onClick={acceptAll}
          disabled={record.isPending || accepting !== null}
        >
          {record.isPending ? 'Saving…' : 'Accept & continue'}
        </Button>
      </div>
    </div>
  );
}
