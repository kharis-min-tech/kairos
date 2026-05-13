'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useDepartments,
  useDeactivateDepartment,
  useGlobalDepartments,
} from '@/hooks/use-departments';
import { useMyProfile } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { MyRequestsPanel } from './_components/my-requests-panel';

interface ListParams {
  page?: number;
  limit?: number;
  branchId?: string;
  departmentId?: string;
}

function DepartmentsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: myProfile } = useMyProfile();
  const { data: branchesResult } = useBranches();
  const { data: catalogue } = useGlobalDepartments();
  const profile = myProfile ?? user;

  const initialDeptId = searchParams.get('departmentId') || '';

  const [params, setParams] = useState<ListParams>({
    page: 1,
    limit: 20,
    departmentId: initialDeptId || undefined,
  });

  const fetchParams: ListParams =
    activeRole === 'admin' ? params : { ...params, branchId: profile?.homeBranchId };

  const { data: result, isLoading, error } = useDepartments(fetchParams);
  const deactivate = useDeactivateDepartment();

  const departments = result?.data;
  const pagination = result?.meta;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading departments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load departments. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ministry teams{pagination ? ` — ${pagination.total} total` : ''}
          </p>
        </div>
        {(activeRole === 'admin' || activeRole === 'pastor') && (
          <Link href="/departments/new">
            <Button size="sm">+ New Department</Button>
          </Link>
        )}
      </div>

      {/* Member-facing: my open join requests / offers */}
      <MyRequestsPanel />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <CustomSelect
          size="sm"
          value={params.departmentId ?? ''}
          onValueChange={(v) =>
            setParams((p) => ({ ...p, departmentId: v || undefined, page: 1 }))
          }
          placeholder="All Ministries"
          options={[
            { value: '', label: 'All Ministries' },
            ...(catalogue ?? [])
              .filter((d) => d.isActive)
              .map((d) => ({ value: d.id, label: d.departmentName })),
          ]}
        />
        {activeRole === 'admin' && (
          <CustomSelect
            size="sm"
            value={params.branchId ?? ''}
            onValueChange={(v) =>
              setParams((p) => ({ ...p, branchId: v || undefined, page: 1 }))
            }
            placeholder="All Branches"
            options={[
              { value: '', label: 'All Branches' },
              ...(branchesResult ?? []).map((b) => ({ value: b.id, label: b.branchName })),
            ]}
          />
        )}
      </div>

      {!departments || departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No departments found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Link key={dept.id} href={`/departments/${dept.id}`}>
                <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {dept.departmentName}
                      </CardTitle>
                      {dept.pendingJoinRequestCount && dept.pendingJoinRequestCount > 0 ? (
                        <span className="flex-shrink-0 rounded-full bg-[#f8b537]/20 px-2.5 py-0.5 text-xs font-medium text-[#7a5a00] dark:text-[#f8b537]">
                          {dept.pendingJoinRequestCount} pending
                        </span>
                      ) : null}
                    </div>
                    <CardDescription className="truncate">{dept.branchName}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Lead:</span>
                        <span>
                          {dept.leadFirstName} {dept.leadLastName}
                        </span>
                      </p>
                      <p className="text-xs">
                        {dept.memberCount ?? 0} member{(dept.memberCount ?? 0) === 1 ? '' : 's'}
                      </p>
                      {dept.description && (
                        <p className="line-clamp-2 pt-1">{dept.description}</p>
                      )}
                    </div>
                    {(activeRole === 'admin' || activeRole === 'pastor') && (
                      <div className="mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            if (
                              confirm(`Deactivate ${dept.departmentName} at ${dept.branchName}?`)
                            ) {
                              deactivate.mutate(dept.id, {
                                onSuccess: () => toast.success('Department deactivated.'),
                                onError: () =>
                                  toast.error(
                                    'Failed to deactivate department. Please try again.',
                                  ),
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

export default function DepartmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <DepartmentsContent />
    </Suspense>
  );
}
