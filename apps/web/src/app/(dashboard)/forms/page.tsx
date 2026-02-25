'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Eye, Edit, FileText } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, Badge, SelectInput, Spinner, Card, CardBody, DataTable } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { forms, branches } from '@kairos/api-client';
import type { Form, Branch } from '@kairos/types';
import type { ColumnDef } from '@tanstack/react-table';

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function FormsListPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';
  const [formList, setFormList] = useState<Form[]>([]);
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    if (!isPastor) {
      branches.list({ limit: 100 }).then((res: { data: Branch[] }) => setBranchList(res.data)).catch(() => {});
    }
  }, [isPastor]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | undefined> = {};
      if (scopeFilter) params.scope = scopeFilter;
      if (branchFilter) params.branchId = branchFilter;
      const res = await forms.list(params);
      setFormList(res.data ?? []);
    } catch {
      setFormList([]);
    } finally {
      setLoading(false);
    }
  }, [scopeFilter, branchFilter]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const columns: ColumnDef<Form, unknown>[] = [
    {
      accessorKey: 'formName',
      header: 'Form Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <span className="font-medium text-gray-900">{row.original.formName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ getValue }) => (
        <Badge variant={getValue() === 'Church-wide' ? 'active' : 'pending'}>
          {getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'active' : 'inactive'}>
          {getValue() ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/forms/view?id=${row.original.formId}`}>
            <Button variant="ghost" size="sm" aria-label="Preview form"><Eye size={14} /></Button>
          </Link>
          <Link href={`/forms/builder?edit=${row.original.formId}`}>
            <Button variant="ghost" size="sm" aria-label="Edit form"><Edit size={14} /></Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <Breadcrumbs items={[{ label: 'Forms' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
        <Link href="/forms/builder">
          <Button><Plus size={16} className="mr-2" /> Create Form</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-4">
            <SelectInput name="scopeFilter" options={[{ value: 'Church-wide', label: 'Church-wide' }, { value: 'Branch-specific', label: 'Branch-specific' }]} placeholder="All Scopes" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} aria-label="Filter by scope" />
            {!isPastor && (
              <SelectInput name="branchFilter" options={branchList.map((b) => ({ value: String(b.branchId), label: b.branchName }))} placeholder="All Branches" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} aria-label="Filter by branch" />
            )}
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <DataTable data={formList} columns={columns} enableSorting />
      )}
    </>
  );
}
