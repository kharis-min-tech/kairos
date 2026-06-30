'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Check, X, AlertTriangle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import {
  CONSENT_TYPE_LABEL,
  CONSENT_TYPE_DESCRIPTION,
  ConsentType,
} from '@kairos/types';
import { useMyConsentStatuses, useRecordConsent } from '@/hooks/use-consent';

export default function LegalSettingsPage() {
  const { data, isLoading, isError, error } = useMyConsentStatuses();
  const record = useRecordConsent();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      <div className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Legal &amp; consent</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track which policies you&apos;ve accepted and when.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Consent records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Couldn&apos;t load consent: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}
          {data?.statuses.map((status, idx) => {
            const isMarketing = status.consentType === ConsentType.Marketing;
            const stateLabel = status.granted === true
              ? 'Granted'
              : status.granted === false
              ? 'Declined'
              : 'Not recorded';
            const Icon = status.granted === true ? Check : status.granted === false ? X : AlertTriangle;
            const tone = status.granted === true
              ? 'text-emerald-700 dark:text-emerald-400'
              : status.granted === false
              ? 'text-destructive'
              : 'text-amber-700 dark:text-[#f8b537]';

            return (
              <div
                key={status.consentType}
                className={`flex items-start justify-between gap-4 py-3 ${idx > 0 ? 'border-t' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {CONSENT_TYPE_LABEL[status.consentType]}
                    </p>
                    {status.required && (
                      <span className="rounded-full bg-[#5D3FD3]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5D3FD3]">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {CONSENT_TYPE_DESCRIPTION[status.consentType]}
                  </p>
                  <p className={`mt-1 inline-flex items-center gap-1 text-xs ${tone}`}>
                    <Icon className="h-3 w-3" /> {stateLabel}
                    {status.acceptedVersion && (
                      <span className="text-muted-foreground">
                        · v{status.acceptedVersion} · {status.grantedAt ? new Date(status.grantedAt).toLocaleDateString('en-GB') : ''}
                      </span>
                    )}
                  </p>
                  {status.needsAccept && status.required && (
                    <p className="mt-1 text-xs text-destructive">
                      Action needed — version {status.currentVersion} is now current.
                    </p>
                  )}
                </div>
                {isMarketing && (
                  <div className="shrink-0">
                    <Button
                      variant={status.granted ? 'outline' : 'default'}
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        record.mutate({
                          consentType: ConsentType.Marketing,
                          granted: !status.granted,
                        })
                      }
                      disabled={record.isPending}
                    >
                      {status.granted ? 'Unsubscribe' : 'Subscribe'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
