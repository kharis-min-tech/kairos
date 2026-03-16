'use client';

import { useState } from 'react';
import { Card, CardContent, DataTable, Spinner, TextInput, Alert } from '@/components/ui';
import { useDonations, useMemberDonationSummary } from '@/hooks/use-donations';
import type { Donation } from '@kairos/types';
import type { ColumnDef } from '@tanstack/react-table';

interface DonationsTabProps {
  memberId: number;
}

const PURPOSES = ['Offering', 'Tithe', 'Building Fund', 'Other'] as const;

const columns: ColumnDef<Donation, unknown>[] = [
  {
    accessorKey: 'donationDate',
    header: 'Date',
    cell: ({ getValue }) => {
      const val = getValue();
      return val ? new Date(val as string | Date).toLocaleDateString('en-GB') : '—';
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ getValue }) => `£${Number(getValue()).toFixed(2)}`,
  },
  {
    accessorKey: 'donationPurpose',
    header: 'Purpose',
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Payment Method',
  },
];

export function DonationsTab({ memberId }: DonationsTabProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: listRes, isLoading: listLoading, error: listError } = useDonations({
    memberId,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  });

  const { data: summaryRes, isLoading: summaryLoading } = useMemberDonationSummary({ memberId });

  const donationList = (listRes?.data ?? []) as Donation[];
  const summary = {
    total: (summaryRes as { total?: number })?.total ?? 0,
    byPurpose: (summaryRes as { byPurpose?: Record<string, number> })?.byPurpose ?? {},
  };
  const isLoading = listLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (listError) {
    return <Alert variant="error" title="Error">Failed to load donations.</Alert>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Donation Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-semibold text-gray-900">£{summary.total.toFixed(2)}</p>
            </div>
            {PURPOSES.map((purpose) => (
              <div key={purpose}>
                <p className="text-xs text-gray-500">{purpose}</p>
                <p className="text-lg font-semibold text-gray-900">
                  £{(summary.byPurpose[purpose] ?? 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 items-end">
        <TextInput
          label="Start Date"
          type="date"
          name="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextInput
          label="End Date"
          type="date"
          name="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {donationList.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No donations recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable data={donationList} columns={columns} />
      )}
    </div>
  );
}
