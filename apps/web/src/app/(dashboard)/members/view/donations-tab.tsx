'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, DataTable, Spinner, TextInput } from '@/components/ui';
import { donations } from '@kairos/api-client';
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
  const [donationList, setDonationList] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<{ total: number; byPurpose: Record<string, number> }>({
    total: 0,
    byPurpose: {},
  });

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { memberId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [listRes, summaryRes] = await Promise.all([
        donations.list(params),
        donations.getMemberSummary({ memberId }),
      ]);

      setDonationList(listRes.data);
      setSummary({ total: summaryRes.total, byPurpose: summaryRes.byPurpose });
    } catch {
      setError('Failed to load donations.');
    } finally {
      setLoading(false);
    }
  }, [memberId, startDate, endDate]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardBody>
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
        </CardBody>
      </Card>

      {/* Date Range Filters */}
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

      {/* Donations Table or Empty State */}
      {donationList.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500">No donations recorded yet.</p>
          </CardBody>
        </Card>
      ) : (
        <DataTable data={donationList} columns={columns} />
      )}
    </div>
  );
}
