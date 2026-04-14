'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { SelectInput, DatePicker, Alert, Spinner, Card, CardHeader, CardBody, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { donations, branches } from '@kairos/api-client';
import type { BranchWithRegion } from '@kairos/types';

interface PurposeSummary { purpose: string; total: number; count: number; }
interface BranchSummary { branchId: string; branchName: string; total: number; count: number; }
interface TopDonor { memberId: string | null; name: string; total: number; isAnonymous: boolean; }

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

export default function DonationReportsPage() {
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';
  const [branchList, setBranchList] = useState<BranchWithRegion[]>([]);
  const [branchFilter, setBranchFilter] = useState(isPastor && user?.branchId ? user.branchId : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [byPurpose, setByPurpose] = useState<PurposeSummary[]>([]);
  const [byBranch, setByBranch] = useState<BranchSummary[]>([]);
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    if (!isPastor) {
      branches.list().then((res) => setBranchList(res.data ?? [])).catch(() => {});
    }
  }, [isPastor]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number | undefined> = {};
      if (branchFilter) params.branchId = branchFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await donations.getReports(params);
      const data = (res.data ?? {}) as Record<string, unknown>;
      const purposeEntries = Object.entries((data.totalByPurpose as Record<string, number>) ?? {}).map(([purpose, total]) => ({
        purpose,
        total: total as number,
        count: 0,
      }));
      const branchEntries = Object.entries(data.totalByBranch ?? {}).map(([branchName, total]) => ({
        branchId: '',
        branchName,
        total: total as number,
        count: 0,
      }));
      setByPurpose(purposeEntries);
      setByBranch(branchEntries);
      setTopDonors(((data.topDonors ?? []) as { name: string; total: number }[]).map((d) => ({
        memberId: null,
        name: d.name,
        total: d.total,
        isAnonymous: d.name === 'Anonymous',
      })));
      const total = purposeEntries.reduce((sum, p) => sum + p.total, 0);
      setGrandTotal(total);
    } catch {
      setError('Failed to load donation reports.');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, startDate, endDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const maxPurposeTotal = Math.max(1, ...byPurpose.map((p) => p.total));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Donations', href: '/donations' }, { label: 'Reports' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Donation Reports</h1>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-medium text-gray-700">Filters</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isPastor && (
              <SelectInput label="Branch" name="branchFilter" options={branchList.map((b) => ({ value: String(b.id), label: b.branchName }))} placeholder="All Branches" value={String(branchFilter)} onChange={(e) => setBranchFilter(e.target.value)} />
            )}
            <DatePicker label="Start Date" name="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <DatePicker label="End Date" name="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          <StatCard label="Total Donations" value={formatGBP(grandTotal)} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Purpose */}
            <Card>
              <CardHeader><h2 className="text-sm font-medium text-gray-700">By Purpose</h2></CardHeader>
              <CardBody>
                {byPurpose.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {byPurpose.map((p) => (
                      <div key={p.purpose}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{p.purpose}</span>
                          <span className="font-medium text-gray-900">{formatGBP(p.total)} ({p.count})</span>
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
              </CardBody>
            </Card>

            {/* By Branch */}
            <Card>
              <CardHeader><h2 className="text-sm font-medium text-gray-700">By Branch</h2></CardHeader>
              <CardBody>
                {byBranch.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No data</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Branch</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byBranch.map((b) => (
                          <tr key={b.branchId} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">{b.branchName}</td>
                            <td className="py-2 text-right font-medium">{formatGBP(b.total)}</td>
                            <td className="py-2 text-right text-gray-600">{b.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Top Donors */}
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">Top Donors</h2></CardHeader>
            <CardBody>
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
                          <td className="py-2 text-gray-900">{d.isAnonymous ? 'Anonymous' : d.name}</td>
                          <td className="py-2 text-right font-medium">{formatGBP(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
