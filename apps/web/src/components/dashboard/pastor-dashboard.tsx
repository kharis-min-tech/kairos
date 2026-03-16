'use client';

import { Users, HandCoins, Heart, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleLineChart } from '@/components/shared/chart-wrapper';
import { DarkHeader } from '@/components/shared/dark-header';
import { usePastorDashboard } from '@/hooks/use-dashboard';

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

export function PastorDashboard() {
  const { data, isLoading, error } = usePastorDashboard();

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

  const overdueCount = data.overdueFollowups ?? 0;
  const chartData = (data.branchAttendanceTrends ?? []).map((t) => ({
    name: t.week,
    value: t.percentage,
  }));

  return (
    <div className="space-y-6">
      <DarkHeader
        title="Branch Overview"
        subtitle={`${data.branchMemberCount?.toLocaleString() ?? 0} members in your branch`}
        className="lg:hidden"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={<Users size={20} />} label="Branch Members" value={data.branchMemberCount?.toLocaleString() ?? 0} />
        <StatCard icon={<HandCoins size={20} />} label="Donations (30d)" value={formatGBP(data.branchDonationsLast30Days ?? 0)} />
        <StatCard icon={<Heart size={20} />} label="Souls Captured" value={data.branchSouls ?? 0} />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Overdue Follow-ups"
          value={overdueCount}
          className={overdueCount > 0 ? 'border-amber-200 bg-amber-50/50' : ''}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Branch Attendance Trends (8 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <SimpleLineChart data={chartData} height={220} showDots />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No attendance data available</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Follow-ups detail */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <CardTitle className="text-sm font-medium">Overdue Follow-ups</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {overdueCount === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No overdue follow-ups. Great job!</p>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-amber-600">{overdueCount}</p>
                  <p className="mt-2 text-sm text-muted-foreground">members need follow-up</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
