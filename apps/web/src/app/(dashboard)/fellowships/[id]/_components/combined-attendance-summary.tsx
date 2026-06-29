'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import { useFellowshipAttendance } from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';
import type { FellowshipAttendanceReport } from '@kairos/types';

interface CombinedAttendanceSummaryProps {
  fellowshipId: string;
}

/**
 * Phase 4b — fellowship-leader view that combines church-service attendance
 * AND fellowship-meeting attendance for the fellowship's members in one panel.
 */
export function CombinedAttendanceSummary({ fellowshipId }: CombinedAttendanceSummaryProps) {
  const { data, isLoading, isError, error } = useFellowshipAttendance(fellowshipId, { weeks: 12 });

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
        <span className="sr-only">Loading combined attendance</span>
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        {error instanceof Error ? error.message : 'Could not load combined attendance.'}
      </div>
    );
  }
  if (!data) return null;
  return <Body report={data} />;
}

function RateCard({
  title,
  description,
  rate,
  distinctAttendees,
  total,
  activeMembers,
  totalLabel,
}: {
  title: string;
  description: string;
  rate: number;
  distinctAttendees: number;
  total: number;
  activeMembers: number;
  totalLabel: string;
}) {
  const pct = Math.round(rate * 100);
  const tone =
    activeMembers === 0 || total === 0
      ? 'text-muted-foreground'
      : rate >= 0.8
        ? 'text-emerald-700 dark:text-emerald-400'
        : rate >= 0.6
          ? 'text-[#9a6b04] dark:text-[#f8b537]'
          : 'text-destructive';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-baseline justify-between gap-3">
        <p className={`text-5xl font-bold ${tone}`}>
          {activeMembers === 0 || total === 0 ? '—' : `${pct}%`}
        </p>
        <div className="text-right text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">{distinctAttendees}</span> of{' '}
            <span className="font-semibold text-foreground">{activeMembers}</span> members
          </p>
          <p className="mt-0.5">{totalLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Body({ report }: { report: FellowshipAttendanceReport }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <RateCard
          title="Service attendance"
          description="Sunday / midweek / special church services attended by anyone in this fellowship."
          rate={report.services.rate}
          distinctAttendees={report.services.distinctAttendees}
          total={report.services.totalServices}
          activeMembers={report.activeMembers}
          totalLabel={`${report.services.totalServices} services in window`}
        />
        <RateCard
          title="Meeting attendance"
          description="Attendance at this fellowship’s own meetings."
          rate={report.meetings.rate}
          distinctAttendees={report.meetings.distinctAttendees}
          total={report.meetings.totalMeetings}
          activeMembers={report.activeMembers}
          totalLabel={`${report.meetings.totalMeetings} meetings in window${
            report.meetings.lastMeeting
              ? ` · last on ${formatShortDate(report.meetings.lastMeeting.date)} (${report.meetings.lastMeeting.attended}/${report.meetings.lastMeeting.total})`
              : ''
          }`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-member combined breakdown</CardTitle>
          <CardDescription>Lowest service-rate first.</CardDescription>
        </CardHeader>
        <CardContent>
          {report.members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active members in this fellowship.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 text-right font-medium">Services</th>
                  <th className="pb-2 text-right font-medium">Service rate</th>
                  <th className="pb-2 text-right font-medium">Meetings</th>
                  <th className="pb-2 text-right font-medium">Meeting rate</th>
                </tr>
              </thead>
              <tbody>
                {report.members.map((m) => {
                  const sPct = Math.round(m.serviceRate * 100);
                  const mPct = Math.round(m.meetingRate * 100);
                  const sTone =
                    report.services.totalServices === 0
                      ? 'text-muted-foreground'
                      : m.serviceRate >= 0.8
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : m.serviceRate >= 0.6
                          ? 'text-[#9a6b04] dark:text-[#f8b537]'
                          : 'text-destructive';
                  const mTone =
                    report.meetings.totalMeetings === 0
                      ? 'text-muted-foreground'
                      : m.meetingRate >= 0.8
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : m.meetingRate >= 0.6
                          ? 'text-[#9a6b04] dark:text-[#f8b537]'
                          : 'text-destructive';
                  return (
                    <tr key={m.memberId} className="border-t border-foreground/[0.06]">
                      <td className="py-2 font-medium text-foreground">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {m.serviceAttendedCount}/{report.services.totalServices}
                      </td>
                      <td className={`py-2 text-right font-semibold ${sTone}`}>
                        {report.services.totalServices === 0 ? '—' : `${sPct}%`}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {m.meetingAttendedCount}/{report.meetings.totalMeetings}
                      </td>
                      <td className={`py-2 text-right font-semibold ${mTone}`}>
                        {report.meetings.totalMeetings === 0 ? '—' : `${mPct}%`}
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
