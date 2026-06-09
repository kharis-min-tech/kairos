'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import { useDepartmentAttendance } from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';
import type { DepartmentAttendanceReport } from '@kairos/types';

interface DepartmentAttendanceTabProps {
  branchDepartmentId: string;
}

export function DepartmentAttendanceTab({ branchDepartmentId }: DepartmentAttendanceTabProps) {
  const { data, isLoading, isError, error } = useDepartmentAttendance(branchDepartmentId, { weeks: 12 });

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
        <span className="sr-only">Loading department attendance</span>
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        {error instanceof Error ? error.message : 'Could not load attendance for this department.'}
      </div>
    );
  }
  if (!data) return null;
  return <Body report={data} />;
}

function Body({ report }: { report: DepartmentAttendanceReport }) {
  const ratePct = Math.round(report.rate * 100);
  const tone =
    report.activeMembers === 0
      ? 'text-muted-foreground'
      : report.rate >= 0.8
        ? 'text-emerald-700 dark:text-emerald-400'
        : report.rate >= 0.6
          ? 'text-[#9a6b04] dark:text-[#f8b537]'
          : 'text-destructive';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {report.department.name} · {report.windowWeeks}-week service attendance
          </CardTitle>
          <CardDescription>
            Of {report.activeMembers} active member{report.activeMembers === 1 ? '' : 's'},{' '}
            {report.distinctAttendees} attended at least one of the{' '}
            {report.totalServices} services in the window.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <p className={`text-5xl font-bold ${tone}`}>
              {report.activeMembers === 0 ? '—' : `${ratePct}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">distinct attendees</p>
          </div>
          <TrendSparkline trend={report.trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-member breakdown</CardTitle>
          <CardDescription>Lowest rate first — focus where it matters.</CardDescription>
        </CardHeader>
        <CardContent>
          {report.members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active members in this department.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 text-right font-medium">Attended</th>
                  <th className="pb-2 text-right font-medium">Late</th>
                  <th className="pb-2 text-right font-medium">Rate</th>
                  <th className="pb-2 text-right font-medium">Last attended</th>
                </tr>
              </thead>
              <tbody>
                {report.members.map((m) => {
                  const rowPct = Math.round(m.rate * 100);
                  const rowTone =
                    m.totalServices === 0
                      ? 'text-muted-foreground'
                      : m.rate >= 0.8
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : m.rate >= 0.6
                          ? 'text-[#9a6b04] dark:text-[#f8b537]'
                          : 'text-destructive';
                  return (
                    <tr key={m.memberId} className="border-t border-foreground/[0.06]">
                      <td className="py-2 font-medium text-foreground">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {m.attendedCount}/{m.totalServices}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{m.lateCount}</td>
                      <td className={`py-2 text-right font-semibold ${rowTone}`}>
                        {m.totalServices === 0 ? '—' : `${rowPct}%`}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {m.lastAttendedAt ? formatShortDate(m.lastAttendedAt) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendSparkline({ trend }: { trend: Array<{ weekStart: string; attendees: number }> }) {
  if (trend.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No attended services in this window yet.</p>
    );
  }
  const max = Math.max(...trend.map((t) => t.attendees), 1);
  return (
    <div className="flex h-16 items-end gap-1" aria-label="Weekly attended count">
      {trend.map((t) => {
        const h = Math.max(4, Math.round((t.attendees / max) * 64));
        return (
          <div
            key={t.weekStart}
            className="w-4 rounded-t bg-[#5D3FD3]/70"
            style={{ height: `${h}px` }}
            title={`${formatShortDate(t.weekStart)}: ${t.attendees} attendees`}
          />
        );
      })}
    </div>
  );
}
