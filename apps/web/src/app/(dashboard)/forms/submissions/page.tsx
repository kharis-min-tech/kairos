'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, SelectInput, DatePicker, Spinner, Alert, Card, CardHeader, CardBody, DataTable } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { forms, branches } from '@kairos/api-client';
import type { FormSubmission, Form, Branch } from '@kairos/types';
import type { ColumnDef } from '@tanstack/react-table';

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function FormSubmissionsPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [formList, setFormList] = useState<Form[]>([]);
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    Promise.all([
      forms.list({ limit: 100 }),
      !isPastor ? branches.list({ limit: 100 }) : Promise.resolve({ data: [] }),
    ]).then(([fRes, bRes]) => {
      setFormList(fRes.data ?? []);
      setBranchList((bRes.data ?? []) as unknown as Branch[]);
    }).catch(() => {});
  }, [isPastor]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | undefined> = {};
      if (formFilter) params.formId = formFilter;
      if (branchFilter) params.branchId = branchFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await forms.listSubmissions(params);
      setSubmissions(res.data ?? []);
    } catch {
      setError('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [formFilter, branchFilter, startDate, endDate]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | undefined> = {};
      if (formFilter) params.formId = formFilter;
      if (branchFilter) params.branchId = branchFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await forms.exportSubmissions(params);
      if (res.url) window.open(res.url, '_blank');
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnDef<FormSubmission, unknown>[] = [
    { accessorKey: 'submissionId', header: 'ID' },
    { accessorKey: 'formId', header: 'Form', cell: ({ getValue }) => {
      const f = formList.find((fm) => fm.formId === getValue());
      return f?.formName ?? `Form #${getValue()}`;
    }},
    { accessorKey: 'memberId', header: 'Member', cell: ({ getValue }) => getValue() ? `Member #${getValue()}` : 'Guest' },
    { accessorKey: 'submittedAt', header: 'Submitted', cell: ({ getValue }) => formatDate(getValue() as string) },
  ];

  return (
    <>
      <Breadcrumbs items={[{ label: 'Forms', href: '/forms' }, { label: 'Submissions' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Form Submissions</h1>
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          <Download size={16} className="mr-2" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectInput label="Form" name="formFilter" options={formList.map((f) => ({ value: String(f.formId), label: f.formName }))} placeholder="All Forms" value={formFilter} onChange={(e) => setFormFilter(e.target.value)} />
            {!isPastor && (
              <SelectInput label="Branch" name="branchFilter" options={branchList.map((b) => ({ value: String(b.branchId), label: b.branchName }))} placeholder="All Branches" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} />
            )}
            <DatePicker label="Start Date" name="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <DatePicker label="End Date" name="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <DataTable data={submissions} columns={columns} enableSorting />
      )}
    </>
  );
}
