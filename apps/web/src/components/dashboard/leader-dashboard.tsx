'use client';

import { useEffect, useState } from 'react';
import { Users, AlertTriangle, UserPlus, Calendar } from 'lucide-react';
import { StatCard, Card, CardHeader, CardBody, Skeleton } from '@/components/ui';
import { dashboard } from '@kairos/api-client';
import type { LeaderDashboard as LeaderDashboardData } from '@kairos/api-client';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface JoinRequest { requestId: number; memberName: string; requestDate: string; }
interface RecentAttendance { date: string; present: number; total: number; }

export function LeaderDashboard() {
  const [data, setData] = useState<LeaderDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboard.getLeader().then(setData).catch(() => setError('Failed to load dashboard'));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const followUpCount = typeof data.membersNeedingFollowup === 'number' ? data.membersNeedingFollowup : 0;
  const joinRequests: JoinRequest[] = [];
  const pendingCount = data.pendingJoinRequests ?? 0;
  const recentAttendance: RecentAttendance[] = data.recentAttendance ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Users size={20} />} label="Group Members" value={data.groupMemberCount ?? 0} />
        <StatCard icon={<AlertTriangle size={20} />} label="Needing Follow-up" value={followUpCount} />
        <StatCard icon={<UserPlus size={20} />} label="Pending Requests" value={pendingCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-700">Recent Attendance</h2>
            </div>
          </CardHeader>
          <CardBody>
            {recentAttendance.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent attendance data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Present</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.map((a, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-900">{formatDate(a.date)}</td>
                        <td className="py-2 text-right text-gray-700">{a.present}</td>
                        <td className="py-2 text-right text-gray-500">{a.total}</td>
                        <td className="py-2 text-right font-medium">{a.total > 0 ? Math.round((a.present / a.total) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Members Needing Follow-up */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-medium text-gray-700">Members Needing Follow-up</h2>
            </div>
          </CardHeader>
          <CardBody>
            {followUpCount === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">All members are up to date.</p>
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600">{followUpCount}</p>
                  <p className="text-sm text-gray-500 mt-1">members need follow-up</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Pending Join Requests */}
      {joinRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-primary" />
              <h2 className="text-sm font-medium text-gray-700">Pending Join Requests ({joinRequests.length})</h2>
            </div>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-gray-100" role="list" aria-label="Pending join requests">
              {joinRequests.map((r) => (
                <li key={r.requestId} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-900">{r.memberName}</span>
                  <span className="text-xs text-gray-500">{formatDate(r.requestDate)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
