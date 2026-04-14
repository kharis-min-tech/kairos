'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatCard, Card, CardHeader, CardBody, Skeleton, Badge } from '@/components/ui';
import { AttendanceChart } from './attendance-chart';
import { dashboard } from '@kairos/api-client';

interface PastorDashboardData {
  branchMemberCount?: number;
  branchDonationsLast30Days?: number;
  branchSouls?: number;
  overdueFollowUps?: OverdueFollowUp[];
  branchAttendanceTrends?: { week: string; percentage: number }[];
}

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface OverdueFollowUp {
  memberId: string;
  memberName: string;
  type: string;
  lastFollowUp: string | null;
  daysSince: number;
}

export function PastorDashboard() {
  const [data, setData] = useState<PastorDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboard.getPastor().then((d) => setData(d as unknown as PastorDashboardData)).catch(() => setError('Failed to load dashboard'));
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

  const overdueFollowUps: OverdueFollowUp[] = (data.overdueFollowUps as OverdueFollowUp[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Branch Members" value={data.branchMemberCount?.toLocaleString() ?? 0} />
        <StatCard label="Donations (30d)" value={formatGBP(data.branchDonationsLast30Days ?? 0)} />
        <StatCard label="Souls Captured" value={data.branchSouls ?? 0} />
        <StatCard label="Overdue Follow-ups" value={overdueFollowUps.length} />
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
              <h2 className="text-sm font-medium text-gray-700">Overdue Follow-ups ({overdueFollowUps.length})</h2>
            </div>
          </CardHeader>
          <CardBody>
            {overdueFollowUps.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No overdue follow-ups.</p>
            ) : (
              <ul className="divide-y divide-gray-100" role="list" aria-label="Overdue follow-ups">
                {overdueFollowUps.slice(0, 10).map((item) => (
                  <li key={item.memberId} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.memberName}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="error">{item.daysSince}d overdue</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.lastFollowUp ? formatDate(item.lastFollowUp) : 'Never'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
