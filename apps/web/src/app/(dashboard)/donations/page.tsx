'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useDonations } from '@/hooks/use-donations';
import { api } from '@/lib/api';
import type { ListDonationsParams } from '@kairos/types';

const PURPOSES = ['All', 'Offering', 'Tithe', 'Building Fund', 'Other'] as const;

export default function DonationsPage() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  const isAdmin = user?.systemRole === 'admin' && activeRole === 'admin';
  const isPastor = user?.systemRole === 'pastor' || activeRole === 'pastor';
  const isMember = !isAdmin && !isPastor;

  const [params, setParams] = useState<ListDonationsParams>({
    page: 1,
    limit: 20,
  });
  const [selectedPurpose, setSelectedPurpose] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const { data: result, isLoading, error } = useDonations(params);
  const donations = result?.data || [];
  const pagination = result?.meta;

  const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const averageAmount = donations.length > 0 ? totalAmount / donations.length : 0;

  const handleFilter = () => {
    setParams((prev) => ({
      ...prev,
      purpose: selectedPurpose !== 'All' ? selectedPurpose as any : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setSelectedPurpose('All');
    setStartDate('');
    setEndDate('');
    setParams({ page: 1, limit: 20 });
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const blob = await api.donations.exportCsv({
        startDate: params.startDate,
        endDate: params.endDate,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'donations.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Donations exported successfully!');
    } catch {
      toast.error('Failed to export donations');
    } finally {
      setExportLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading donations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load donations. Please try again.</p>
        <p className="text-xs text-muted-foreground mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isMember
              ? 'Your giving history'
              : isPastor
              ? 'Branch donation records'
              : `All donations — ${pagination?.total ?? 0} total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin & Pastor only: record, import */}
          {(isAdmin || isPastor) && (
            <Link href="/donations/record">
              <Button size="sm">+ Record Donation</Button>
            </Link>
          )}
          {(isAdmin || isPastor) && (
            <Link href="/donations/import">
              <Button variant="outline" size="sm">Import CSV</Button>
            </Link>
          )}
          {/* All roles: export & reports */}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? 'Exporting...' : 'Export CSV'}
          </Button>
          {(isAdmin || isPastor) && (
            <Link href="/donations/reports">
              <Button variant="outline" size="sm">View Reports</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isMember ? 'My Donations' : 'Total Donations'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isMember ? 'My Total Giving' : 'Total Giving'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Donation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{averageAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Purpose</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
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
            {(params.purpose || params.startDate || params.endDate) && (
              <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Donations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isMember ? 'My Giving History' : 'Donation History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {donations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No donations found.</p>
              {isMember && (
                <p className="text-xs text-muted-foreground mt-1">
                  Your donation history will appear here once recorded.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Purpose</th>
                      <th className="pb-3 pr-4">Payment Method</th>
                      {/* Admin & Pastor see donor name */}
                      {(isAdmin || isPastor) && <th className="pb-3 pr-4">Donor</th>}
                      {/* Admin sees branch */}
                      {isAdmin && <th className="pb-3">Branch</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((donation) => (
                      <tr key={donation.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 text-sm">
                          {new Date(donation.donationDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 pr-4 text-sm font-medium">
                          £{Number(donation.amount).toFixed(2)}
                        </td>
                        <td className="py-3 pr-4 text-sm">{donation.donationPurpose}</td>
                        <td className="py-3 pr-4 text-sm">{donation.paymentMethod}</td>
                        {(isAdmin || isPastor) && (
                          <td className="py-3 pr-4 text-sm">
                            {donation.isAnonymous ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Anonymous</span>
                            ) : donation.memberFirstName ? (
                              `${donation.memberFirstName} ${donation.memberLastName}`
                            ) : (
                              <span className="text-muted-foreground">Walk-in</span>
                            )}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3 text-sm text-muted-foreground">{donation.branchName}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
