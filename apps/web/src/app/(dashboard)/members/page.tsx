'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMembers, useDeactivateMember } from '@/hooks/use-members';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useFellowships } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { MemberListParams } from '@kairos/types';
import { MemberAvatar } from '@/components/member-avatar';
import { useConfirm } from '@/components/confirm-dialog';

function MembersListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded bg-muted/60" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted/60" />
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

export default function MembersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin';
  const isPastor = caps.has('branch:write');
  const isMemberView = activeRole === 'member';
  // Mirrors the dashboard-layout nav gating: members + leaders don't surface
  // the Members tab. Only admins and branch pastors (branch:write) see it.
  //
  // Note: caps.has(*) short-circuits to true for system admins, so checking
  // fellowship:write/department:write alone would incorrectly catch admins.
  // Gate on the positive grant (isAdmin || isPastor) instead.
  const canSeeMembers = isAdmin || isPastor;
  useEffect(() => {
    if (user !== null && !canSeeMembers) {
      router.replace('/dashboard');
    }
  }, [user, canSeeMembers, router]);
  // Safeguarding review is visible to leaders too (Safeguarding Leads are leaders);
  // the page itself enforces real access via the API (403 for unauthorized leaders).
  const canSeeSafeguarding = isAdmin || isPastor || (caps.has('fellowship:write') || caps.has('department:write'));
  const [params, setParams] = useState<MemberListParams>({
    page: 1,
    limit: 20,
    ...(isPastor && user?.homeBranchId ? { branchId: user.homeBranchId } : {}),
  });
  const [searchInput, setSearchInput] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  // When the user profile loads after page refresh, apply the branch filter for pastors
  useEffect(() => {
    if (isPastor && user?.homeBranchId) {
      setParams((prev) => {
        if (prev.branchId === user.homeBranchId) return prev;
        return { ...prev, branchId: user.homeBranchId, page: 1 };
      });
    }
  }, [isPastor, user?.homeBranchId]);

  const branchIdForFilter = isPastor && user?.homeBranchId ? user.homeBranchId : undefined;
  const { data: fellowshipsData } = useFellowships(
    branchIdForFilter ? { branchId: branchIdForFilter, limit: 100 } : { limit: 100 }
  );
  const { data: result, isLoading, error } = useMembers(params);
  const deactivate = useDeactivateMember();
  const { data: branches } = useBranches();
  const { data: pendingResult } = useMembers({ approvalStatus: 'pending', limit: 1 });
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleExport() {
    setExportLoading(true);
    try {
      const blob = await api.members.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'members.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  const members = result?.data;
  const pagination = result?.meta;

  function handleSearch() {
    setParams((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }

  if (user !== null && (isMemberView || (caps.has('fellowship:write') || caps.has('department:write')))) {
    return null;
  }

  if (isLoading) {
    return <MembersListSkeleton />;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load members. Please try again.'}
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
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Church member directory{pagination ? ` — ${pagination.total} total` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isPastor) && (
            <Link href="/members/new">
              <Button size="sm">+ Add Member</Button>
            </Link>
          )}
          {(isAdmin || isPastor) && (
            <Link href="/members/import">
              <Button variant="outline" size="sm">Import CSV</Button>
            </Link>
          )}
          {(isAdmin || isPastor) && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? 'Exporting…' : 'Export CSV'}
            </Button>
          )}
          {canSeeSafeguarding && (
            <Link href="/members/safeguarding">
              <Button variant="outline" size="sm">Safeguarding review</Button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/members/approval">
              <Button variant="outline" size="sm" className="relative">
                Approval Queue
                {(pendingResult?.meta?.total ?? 0) > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#f8b537] px-1 text-xs font-bold text-[#3a2807]">
                    {pendingResult!.meta!.total}
                  </span>
                )}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
        <Button onClick={handleSearch}>Search</Button>
        {params.search && (
          <Button variant="ghost" onClick={() => { setSearchInput(''); setParams((p) => ({ ...p, search: undefined, page: 1 })); }}>
            Clear
          </Button>
        )}
        <CustomSelect
          size="sm"
          value={params.fellowshipId ?? ''}
          onValueChange={(v) => setParams((p) => ({ ...p, fellowshipId: v || undefined, page: 1 }))}
          placeholder="All Fellowships"
          options={(fellowshipsData?.data ?? []).map((f) => ({ value: f.id, label: f.fellowshipName }))}
        />
        {isAdmin && (
          <CustomSelect
            size="sm"
            value={params.branchId ?? ''}
            onValueChange={(v) => setParams((p) => ({ ...p, branchId: v || undefined, page: 1 }))}
            placeholder="All Branches"
            options={(branches ?? []).map((b) => ({ value: b.id, label: b.branchName }))}
          />
        )}
        <CustomSelect
          size="sm"
          value={params.approvalStatus ?? ''}
          onValueChange={(v) => setParams((p) => ({ ...p, approvalStatus: (v || undefined) as MemberListParams['approvalStatus'], page: 1 }))}
          placeholder="All Statuses"
          options={[{ value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]}
        />
      </div>

      {!members || members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const isSelf = member.id === user?.id;
              const showFullDetails = !isMemberView || isSelf;
              const statusCls =
                member.approvalStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : member.approvalStatus === 'pending' ? 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
              return (
                <Link key={member.id} href={`/members/${member.id}`}>
                  <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <MemberAvatar
                          photoUrl={member.photoUrl}
                          firstName={member.firstName}
                          lastName={member.lastName}
                          size="sm"
                          variant="light"
                        />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {member.firstName} {member.lastName}
                          </CardTitle>
                          {showFullDetails && (
                            <CardDescription className="truncate">{member.branchName}</CardDescription>
                          )}
                        </div>
                        {showFullDetails && (
                          <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                            {member.approvalStatus}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    {showFullDetails && (
                      <CardContent className="pt-0">
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="truncate">{member.email}</p>
                          {member.phone && <p>{member.phone}</p>}
                          <p className="text-xs capitalize">{member.systemRole}</p>
                        </div>
                        {(isAdmin || isPastor) && (
                          <div className="mt-4">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async (e) => {
                                e.preventDefault();
                                const ok = await confirm({
                                  title: `Deactivate ${member.firstName} ${member.lastName}?`,
                                  description: 'They will be removed from the active directory. You can reactivate them later from their profile.',
                                  confirmLabel: 'Deactivate',
                                  variant: 'destructive',
                                });
                                if (!ok) return;
                                deactivate.mutate(member.id, {
                                  onSuccess: () => toast.success('Member removed from system.'),
                                  onError: () => toast.error('Failed to deactivate member. Please try again.'),
                                });
                              }}
                            >
                              Deactivate
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </Link>
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
