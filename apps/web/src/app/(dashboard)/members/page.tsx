'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Upload, Download, UserPlus, Users, UserCheck, Clock } from 'lucide-react';
import { Button, Badge, DataTable, StatCard } from '@/components/ui';
import { PageHeader, SearchBar, FilterTabs, LoadingSkeleton, EmptyState } from '@/components/shared';
import { useAuth } from '@/lib/auth';
import { useMembers, useExportMembers } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import type { Member } from '@kairos/types';
import type { ColumnDef } from '@tanstack/react-table';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export default function MembersListPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      limit: 50,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    };
    if (isPastor && user?.branchId) {
      params.branchId = user.branchId;
    }
    return params;
  }, [page, search, statusFilter, isPastor, user?.branchId]);

  const { data: membersRes, isLoading } = useMembers(queryParams);
  const { data: pendingRes } = useMembers({ status: 'pending', limit: 1 });
  const { data: branchesRes } = useBranches({ limit: 100 });
  const { refetch: exportMembers } = useExportMembers(queryParams);

  const memberData = membersRes?.data ?? [];
  const total = membersRes?.pagination?.total ?? 0;
  const totalPages = membersRes?.pagination?.totalPages ?? 1;
  const pendingCount = pendingRes?.pagination?.total ?? 0;
  const branchList = (branchesRes?.data ?? []) as Array<{ branchId: number; branchName: string }>;

  const activeCount = memberData.filter((m: Member) => m.isActive).length;

  const handleExport = async () => {
    const res = await exportMembers();
    if (res.data?.url) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    }
  };

  const columns: ColumnDef<Member, unknown>[] = [
    {
      accessorKey: 'firstName',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/members/view?id=${row.original.memberId}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.firstName} {row.original.lastName}
        </Link>
      ),
    },
    { accessorKey: 'email', header: 'Email', meta: { className: 'hidden sm:table-cell' } },
    { accessorKey: 'phone', header: 'Phone', meta: { className: 'hidden sm:table-cell' } },
    {
      accessorKey: 'homeBranchId',
      header: 'Home Branch',
      meta: { className: 'hidden md:table-cell' },
      cell: ({ row }) => {
        const branch = branchList.find((b) => b.branchId === row.original.homeBranchId);
        return branch?.branchName || `Branch ${row.original.homeBranchId}`;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <Badge variant={active ? 'default' : 'secondary'}>
            {active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'membershipDate',
      header: 'Joined',
      meta: { className: 'hidden md:table-cell' },
      cell: ({ row }) => {
        const d = row.original.membershipDate;
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB');
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${total} total members`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 && (
              <Link href="/members/approvals">
                <Button variant="outline" size="sm">
                  Pending Approvals
                  <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
                </Button>
              </Link>
            )}
            <Link href="/members/import">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/members/new">
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Members" value={total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active" value={activeCount} icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="Pending" value={pendingCount} icon={<Clock className="h-5 w-5" />} className="hidden lg:flex" />
      </div>

      {/* Search & Filter */}
      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Search by name, email, or phone..."
        />
        <FilterTabs
          tabs={STATUS_TABS}
          activeTab={statusFilter}
          onTabChange={(tab) => { setStatusFilter(tab); setPage(1); }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : memberData.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No members found"
          description={search ? 'Try adjusting your search or filters.' : 'Add your first member to get started.'}
          action={
            !search && (
              <Link href="/members/new">
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <DataTable data={memberData} columns={columns} pageSize={50} enableSorting />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
