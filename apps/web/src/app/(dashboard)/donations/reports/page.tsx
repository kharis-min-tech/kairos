'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useDonationReports } from '@/hooks/use-donations';
import { useBranches } from '@/hooks/use-branches';
import type { DonationReportsParams } from '@kairos/types';

export default function DonationReportsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin' && activeRole === 'admin';
  const isPastor = user?.systemRole === 'pastor' || activeRole === 'pastor';
  const { data: branches } = useBranches();

  // Redirect members & leaders
  useEffect(() => {
    if (!isAdmin && !isPastor) {
      router.replace('/donations');
    }
  }, [isAdmin, isPastor, router]);
  
  const [params, setParams] = useState<DonationReportsParams>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  const { data: reportData, isLoading, error } = useDonationReports(params);

  const handleFilter = () => {
    setParams({
      branchId: selectedBranch || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load reports. Please try again.</p>
      </div>
    );
  }

  const maxAmount = reportData?.byPurpose.length 
    ? Math.max(...reportData.byPurpose.map(p => p.amount))
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donation Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            View donation analytics and insights
          </p>
        </div>
        <Link href="/donations">
          <Button variant="outline" size="sm">← Back to Donations</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {isAdmin && (
              <div>
                <label className="text-sm font-medium">Branch</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {(branches ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleFilter}>Apply Filters</Button>
            {(params.branchId || params.startDate || params.endDate) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedBranch('');
                  setStartDate('');
                  setEndDate('');
                  setParams({});
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Donations */}
      <Card>
        <CardHeader>
          <CardTitle>Total Donations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            £{Number(reportData?.totalAmount || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {reportData?.totalCount || 0} donations
          </p>
        </CardContent>
      </Card>

      {/* By Purpose */}
      <Card>
        <CardHeader>
          <CardTitle>Donations by Purpose</CardTitle>
        </CardHeader>
        <CardContent>
          {!reportData?.byPurpose.length ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="space-y-4">
              {reportData.byPurpose.map((item) => {
                const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                return (
                  <div key={item.purpose}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.purpose}</span>
                      <span className="text-sm text-muted-foreground">
                        £{Number(item.amount).toFixed(2)} ({item.count})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Branch (Admin only) */}
      {isAdmin && reportData?.byBranch && reportData.byBranch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Donations by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                    <th className="pb-3">Branch</th>
                    <th className="pb-3 text-right">Total Amount</th>
                    <th className="pb-3 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.byBranch.map((branch) => (
                    <tr key={branch.branchId} className="border-b last:border-0">
                      <td className="py-3 text-sm font-medium">{branch.branchName}</td>
                      <td className="py-3 text-sm text-right">
                        £{Number(branch.amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-right">{branch.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Donors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Donors</CardTitle>
        </CardHeader>
        <CardContent>
          {!reportData?.topDonors.length ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="space-y-3">
              {reportData.topDonors.map((donor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {donor.isAnonymous || donor.memberName === 'Anonymous' ? (
                        <span className="text-muted-foreground">Anonymous</span>
                      ) : (
                        donor.memberName
                      )}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    £{Number(donor.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
