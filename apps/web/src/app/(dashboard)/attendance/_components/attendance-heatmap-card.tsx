'use client';

import { useMemo, useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CustomSelect,
} from '@kairos/ui';
import { useAttendanceHeatmap } from '@/hooks/use-attendance';
import { formatShortDate } from '@/lib/date-format';
import type { AttendanceHeatmapMember, AttendanceHeatmapCellStatus } from '@kairos/types';

type SortKey = 'streak' | 'attendance' | 'name';

interface Props {
  branchId?: string;
  departmentId?: string;
  fellowshipId?: string;
  engagedWindowMonths: number;
}

/**
 * Headline visual for /attendance/reports. Rows = members, columns = last 13
 * services. Renders inert with a "pick a branch" hint until the outer branch
 * filter is set — the heatmap is single-branch by design (columns encode a
 * timeline that only makes sense within one branch's schedule).
 */
export function AttendanceHeatmapCard({
  branchId,
  departmentId,
  fellowshipId,
  engagedWindowMonths,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('streak');

  const query = useAttendanceHeatmap(
    branchId
      ? {
          branchId,
          weeks: 13,
          departmentId,
          fellowshipId,
          engagedWindowMonths,
          engagedOnly: true,
        }
      : undefined,
    { enabled: !!branchId },
  );

  const sorted = useMemo(() => {
    const members = query.data?.members ?? [];
    const copy = [...members];
    copy.sort((a, b) => {
      if (sortKey === 'streak') {
        if (a.missedStreak !== b.missedStreak) return b.missedStreak - a.missedStreak;
        return a.lastName.localeCompare(b.lastName);
      }
      if (sortKey === 'attendance') {
        if (a.attendancePct !== b.attendancePct) return b.attendancePct - a.attendancePct;
        return a.lastName.localeCompare(b.lastName);
      }
      return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    });
    return copy;
  }, [query.data?.members, sortKey]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Grid3x3 className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Attendance heatmap
            </CardTitle>
            <CardDescription>
              Row per engaged member × column per service (last 13 weeks, oldest
              on the left). Green cells = attended, empty = missed. Sort by
              streak to prioritise pastoral care; by attendance to spot regulars
              vs fringe.
            </CardDescription>
          </div>
          <div className="w-44">
            <CustomSelect
              value={sortKey}
              onValueChange={(v) => setSortKey(v as SortKey)}
              options={[
                { value: 'streak', label: 'Sort: absence streak' },
                { value: 'attendance', label: 'Sort: attendance %' },
                { value: 'name', label: 'Sort: last name' },
              ]}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!branchId ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Pick a specific branch in the filter above to load the heatmap. The
            timeline only reads coherently within one branch.
          </div>
        ) : query.isLoading ? (
          <div className="h-72 animate-pulse rounded-lg bg-foreground/5" />
        ) : query.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {query.error instanceof Error ? query.error.message : 'Could not load the heatmap.'}
          </p>
        ) : (query.data?.members.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No engaged members in scope for this window.
          </p>
        ) : (
          <HeatmapTable services={query.data!.services} members={sorted} />
        )}
      </CardContent>
    </Card>
  );
}

function HeatmapTable({
  services,
  members,
}: {
  services: { id: string; serviceDate: string; serviceType: string; serviceTitle: string | null }[];
  members: AttendanceHeatmapMember[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Member
            </th>
            {services.map((s) => (
              <th
                key={s.id}
                scope="col"
                title={`${s.serviceType} · ${formatShortDate(s.serviceDate)}${s.serviceTitle ? ` · ${s.serviceTitle}` : ''}`}
                className="px-1 py-2 text-center text-[10px] font-medium text-muted-foreground"
              >
                {formatShortDate(s.serviceDate)}
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              %
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"
              title="Consecutive most-recent absences"
            >
              Streak
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.memberId} className="hover:bg-foreground/[0.03]">
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-[220px] truncate bg-card px-3 py-1.5 text-left text-sm font-medium text-foreground"
              >
                {m.firstName} {m.lastName}
              </th>
              {m.cells.map((c, i) => (
                <td
                  key={`${m.memberId}-${services[i].id}`}
                  title={`${services[i].serviceType} · ${formatShortDate(services[i].serviceDate)} · ${cellLabel(c)}`}
                  className="p-0.5"
                >
                  <div className={`h-5 w-5 rounded-sm ${cellClass(c)}`} />
                </td>
              ))}
              <td className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                {Math.round(m.attendancePct * 100)}%
              </td>
              <td
                className={`px-3 py-1.5 text-right text-sm tabular-nums ${
                  m.missedStreak >= 3 ? 'font-semibold text-destructive' : 'text-muted-foreground'
                }`}
              >
                {m.missedStreak}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <Legend cls="bg-[#5D3FD3]" label="Present" />
        <Legend cls="bg-[#f8b537]" label="Late" />
        <Legend cls="bg-sky-500" label="Virtual" />
        <Legend cls="bg-foreground/10" label="Absent" />
      </div>
    </div>
  );
}

function cellClass(c: AttendanceHeatmapCellStatus): string {
  switch (c) {
    case 'present':
      return 'bg-[#5D3FD3]';
    case 'late':
      return 'bg-[#f8b537]';
    case 'virtual':
      return 'bg-sky-500';
    default:
      return 'bg-foreground/10';
  }
}

function cellLabel(c: AttendanceHeatmapCellStatus): string {
  switch (c) {
    case 'present':
      return 'Present';
    case 'late':
      return 'Late';
    case 'virtual':
      return 'Virtual';
    default:
      return 'Absent';
  }
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${cls}`} /> {label}
    </span>
  );
}
