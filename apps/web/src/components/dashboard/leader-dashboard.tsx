'use client';

import { Users, AlertTriangle, UserPlus, Calendar } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DarkHeader } from '@/components/shared/dark-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useLeaderDashboard } from '@/hooks/use-dashboard';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function LeaderDashboard() {
  const { data, isLoading, error } = useLeaderDashboard();

  if (error) {
    return <p className="text-sm text-destructive">Failed to load dashboard data.</p>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const followUpCount = data.membersNeedingFollowup ?? 0;
  const pendingCount = data.pendingJoinRequests ?? 0;
  const recentAttendance = data.recentAttendance ?? [];

  return (
    <div className="space-y-6">
      <DarkHeader
        title="Group Overview"
        subtitle={`${data.groupMemberCount ?? 0} members in your group`}
        className="lg:hidden"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard icon={<Users size={20} />} label="Group Members" value={data.groupMemberCount ?? 0} />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Needing Follow-up"
          value={followUpCount}
          className={followUpCount > 0 ? 'border-amber-200 bg-amber-50/50' : ''}
        />
        <StatCard
          icon={<UserPlus size={20} />}
          label="Pending Requests"
          value={pendingCount}
          className={pendingCount > 0 ? 'border-primary/20 bg-primary/5' : ''}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Recent Attendance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <EmptyState title="No attendance data" description="No recent attendance records found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                      <th className="py-2 text-right text-xs font-medium uppercase text-muted-foreground">Present</th>
                      <th className="py-2 text-right text-xs font-medium uppercase text-muted-foreground">Total</th>
                      <th className="py-2 text-right text-xs font-medium uppercase text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.map((a, i) => {
                      const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 text-foreground">{formatDate(a.date)}</td>
                          <td className="py-2 text-right text-foreground">{a.present}</td>
                          <td className="py-2 text-right text-muted-foreground">{a.total}</td>
                          <td className="py-2 text-right font-medium">
                            <span className={pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members Needing Follow-up */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <CardTitle className="text-sm font-medium">Members Needing Follow-up</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {followUpCount === 0 ? (
              <EmptyState title="All caught up" description="All members are up to date." />
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-amber-600">{followUpCount}</p>
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
