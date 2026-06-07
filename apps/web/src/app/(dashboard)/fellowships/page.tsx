'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useFellowships, useDeleteFellowship } from '@/hooks/use-fellowships';
import { useMyProfile } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import type { FellowshipListParams } from '@kairos/types';
import { FellowshipType } from '@kairos/types';
import type { FellowshipWithBranch } from '@kairos/types';
import { useConfirm } from '@/components/confirm-dialog';

const FellowshipMap = dynamic(() => import('@/components/fellowship-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-xl border border-border bg-muted/30">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

function FellowshipsListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded bg-muted/60" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted/40" />
            </div>
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted/40" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FELLOWSHIP_TYPES = [
  { label: 'All', value: '' },
  { label: 'K-Groups', value: FellowshipType.KGroups },
  { label: 'Kharis Express', value: FellowshipType.KharisExpress },
  { label: 'New Breeds', value: FellowshipType.NewBreeds },
  { label: 'KOC', value: FellowshipType.KharisOnCampus },
  { label: 'KOC Colleges', value: FellowshipType.KharisOnCampusColleges },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  [FellowshipType.KGroups]: 'bg-[#5D3FD3]/15 text-[#5D3FD3] dark:text-[#a392ed]',
  [FellowshipType.KharisExpress]: 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]',
  [FellowshipType.NewBreeds]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  [FellowshipType.KharisOnCampus]: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  [FellowshipType.KharisOnCampusColleges]: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
};

function FellowshipsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: myProfile } = useMyProfile();
  const { data: branchesResult } = useBranches();
  const profile = myProfile ?? user;

  const initialType = searchParams.get('type') || '';

  const [params, setParams] = useState<FellowshipListParams>({
    page: 1,
    limit: 20,
    fellowshipType: initialType || undefined,
  });
  const [showMap, setShowMap] = useState(false);
  const [focusedFellowship, setFocusedFellowship] = useState<FellowshipWithBranch | null>(null);

  // Only admins see all branches; pastors and members are scoped to their branch
  const fetchParams: FellowshipListParams = activeRole === 'admin'
    ? params
    : { ...params, branchId: profile?.homeBranchId };

  const { data: result, isLoading, error } = useFellowships(fetchParams);
  const deleteFellowship = useDeleteFellowship();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fellowships = result?.data;
  const pagination = result?.meta;

  if (isLoading) {
    return <FellowshipsListSkeleton />;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load fellowships. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fellowships</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Fellowship groups{pagination ? ` — ${pagination.total} total` : ''}
          </p>
        </div>
        {(activeRole === 'admin' || activeRole === 'pastor') && (
          <Link href="/fellowships/new">
            <Button size="sm">+ New Fellowship</Button>
          </Link>
        )}
      </div>

      {/* View toggle + Leadership stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setShowMap(!showMap)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            {showMap ? 'Hide Map' : 'Find on Map'}
          </Button>
        </div>

        {(activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader') && pagination && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#5D3FD3]/10 px-3 py-1.5">
              <svg className="h-4 w-4 text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span className="text-xs font-semibold text-[#5D3FD3] dark:text-[#a392ed]">{pagination.total} Fellowships</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fellowships?.filter(f => f.isActive).length ?? 0} Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Map section */}
      {showMap && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="h-[500px]">
            <FellowshipMap focusedFellowship={focusedFellowship} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06]">
          {FELLOWSHIP_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  fellowshipType: type.value || undefined,
                  page: 1,
                }))
              }
              className={(
                (params.fellowshipType || '') === type.value
                  ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              ) + ' flex-1 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-150'}
            >
              {type.label}
            </button>
          ))}
        </div>
        {activeRole === 'admin' && (
          <CustomSelect
            size="sm"
            value={params.branchId ?? ''}
            onValueChange={(v) => setParams((p) => ({ ...p, branchId: v || undefined, page: 1 }))}
            placeholder="All Branches"
            options={[
              { value: '', label: 'All Branches' },
              ...(branchesResult ?? []).map((b) => ({ value: b.id, label: b.branchName })),
            ]}
          />
        )}
      </div>

      {!fellowships || fellowships.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No fellowships found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fellowships.map((fellowship) => {
              const isActive = focusedFellowship?.id === fellowship.id;
              return (
              <div
                key={fellowship.id}
                onClick={() => {
                  if (showMap) {
                    setFocusedFellowship(fellowship as FellowshipWithBranch);
                  }
                }}
                className="cursor-pointer"
              >
                <Link href={`/fellowships/${fellowship.id}`} onClick={(e) => { if (showMap) e.preventDefault(); }}>
                <Card className={`transition-all hover:shadow-md hover:-translate-y-0.5 ${isActive ? 'ring-2 ring-primary shadow-lg' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {fellowship.fellowshipName}
                      </CardTitle>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        TYPE_BADGE_COLORS[fellowship.fellowshipType] ?? 'bg-gray-100 text-gray-600'
                      }`}>
                        {fellowship.fellowshipType === FellowshipType.KGroups ? 'K-Groups' : fellowship.fellowshipType}
                      </span>
                    </div>
                    <CardDescription className="truncate">{fellowship.branchName}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {fellowship.description && <p className="line-clamp-2">{fellowship.description}</p>}
                      {fellowship.meetingSchedule && (
                        <p className="flex items-center gap-1 text-xs">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {fellowship.meetingSchedule}
                        </p>
                      )}
                    </div>
                    {(activeRole === 'admin' || activeRole === 'pastor') && (
                      <div className="mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const ok = await confirm({
                              title: `Deactivate ${fellowship.fellowshipName}?`,
                              description: 'It will be hidden from the directory. You can restore it from the API if needed.',
                              confirmLabel: 'Deactivate',
                              variant: 'destructive',
                            });
                            if (!ok) return;
                            deleteFellowship.mutate(fellowship.id, {
                              onSuccess: () => toast.success('Fellowship deactivated.'),
                              onError: () => toast.error('Failed to deactivate fellowship. Please try again.'),
                            });
                          }}
                        >
                          Deactivate
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </Link>
              </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FellowshipsPage() {
  return (
    <Suspense fallback={<FellowshipsListSkeleton />}>
      <FellowshipsContent />
    </Suspense>
  );
}
