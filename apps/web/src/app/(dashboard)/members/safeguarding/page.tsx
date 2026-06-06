'use client';

import Link from 'next/link';
import { useUnguardedMinors } from '@/hooks/use-members';
import { Card, CardContent } from '@kairos/ui';
import { formatShortDate } from '@/lib/date-format';
import type { UnguardedMinor } from '@kairos/types';

export default function SafeguardingReviewPage() {
  const { data: minors, isLoading, isError, error } = useUnguardedMinors();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Safeguarding review</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Minors without an active guardian</p>
      </div>

      {isLoading ? (
        <SafeguardingSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-[#DC2626]">
              You don&apos;t have safeguarding access to this list
            </p>
            {error?.message && (
              <p className="text-xs text-muted-foreground">{error.message}</p>
            )}
          </CardContent>
        </Card>
      ) : !minors || minors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-[#16A34A]">No minors currently need attention</p>
            <p className="text-xs text-muted-foreground">
              Every active minor has an active guardian on record.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul>
              {minors.map((minor) => (
                <li key={minor.id}>
                  <MinorRow minor={minor} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MinorRow({ minor }: { minor: UnguardedMinor }) {
  return (
    <Link
      href={`/members/${minor.id}`}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[#5D3FD3]/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {minor.firstName} {minor.lastName}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {minor.branchName} · DOB {formatShortDate(minor.dateOfBirth)}
        </p>
      </div>
      <GuardianChip minor={minor} />
    </Link>
  );
}

function GuardianChip({ minor }: { minor: UnguardedMinor }) {
  if (minor.guardianStatus === 'none') {
    return (
      <span className="flex-shrink-0 rounded-full bg-[#DC2626]/10 px-2.5 py-0.5 text-xs font-medium text-[#DC2626]">
        No guardian
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 rounded-full bg-[#f8b537]/15 px-2.5 py-0.5 text-xs font-medium text-[#9a6b04] dark:text-[#f8b537]">
      Guardian inactive{minor.guardianName ? ` · ${minor.guardianName}` : ''}
    </span>
  );
}

function SafeguardingSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <ul>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
                <div className="h-3 w-56 animate-pulse rounded bg-foreground/5" />
              </div>
              <div className="h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
