'use client';

import {
  Users, Building2, HandCoins, Heart,
  UserPlus, CalendarCheck, BarChart3, FileText,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleBarChart } from '@/components/shared/chart-wrapper';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { QuickActions } from '@/components/shared/quick-actions';
import { DarkHeader } from '@/components/shared/dark-header';
import { useAdminDashboard } from '@/hooks/use-dashboard';

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const quickActions = [
  { label: 'Add Member', icon: <UserPlus size={18} />, href: '/members/new', color: 'bg-primary/10 text-primary' },
  { label: 'Record Attendance', icon: <CalendarCheck size={18} />, href: '/attendance', color: 'bg-green-100 text-green-700' },
  { label: 'View Reports', icon: <BarChart3 size={18} />, href: '/reports', color: 'bg-blue-100 text-blue-700' },
  { label: 'Create Form', icon: <FileText size={18} />, href: '/forms/builder', color: 'bg-amber-100 text-amber-700' },
];

export function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  if (error) {
    return <p className="text-sm text-destructive">Failed to load dashboard data.</p>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const chartData = (data.attendanceTrends ?? []).map((t) => ({
    name: t.week,
    value: t.percentage,
  }));

  return (
    <div className="space-y-6">
      {/* Dark greeting header — mobile prominent */}
      <DarkHeader
        title="Church Overview"
        subtitle={`${data.totalBranches} branches · ${data.totalMembers.toLocaleString()} members`}
        className="lg:hidden"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={<Users size={20} />} label="Total Members" value={data.totalMembers.toLocaleString()} />
        <StatCard icon={<Building2 size={20} />} label="Branches" value={data.totalBranches} />
        <StatCard icon={<HandCoins size={20} />} label="Donations (30d)" value={formatGBP(data.donationsLast30Days)} />
        <StatCard icon={<Heart size={20} />} label="Souls (30d)" value={data.soulsLast30Days} />
      </div>

      {/* Charts + Activity row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance Trends (8 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <SimpleBarChart data={chartData} height={220} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No attendance data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={data.recentActivity ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Quick Actions</h3>
        <QuickActions actions={quickActions} />
      </div>
    </div>
  );
}
