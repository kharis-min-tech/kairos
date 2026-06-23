'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useDepartments,
  useDeactivateDepartment,
  useGlobalDepartments,
  useMyDepartments,
  useMyDepartmentJoinRequests,
} from '@/hooks/use-departments';
import { useMyProfile } from '@/hooks/use-members';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useBranches } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import {
  MyDepartmentsView,
  type ProbationStatus,
} from './_components/my-departments-view';
import { MyOffersBanner } from './_components/my-offers-banner';
import { MyApplicationsList } from './_components/my-applications-list';
import { useConfirm } from '@/components/confirm-dialog';

interface ListParams {
  page?: number;
  limit?: number;
  branchId?: string;
  departmentId?: string;
}

function DepartmentsListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded bg-muted/60" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted/60" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
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

function DepartmentsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
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
  const { data: myDepts } = useMyDepartments();
  const { data: joinRequests } = useMyDepartmentJoinRequests();
  const deactivate = useDeactivateDepartment();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // For the member view, dedupe the "browse all" grid against the user's own
  // active memberships so they don't see the same cards twice.
  const myDeptIdSet = new Set((myDepts ?? []).map((d) => d.id));
  const isMemberRole = activeRole === 'member';
  const rawDepartments = result?.data;
  const departments = isMemberRole
    ? rawDepartments?.filter((d) => !myDeptIdSet.has(d.id))
    : rawDepartments;
  const pagination = result?.meta;

  // Partition join requests by status for the member-view sub-tabs.
  const offers = (joinRequests ?? []).filter((r) => r.status === 'offered');
  const pendingApplications = (joinRequests ?? []).filter((r) =>
    ['applied', 'interview_scheduled', 'interviewed'].includes(r.status),
  );
  const probationByDeptId = new Map<string, ProbationStatus>(
    (joinRequests ?? [])
      .filter((r) => r.status === 'probation')
      .map((r) => [r.branchDepartmentId, { endDate: r.probationEndDate }]),
  );

  const membershipCount = myDepts?.length ?? 0;
  const applicationCount = pendingApplications.length;
  const showSubTabs = isMemberRole && applicationCount > 0;
  const [memberSubTab, setMemberSubTab] = useState<'memberships' | 'applications'>('memberships');

  if (isLoading) {
    return <DepartmentsListSkeleton />;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load departments. Please try again.'}
        </p>
      </div>
    );
  }

  const isMemberView = isMemberRole;

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isMemberView ? 'My Departments' : 'Departments'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isMemberView
              ? 'Your active department memberships and upcoming duties.'
              : `Ministry teams${pagination ? ` — ${pagination.total} total` : ''}`}
          </p>
        </div>
        {(caps.has('branch:write')) && (
          <Link href="/departments/new">
            <Button size="sm">+ New Department</Button>
          </Link>
        )}
      </div>

      {/* Offers — pinned at the top for any user; only renders when offers exist. */}
      {isMemberView && <MyOffersBanner offers={offers} />}

      {/* Member-only primary surface: Memberships / Applications sub-tabs (when applicable) + Browse heading */}
      {isMemberView && (
        <>
          {showSubTabs && (
            <div role="tablist" className="flex flex-wrap gap-1 border-b border-border/40">
              <button
                type="button"
                role="tab"
                aria-selected={memberSubTab === 'memberships'}
                onClick={() => setMemberSubTab('memberships')}
                className={[
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  memberSubTab === 'memberships'
                    ? 'border-[#5D3FD3] text-[#5D3FD3]'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                Memberships ({membershipCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={memberSubTab === 'applications'}
                onClick={() => setMemberSubTab('applications')}
                className={[
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  memberSubTab === 'applications'
                    ? 'border-[#5D3FD3] text-[#5D3FD3]'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                Applications ({applicationCount})
              </button>
            </div>
          )}

          {(!showSubTabs || memberSubTab === 'memberships') && (
            <MyDepartmentsView probationByDeptId={probationByDeptId} />
          )}
          {showSubTabs && memberSubTab === 'applications' && (
            <MyApplicationsList items={pendingApplications} />
          )}

          <div className="pt-2">
            <h2 className="text-base font-semibold tracking-tight">
              Browse other departments at your branch
            </h2>
            <p className="text-xs text-muted-foreground">
              Request to join any of the teams below.
            </p>
          </div>
        </>
      )}

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
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {(caps.has('fellowship:write') || caps.has('department:write')) ? (
              <>
                <p className="font-medium">You don’t lead a department</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The leader view shows departments you lead or co-lead. Switch to your member view to browse and apply to one.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No departments found.</p>
            )}
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
                    {(caps.has('branch:write')) && (
                      <div className="mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault();
                            const ok = await confirm({
                              title: `Deactivate ${dept.departmentName} at ${dept.branchName}?`,
                              description: 'The department will be hidden from the directory and members will lose access.',
                              confirmLabel: 'Deactivate',
                              variant: 'destructive',
                            });
                            if (!ok) return;
                            deactivate.mutate(dept.id, {
                              onSuccess: () => toast.success('Department deactivated.'),
                              onError: () =>
                                toast.error('Failed to deactivate department. Please try again.'),
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
    <Suspense fallback={<DepartmentsListSkeleton />}>
      <DepartmentsContent />
    </Suspense>
  );
}
