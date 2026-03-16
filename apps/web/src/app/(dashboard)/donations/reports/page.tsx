'use client';

import { useState, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { PageHeader, LoadingSkeleton } from '@/components/shared';
import { SelectInput, TextInput, Card, CardHeader, CardContent, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useDonationReports } from '@/hooks/use-donations';
import { useBranches } from '@/hooks/use-branches';

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

export default function DonationReportsPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';
  const [branchFilter, setBranchFilter] = useState(isPastor && user?.branchId ? user.branchId : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: branchesRes } = useBranches(isPastor ? undefined : { limit: 100 });
  const branchList = branchesRes?.data ?? [];

  const reportParams = useMemo(() => {
    const p: { branchId?: number; startDate?: string; endDate?: string } = {};
    if (branchFilter) p.branchId = Number(branchFilter);
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    return p;
  }, [branchFilter, startDate, endDate]);

  const { data: report, isLoading } = useDonationReports(reportParams);

  const byPurpose = useMemo(() =>
    Object.entries(report?.totalByPurpose ?? {}).map(([purpose, total]) => ({
      purpose,
      total: total as number,
    })),
    [report]
  );

  const byBranch = useMemo(() =>
    Object.entries(report?.totalByBranch ?? {}).map(([branchName, total]) => ({
      branchName,
      total: total as number,
    })),
    [report]
  );

  const topDonors = report?.topDonors ?? [];
  const grandTotal = byPurpose.reduce((sum, p) => sum + p.total, 0);
  const maxPurposeTotal = Math.max(1, ...byPurpose.map((p) => p.total));

  if (isLoading) return <LoadingSkeleton variant="cards" count={4} />;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Donations', href: '/donations' }, { label: 'Reports' }]} />
      <PageHeader title="Donation Reports" />

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isPastor && (
              <SelectInput
                label="Branch"
                name="branchFilter"
                options={branchList.map((b) => ({ value: String(b.branchId), label: b.branchName }))}
                placeholder="All Branches"
                value={String(branchFilter)}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            )}
            <TextInput label="Start Date" name="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextInput label="End Date" name="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Donations" value={formatGBP(grandTotal)} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Purpose */}
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">By Purpose</h2></CardHeader>
            <CardContent>
              {byPurpose.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {byPurpose.map((p) => (
                    <div key={p.purpose}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{p.purpose}</span>
                        <span className="font-medium text-gray-900">{formatGBP(p.total)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(p.total / maxPurposeTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Branch */}
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">By Branch</h2></CardHeader>
            <CardContent>
              {byBranch.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Branch</th>
                        <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byBranch.map((b) => (
                        <tr key={b.branchName} className="border-b border-gray-100">
                          <td className="py-2 text-gray-900">{b.branchName}</td>
                          <td className="py-2 text-right font-medium">{formatGBP(b.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Donors */}
        <Card>
          <CardHeader><h2 className="text-sm font-medium text-gray-700">Top Donors</h2></CardHeader>
          <CardContent>
            {topDonors.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Donor</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDonors.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 text-gray-900">{d.name === 'Anonymous' ? 'Anonymous' : d.name}</td>
                        <td className="py-2 text-right font-medium">{formatGBP(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
