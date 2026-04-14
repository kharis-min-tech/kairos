'use client';

import { useEffect, useState } from 'react';
import { StatCard, Card, CardHeader, CardBody, Skeleton } from '@/components/ui';
import { AttendanceChart } from './attendance-chart';
import { dashboard } from '@kairos/api-client';

interface AdminDashboardData {
  totalMembers?: number;
  totalBranches?: number;
  donationsLast30Days?: number;
  soulsLast30Days?: number;
  attendanceTrends?: { week: string; percentage: number }[];
  recentActivity: { action: string; timestamp: string; actor: string }[];
}

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboard.getAdmin().then((d) => setData(d as unknown as AdminDashboardData)).catch(() => setError('Failed to load dashboard'));
  }, []);

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={data.totalMembers?.toLocaleString() ?? '0'} />
        <StatCard label="Branches" value={data.totalBranches ?? 0} />
        <StatCard label="Donations (30d)" value={formatGBP(data.donationsLast30Days ?? 0)} />
        <StatCard label="Souls (30d)" value={data.soulsLast30Days ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-gray-700">Attendance Trends (8 weeks)</h2>
          </CardHeader>
          <CardBody>
            <AttendanceChart data={data.attendanceTrends ?? []} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-gray-700">Recent Activity</h2>
          </CardHeader>
          <CardBody>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              <ul className="divide-y divide-gray-100" role="list" aria-label="Recent activity">
                {data.recentActivity.slice(0, 10).map((item: { action: string; timestamp: string; actor: string }, i: number) => (
                  <li key={i} className="py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.action}</p>
                      <p className="text-xs text-gray-500">{item.actor}</p>
                    </div>
                    <time className="text-xs text-gray-500 shrink-0" dateTime={item.timestamp}>
                      {formatTimeAgo(item.timestamp)}
                    </time>
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
