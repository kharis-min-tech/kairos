'use client';

import Link from 'next/link';
import { useUnguardedMinors, useDormantMinors, useReviewMinor } from '@/hooks/use-members';
import { Button, Card, CardContent } from '@kairos/ui';
import { formatShortDate } from '@/lib/date-format';
import type { UnguardedMinor, DormantMinor } from '@kairos/types';

export default function SafeguardingReviewPage() {
  const unguarded = useUnguardedMinors();
  const dormant = useDormantMinors();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Safeguarding review</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Minor records that need a Safeguarding Lead&apos;s attention
        </p>
      </div>

      <section className="space-y-3">
        <header className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Without an active guardian</h2>
          <p className="text-xs text-muted-foreground">
            Active minors whose guardian is missing or deactivated
          </p>
        </header>
        <UnguardedSection
          minors={unguarded.data ?? []}
          isLoading={unguarded.isLoading}
          isError={unguarded.isError}
          error={unguarded.error}
        />
      </section>

      <section className="space-y-3">
        <header className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Dormant child shells — review</h2>
          <p className="text-xs text-muted-foreground">
            Child records created 60+ days ago with no recent review. Mark each as still active
            or approve archiving — every decision is logged.
          </p>
        </header>
        <DormantSection
          minors={dormant.data ?? []}
          isLoading={dormant.isLoading}
          isError={dormant.isError}
          error={dormant.error}
        />
      </section>
    </div>
  );
}

// ── Unguarded ──────────────────────────────────────────────

function UnguardedSection({
  minors,
  isLoading,
  isError,
  error,
}: {
  minors: UnguardedMinor[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}) {
  if (isLoading) return <SafeguardingSkeleton />;
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-[#DC2626]">
            You don&apos;t have safeguarding access to this list
          </p>
          {error?.message && <p className="text-xs text-muted-foreground">{error.message}</p>}
        </CardContent>
      </Card>
    );
  }
  if (minors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-[#16A34A]">No minors currently need attention</p>
          <p className="text-xs text-muted-foreground">
            Every active minor has an active guardian on record.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul>
          {minors.map((minor) => (
            <li key={minor.id}>
              <UnguardedRow minor={minor} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function UnguardedRow({ minor }: { minor: UnguardedMinor }) {
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

// ── Dormant ────────────────────────────────────────────────

function DormantSection({
  minors,
  isLoading,
  isError,
  error,
}: {
  minors: DormantMinor[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}) {
  if (isLoading) return <SafeguardingSkeleton />;
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-[#DC2626]">
            You don&apos;t have safeguarding access to this list
          </p>
          {error?.message && <p className="text-xs text-muted-foreground">{error.message}</p>}
        </CardContent>
      </Card>
    );
  }
  if (minors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-[#16A34A]">Nothing to review</p>
          <p className="text-xs text-muted-foreground">
            No dormant child shells are awaiting a decision.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul>
          {minors.map((minor) => (
            <li key={minor.id}>
              <DormantRow minor={minor} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DormantRow({ minor }: { minor: DormantMinor }) {
  const review = useReviewMinor();
  const lastReview = minor.lastReviewedAt
    ? `Last reviewed ${formatShortDate(minor.lastReviewedAt)}${minor.lastReviewerName ? ` by ${minor.lastReviewerName}` : ''}`
    : 'Never reviewed';

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {minor.firstName} {minor.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Created {formatShortDate(minor.createdAt)}
          {minor.dateOfBirth ? ` · DOB ${formatShortDate(minor.dateOfBirth)}` : ''}
        </p>
        <p className="truncate text-xs text-muted-foreground/80">{lastReview}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={review.isPending}
          onClick={() => review.mutate({ id: minor.id, decision: 'active' })}
        >
          Still active
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={review.isPending}
          onClick={() => review.mutate({ id: minor.id, decision: 'archived' })}
        >
          Approve archive
        </Button>
      </div>
    </div>
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
