'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatCard, Card, CardHeader, CardBody, Skeleton } from '@/components/ui';
import { AttendanceChart } from './attendance-chart';
import { dashboard } from '@kairos/api-client';
import type { PastorDashboard as PastorDashboardData } from '@kairos/api-client';

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

export function PastorDashboard() {
  const [data, setData] = useState<PastorDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboard.getPastor().then(setData).catch(() => setError('Failed to load dashboard'));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const overdueCount = typeof data.overdueFollowups === 'number' ? data.overdueFollowups : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Branch Members" value={data.branchMemberCount?.toLocaleString() ?? 0} />
        <StatCard label="Donations (30d)" value={formatGBP(data.branchDonationsLast30Days ?? 0)} />
        <StatCard label="Souls Captured" value={data.branchSouls ?? 0} />
        <StatCard label="Overdue Follow-ups" value={overdueCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-gray-700">Branch Attendance Trends (8 weeks)</h2>
          </CardHeader>
          <CardBody>
            <AttendanceChart data={data.branchAttendanceTrends ?? []} height={220} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-medium text-gray-700">Overdue Follow-ups</h2>
            </div>
          </CardHeader>
          <CardBody>
            {overdueCount === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No overdue follow-ups.</p>
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{overdueCount}</p>
                  <p className="text-sm text-gray-500 mt-1">overdue follow-ups</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
