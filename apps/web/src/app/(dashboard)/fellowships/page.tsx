'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
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
  [FellowshipType.KharisExpress]: 'bg-[#f8b537]/15 text-amber-700 dark:text-[#f8b537]',
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

  // Only admins see all branches; pastors and members are scoped to their branch
  const fetchParams: FellowshipListParams = activeRole === 'admin'
    ? params
    : { ...params, branchId: profile?.homeBranchId };

  const { data: result, isLoading, error } = useFellowships(fetchParams);
  const deleteFellowship = useDeleteFellowship();

  const fellowships = result?.data;
  const pagination = result?.meta;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading fellowships...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load fellowships. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            {fellowships.map((fellowship) => (
              <Link key={fellowship.id} href={`/fellowships/${fellowship.id}`}>
                <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
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
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Deactivate ${fellowship.fellowshipName}?`)) {
                              deleteFellowship.mutate(fellowship.id, {
                                onSuccess: () => toast.success('Fellowship deactivated.'),
                                onError: () => toast.error('Failed to deactivate fellowship. Please try again.'),
                              });
                            }
                          }}
                        >
                          Deactivate
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
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
    <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Loading...</p></div>}>
      <FellowshipsContent />
    </Suspense>
  );
}
