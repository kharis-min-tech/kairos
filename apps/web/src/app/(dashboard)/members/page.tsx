'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Upload, Download, UserPlus } from 'lucide-react';
import { Button, Badge, DataTable, TextInput, SelectInput, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { members, branches, departments, fellowships } from '@kairos/api-client';
import type { Member, Branch, BranchDepartment, Fellowship } from '@kairos/types';
import type { ColumnDef } from '@tanstack/react-table';

type BadgeVariant = 'active' | 'inactive' | 'pending' | 'error';

const statusVariant: Record<string, BadgeVariant> = {
  active: 'active',
  inactive: 'inactive',
  pending: 'pending',
};

export default function MembersListPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';

  // Data
  const [memberData, setMemberData] = useState<Member[]>([]);
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [departmentList, setDepartmentList] = useState<BranchDepartment[]>([]);
  const [fellowshipList, setFellowshipList] = useState<Fellowship[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [fellowshipFilter, setFellowshipFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: 50,
        search: search || undefined,
        branchId: branchFilter || undefined,
        departmentId: departmentFilter || undefined,
        fellowshipId: fellowshipFilter || undefined,
        status: statusFilter || undefined,
      };
      if (isPastor && user?.branchId) {
        params.branchId = user.branchId;
      }
      const res = await members.list(params);
      setMemberData(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch {
      setMemberData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, branchFilter, departmentFilter, fellowshipFilter, statusFilter, isPastor, user?.branchId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Load filter options once
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [b, d, f] = await Promise.all([
          branches.list({ limit: 100 }),
          departments.list({ limit: 100 }),
          fellowships.list({ limit: 100 }),
        ]);
        setBranchList(b.data as unknown as Branch[]);
        setDepartmentList(d.data);
        setFellowshipList(f.data as unknown as Fellowship[]);
      } catch {
        // Filters will remain empty
      }
    };
    loadFilters();
  }, []);

  const handleExport = async () => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        search: search || undefined,
        branchId: branchFilter || undefined,
        departmentId: departmentFilter || undefined,
        fellowshipId: fellowshipFilter || undefined,
        status: statusFilter || undefined,
      };
      const res = await members.export(params);
      window.open(res.url, '_blank');
    } catch {
      // Export failed silently
    }
  };

  const columns: ColumnDef<Member, unknown>[] = [
    {
      accessorKey: 'first_name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/members/view?id=${row.original.member_id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.first_name} {row.original.last_name}
        </Link>
      ),
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.is_active ? 'active' : 'inactive';
        return <Badge variant={statusVariant[status]}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'membership_date',
      header: 'Joined',
      cell: ({ row }) => {
        const d = row.original.membership_date;
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('en-GB');
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total members</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/members/import">
            <Button variant="secondary" size="sm">
              <Upload size={16} className="mr-2" />
              Import CSV
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
          <Link href="/members/new">
            <Button size="sm">
              <UserPlus size={16} className="mr-2" />
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <section className="flex flex-wrap items-end gap-4" aria-label="Search and filter members">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <TextInput
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="[&_input]:pl-9"
              aria-label="Search members"
            />
          </div>
        </div>
        {!isPastor && (
          <SelectInput
            options={branchList.map((b) => ({ value: String(b.branch_id), label: b.branch_name }))}
            placeholder="All Branches"
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            aria-label="Filter by branch"
          />
        )}
        <SelectInput
          options={departmentList.map((d) => ({ value: String(d.branch_department_id), label: String(d.department_id) }))}
          placeholder="All Departments"
          value={departmentFilter}
          onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
          aria-label="Filter by department"
        />
        <SelectInput
          options={fellowshipList.map((f) => ({ value: String(f.fellowship_id), label: f.fellowship_name }))}
          placeholder="All Fellowships"
          value={fellowshipFilter}
          onChange={(e) => { setFellowshipFilter(e.target.value); setPage(1); }}
          aria-label="Filter by fellowship"
        />
        <SelectInput
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'pending', label: 'Pending' },
          ]}
          placeholder="All Statuses"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        />
      </section>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <DataTable data={memberData} columns={columns} pageSize={50} enableSorting />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
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
