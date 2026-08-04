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
import { formatShortDate } from '@kairos/core';
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
              on the left). Green / blue / amber cells = attended (in-person,
              virtual, late); dashed red = absent. Sort by streak to prioritise
              pastoral care; by attendance to spot regulars vs fringe.
            </CardDescription>
          </div>
          <div className="w-44">
            <CustomSelect
              value={sortKey}
              onValueChange={(v) => setSortKey(v as SortKey)}
              options={[
                { value: 'streak', label: 'Sort: streak' },
                { value: 'attendance', label: 'Sort: %' },
                { value: 'name', label: 'Sort: name' },
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
  // Layout strategy: table-fixed with equal-share service columns so the
  // heatmap always fills the card width. As weeks accumulate columns get
  // narrower; on mobile the whole grid horizontally scrolls with a minimum
  // per-column width so cells stay readable.
  const MIN_COL_PX = 44;
  const minTableWidth = 220 /* member */ + services.length * MIN_COL_PX + 60 + 70;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full table-fixed border-separate"
        style={{ borderSpacing: 0, minWidth: `${minTableWidth}px` }}
      >
        <colgroup>
          <col style={{ width: '220px' }} />
          {services.map((s) => (
            <col key={s.id} />
          ))}
          <col style={{ width: '60px' }} />
          <col style={{ width: '70px' }} />
        </colgroup>
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
                className="py-2 text-center text-[11px] font-medium tabular-nums leading-tight text-muted-foreground"
              >
                {formatDayMonth(s.serviceDate)}
              </th>
            ))}
            <th
              scope="col"
              className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              %
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
              {m.cells.map((c, i) => {
                const s = services[i];
                if (!s) return null;
                return (
                  <td
                    key={`${m.memberId}-${s.id}`}
                    title={`${s.serviceType} · ${formatShortDate(s.serviceDate)} · ${cellLabel(c)}`}
                    className="p-0.5 text-center"
                  >
                    <Cell status={c} />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                {Math.round(m.attendancePct * 100)}%
              </td>
              <td
                className={`px-2 py-1.5 text-right text-sm tabular-nums ${
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
        <LegendSwatch status="present" label="Present" />
        <LegendSwatch status="virtual" label="Virtual" />
        <LegendSwatch status="late" label="Late" />
        <LegendSwatch status="absent" label="Absent" />
      </div>
    </div>
  );
}

/**
 * Cell is a small square that fills the available column width up to 24px.
 * Filled variants mean "came" (present/virtual/late); absent renders as a
 * hollow outlined square so the presence/absence axis reads through shape
 * as well as colour — useful for the ~5-8% of viewers with red-green
 * colour vision deficiency who'd otherwise struggle with the palette.
 */
function Cell({ status }: { status: AttendanceHeatmapCellStatus }) {
  if (status === 'absent') {
    return <div className="mx-auto h-5 w-5 max-w-full rounded-sm border border-dashed border-red-300 bg-red-50/60 dark:border-red-400/40 dark:bg-red-500/10" />;
  }
  const fill =
    status === 'present' ? 'bg-emerald-500'
    : status === 'virtual' ? 'bg-sky-500'
    : 'bg-amber-500';
  return <div className={`mx-auto h-5 w-5 max-w-full rounded-sm ${fill}`} />;
}

function LegendSwatch({ status, label }: { status: AttendanceHeatmapCellStatus; label: string }) {
  const swatchClass =
    status === 'absent'
      ? 'border border-dashed border-red-300 bg-red-50/60 dark:border-red-400/40 dark:bg-red-500/10'
      : status === 'present' ? 'bg-emerald-500'
      : status === 'virtual' ? 'bg-sky-500'
      : 'bg-amber-500';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${swatchClass}`} />
      {label}
    </span>
  );
}

// "31 May" — short but unambiguous. Full "Sunday · 31/05/2026" stays on <th title>.
function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
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

