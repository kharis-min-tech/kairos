'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useCapabilities } from '@/hooks/use-capabilities';
import { useBranches } from '@/hooks/use-branches';
import { useDepartments } from '@/hooks/use-departments';
import { useFellowships } from '@/hooks/use-fellowships';
import {
  useAttendanceTrends,
  useMissingMembers,
  useAttendanceByBranch,
} from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';
import { CohortCompareCard } from '../_components/cohort-compare-card';

const REPORT_READER_ROLES = ['admin', 'pastor', 'leader'];

export default function AttendanceReportsPage() {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const caps = useCapabilities();
  const isAdminOrPastor = caps.has('branch:write');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [fellowshipId, setFellowshipId] = useState('');

  // Second-level guard: only admin/pastor/leader may view attendance reports.
  // Members would otherwise hit a wall of 403s on each chart query.
  useEffect(() => {
    if (activeRole && !REPORT_READER_ROLES.includes(activeRole)) {
      router.replace('/attendance');
    }
  }, [activeRole, router]);

  const { data: branches } = useBranches();
  const branchParam = branchId || undefined;
  const departmentParam = departmentId || undefined;
  const fellowshipParam = fellowshipId || undefined;

  // Department + fellowship dropdowns sourced for the chosen branch (admin/pastor only).
  const { data: deptList } = useDepartments(branchParam ? { branchId: branchParam } : undefined);
  const { data: fellowList } = useFellowships(branchParam ? { branchId: branchParam } : undefined);

  const trends = useAttendanceTrends({ branchId: branchParam, weeks: 12, departmentId: departmentParam, fellowshipId: fellowshipParam });
  const missing = useMissingMembers({ branchId: branchParam, departmentId: departmentParam, fellowshipId: fellowshipParam });
  const byBranch = useAttendanceByBranch({ weeks: 4 });

  const branchOptions = [
    { value: '', label: 'All branches' },
    ...(branches ?? []).map((b) => ({ value: b.id, label: b.branchName })),
  ];

  // Dept + fellowship dropdown options. Both lists are paginated payloads ({data: [...]}).
  const deptOptions = [
    { value: '', label: 'All departments' },
    ...((deptList?.data ?? []).map((d) => ({
      value: d.id,
      label: d.departmentName,
    }))),
  ];
  const fellowshipOptions = [
    { value: '', label: 'All fellowships' },
    ...((fellowList?.data ?? []).map((f) => ({
      value: f.id,
      label: f.fellowshipName,
    }))),
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
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
          {isAdminOrPastor && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <CustomSelect value={branchId} onValueChange={setBranchId} options={branchOptions} />
              </div>
              <div className="w-44">
                <CustomSelect value={departmentId} onValueChange={setDepartmentId} options={deptOptions} />
              </div>
              <div className="w-44">
                <CustomSelect value={fellowshipId} onValueChange={setFellowshipId} options={fellowshipOptions} />
              </div>
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
            <p role="alert" className="text-sm font-medium text-destructive">
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
              <p role="alert" className="text-sm font-medium text-destructive">
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
              <p role="alert" className="text-sm font-medium text-destructive">
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

      {/* Cohort comparison — who came to A but missed B */}
      <CohortCompareCard branchId={branchParam} />
    </div>
  );
}
