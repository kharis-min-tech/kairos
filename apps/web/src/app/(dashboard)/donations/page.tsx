'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardBody, SelectInput, TextInput, StatCard, DataTable, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { donations } from '@kairos/api-client';
import type { Donation } from '@kairos/types';
import type { ColumnDef } from '@tanstack/react-table';

const PURPOSES = [
  { value: '', label: 'All Purposes' },
  { value: 'Offering', label: 'Offering' },
  { value: 'Tithe', label: 'Tithe' },
  { value: 'Building Fund', label: 'Building Fund' },
  { value: 'Other', label: 'Other' },
];

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const columns: ColumnDef<Donation, unknown>[] = [
  { accessorKey: 'donationDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
  { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => formatGBP(getValue() as number) },
  { accessorKey: 'donationPurpose', header: 'Purpose' },
  { accessorKey: 'paymentMethod', header: 'Method' },
  {
    accessorKey: 'isAnonymous',
    header: 'Donor',
    cell: ({ row }) => row.original.isAnonymous ? 'Anonymous' : `Member #${row.original.memberId ?? '—'}`,
  },
];

export default function DonationHistoryPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalGiving, setTotalGiving] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [purpose, setPurpose] = useState('');
  const [memberId, setMemberId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (purpose) params.purpose = purpose;
      if (memberId) params.memberId = parseInt(memberId);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await donations.list(params);
      const items = res.data ?? [];
      setData(items);
      setTotalGiving(items.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0));
    } catch {
      setData([]);
      setTotalGiving(0);
    } finally {
      setLoading(false);
    }
  }, [purpose, memberId, startDate, endDate]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (purpose) params.purpose = purpose;
      if (memberId) params.memberId = parseInt(memberId);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await donations.export(params);
      if (res.url) window.open(res.url, '_blank');
    } catch {
      // silently fail export
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Donations' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Donation History</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Link href="/donations/record">
            <Button>Record Donation</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Donations" value={data.length} />
        <StatCard label="Total Giving" value={formatGBP(totalGiving)} />
        <StatCard label="Average Donation" value={data.length > 0 ? formatGBP(totalGiving / data.length) : '£0.00'} />
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectInput label="Purpose" name="filterPurpose" options={PURPOSES} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            <TextInput label="Member ID" name="filterMember" type="number" placeholder="Filter by member" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
            <TextInput label="Start Date" name="filterStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextInput label="End Date" name="filterEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <DataTable data={data} columns={columns} />
      )}

      <p className="mt-4 text-xs text-gray-500">
        Role: {user?.role ?? '—'} · Branch ID: {user?.branchId ?? '—'}
      </p>
    </>
  );
}
