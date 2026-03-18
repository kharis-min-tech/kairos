'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFellowships, useDeleteFellowship } from '@/hooks/use-fellowships';
import { Button } from '@kairos/ui';
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

function FellowshipsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isAdminOrPastor = user?.systemRole === 'admin' || user?.systemRole === 'pastor';
  const initialType = searchParams.get('type') || '';

  const [params, setParams] = useState<FellowshipListParams>({
    page: 1,
    limit: 20,
    fellowshipType: initialType || undefined,
  });

  const { data: result, isLoading, error } = useFellowships(params);
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
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load fellowships. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fellowships</h1>
          <p className="text-muted-foreground">
            Fellowship groups{pagination ? ` — ${pagination.total} total` : ''}
          </p>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FELLOWSHIP_TYPES.map((type) => (
          <Button
            key={type.value}
            variant={
              (params.fellowshipType || '') === type.value ? 'default' : 'outline'
            }
            size="sm"
            onClick={() =>
              setParams((p) => ({
                ...p,
                fellowshipType: type.value || undefined,
                page: 1,
              }))
            }
          >
            {type.label}
          </Button>
        ))}
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
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {fellowship.fellowshipName}
                    </CardTitle>
                    <CardDescription>
                      {fellowship.fellowshipType} &middot; {fellowship.branchName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {fellowship.description && <p>{fellowship.description}</p>}
                      {fellowship.meetingSchedule && (
                        <p>Schedule: {fellowship.meetingSchedule}</p>
                      )}
                    </div>
                    {isAdminOrPastor && (
                      <div className="mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Deactivate ${fellowship.fellowshipName}?`)) {
                              deleteFellowship.mutate(fellowship.id);
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
