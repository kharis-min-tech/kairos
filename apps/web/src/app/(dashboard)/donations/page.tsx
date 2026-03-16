'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, Download, Plus, TrendingUp } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { PageHeader, LoadingSkeleton, EmptyState } from '@/components/shared';
import { Button, Card, CardHeader, CardContent, SelectInput, TextInput, StatCard, DataTable } from '@/components/ui';
import { useDonations, useExportDonations } from '@/hooks/use-donations';
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
  const [purpose, setPurpose] = useState('');
  const [memberId, setMemberId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = {};
    if (purpose) p.purpose = purpose;
    if (memberId) p.memberId = parseInt(memberId);
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    return p;
  }, [purpose, memberId, startDate, endDate]);

  const { data: donationsRes, isLoading } = useDonations(params);
  const { refetch: exportDonations, isFetching: exporting } = useExportDonations(params);

  const items = donationsRes?.data ?? [];
  const totalGiving = items.reduce((sum, d) => sum + d.amount, 0);

  const handleExport = async () => {
    const result = await exportDonations();
    if (result.data?.url) window.open(result.data.url, '_blank');
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Donations' }]} />
      <PageHeader
        title="Donation History"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Link href="/donations/record">
              <Button><Plus className="h-4 w-4 mr-2" /> Record Donation</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Donations" value={items.length} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Giving" value={formatGBP(totalGiving)} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Average Donation" value={items.length > 0 ? formatGBP(totalGiving / items.length) : '£0.00'} />
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectInput label="Purpose" name="filterPurpose" options={PURPOSES} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            <TextInput label="Member ID" name="filterMember" type="number" placeholder="Filter by member" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
            <TextInput label="Start Date" name="filterStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextInput label="End Date" name="filterEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title="No donations found"
          description="No donations match the current filters."
          icon={<DollarSign className="h-12 w-12" />}
        />
      ) : (
        <DataTable data={items} columns={columns} />
      )}
    </>
  );
}
