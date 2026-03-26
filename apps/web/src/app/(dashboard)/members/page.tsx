'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMembers, useDeactivateMember } from '@/hooks/use-members';
import { useFellowships } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { Button } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { MemberListParams } from '@kairos/types';
import { MemberAvatar } from '@/components/member-avatar';

export default function MembersPage() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin';
  const isPastor = activeRole === 'pastor';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Failed to load members. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="mt-0.5 text-sm text-purple-200">
              Church member directory{pagination ? ` \u2014 ${pagination.total} total` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isPastor) && (
              <Link href="/members/new">
                <button className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-purple-900 transition-colors hover:bg-purple-50">
                  + Add Member
                </button>
              </Link>
            )}
            {(isAdmin || isPastor) && (
              <Link href="/members/import">
                <button className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                  Import CSV
                </button>
              </Link>
            )}
            {(isAdmin || isPastor) && (
              <button
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                onClick={handleExport}
                disabled={exportLoading}
              >
                {exportLoading ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
            {isAdmin && (
              <Link href="/members/approval">
                <button className="relative rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                  Approval Queue
                  {(pendingResult?.meta?.total ?? 0) > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-amber-900">
                      {pendingResult!.meta!.total}
                    </span>
                  )}
                </button>
              </Link>
            )}
          </div>
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
        <Button onClick={handleSearch} className="bg-purple-600 text-white hover:bg-purple-700">
          Search
        </Button>
        {params.search && (
          <Button variant="ghost" onClick={() => { setSearchInput(''); setParams((p) => ({ ...p, search: undefined, page: 1 })); }}>
            Clear
          </Button>
        )}
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={params.fellowshipId ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, fellowshipId: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Fellowships</option>
          {(fellowshipsData?.data ?? []).map((f) => (
            <option key={f.id} value={f.id}>{f.fellowshipName}</option>
          ))}
        </select>
        {isAdmin && (
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={params.branchId ?? ''}
            onChange={(e) => setParams((p) => ({ ...p, branchId: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All Branches</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.branchName}</option>
            ))}
          </select>
        )}
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={params.approvalStatus ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, approvalStatus: (e.target.value || undefined) as MemberListParams['approvalStatus'], page: 1 }))}
        >
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
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
              const statusCls =
                member.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
                : member.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700';
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
                          <CardDescription className="truncate">{member.branchName}</CardDescription>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                          {member.approvalStatus}
                        </span>
                      </div>
                    </CardHeader>
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
                            onClick={(e) => {
                              e.preventDefault();
                              if (confirm(`Deactivate ${member.firstName} ${member.lastName}?`)) {
                              deactivate.mutate(member.id, {
                                onSuccess: () => toast.success('Member removed from system.'),
                                onError: () => toast.error('Failed to deactivate member. Please try again.'),
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
