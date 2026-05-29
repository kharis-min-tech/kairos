'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, UserX } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useBranches } from '@/hooks/use-branches';
import {
  useAttendanceTrends,
  useMissingMembers,
  useAttendanceByBranch,
} from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';

export default function AttendanceReportsPage() {
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const [branchId, setBranchId] = useState('');

  const { data: branches } = useBranches();
  const branchParam = branchId || undefined;

  const trends = useAttendanceTrends({ branchId: branchParam, weeks: 12 });
  const missing = useMissingMembers({ branchId: branchParam });
  const byBranch = useAttendanceByBranch({ weeks: 4 });

  const branchOptions = [
    { value: '', label: 'All branches' },
    ...(branches ?? []).map((b) => ({ value: b.id, label: b.branchName })),
  ];

  const chartData = (trends.data ?? []).map((p) => ({
    week: formatShortDate(p.weekStart),
    attendees: p.attendees,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to services
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
          {isAdminOrPastor && (
            <div className="w-56">
              <CustomSelect value={branchId} onValueChange={setBranchId} options={branchOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly attendance</CardTitle>
          <CardDescription>Total attendees per week (last 12 weeks)</CardDescription>
        </CardHeader>
        <CardContent>
          {trends.isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-foreground/5" />
          ) : trends.isError ? (
            <p className="text-sm text-[#dc2626]">
              {trends.error instanceof Error ? trends.error.message : 'Could not load trends.'}
            </p>
          ) : chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No attendance recorded yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip formatter={(v) => [v, 'Attendees']} />
                  <Line
                    type="monotone"
                    dataKey="attendees"
                    stroke="#5D3FD3"
                    strokeWidth={2}
                    dot={{ fill: '#5D3FD3', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Missing members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members not seen recently</CardTitle>
            <CardDescription>Active members with no recent attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {missing.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-foreground/5" />
                ))}
              </div>
            ) : missing.isError ? (
              <p className="text-sm text-[#dc2626]">
                {missing.error instanceof Error ? missing.error.message : 'Could not load this report.'}
              </p>
            ) : !missing.data || missing.data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <UserX className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Everyone has been seen recently.</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {missing.data.map((m) => (
                  <li
                    key={m.memberId}
                    className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-foreground/[0.03]"
                  >
                    <span className="font-medium text-foreground">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      missed {m.servicesConsidered} service{m.servicesConsidered === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* By branch */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance by branch</CardTitle>
            <CardDescription>Distinct attendees vs active members (last 4 weeks)</CardDescription>
          </CardHeader>
          <CardContent>
            {byBranch.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-foreground/5" />
                ))}
              </div>
            ) : byBranch.isError ? (
              <p className="text-sm text-[#dc2626]">
                {byBranch.error instanceof Error ? byBranch.error.message : 'Could not load this report.'}
              </p>
            ) : !byBranch.data || byBranch.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No branch data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Branch</th>
                    <th className="pb-2 text-right font-medium">Attendees</th>
                    <th className="pb-2 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byBranch.data.map((b) => (
                    <tr key={b.branchId} className="border-t border-foreground/[0.06]">
                      <td className="py-2 font-medium text-foreground">{b.branchName}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {b.distinctAttendees}/{b.activeMembers}
                      </td>
                      <td className="py-2 text-right font-semibold text-[#5D3FD3]">
                        {Math.round(b.attendanceRate * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
