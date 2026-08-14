'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Card, CardContent } from '@kairos/ui';
import { useEnrollmentAlerts, useNewBelieversHealth } from '@/hooks/use-new-believers';
import { formatDate, formatShortDate } from '@kairos/core';
import type {
  NewBelieverEnrollmentWithMember,
  NewBelieverHealthSummary,
  NewBelieverStageFunnel,
} from '@kairos/types';

interface Props {
  branchId?: string;
}

const STAGE_LABEL: Record<keyof NewBelieverStageFunnel, string> = {
  enrolled: 'Enrolled',
  'session-1': 'Session 1',
  'session-2': 'Session 2',
  'session-3': 'Session 3',
  'session-4': 'Session 4',
  completed: 'Completed',
  integrated: 'Integrated',
};

const STAGE_SHORT: Record<keyof NewBelieverStageFunnel, string> = {
  enrolled: 'Enr',
  'session-1': 'S1',
  'session-2': 'S2',
  'session-3': 'S3',
  'session-4': 'S4',
  completed: 'Done',
  integrated: 'Int',
};

const STAGE_KEYS = Object.keys(STAGE_LABEL) as Array<keyof NewBelieverStageFunnel>;

const RAG_STALE_THRESHOLD = 5;
const CHART_MUTED = 'hsl(var(--muted-foreground))';
const CHART_GRID = 'hsl(var(--border))';
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 4,
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

function toPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '—';
  return `${Math.round(rate * 100)}%`;
}

function funnelChartData(stageFunnel: NewBelieverStageFunnel) {
  return STAGE_KEYS.map((stage) => ({
    stage,
    label: STAGE_LABEL[stage],
    short: STAGE_SHORT[stage],
    value: stageFunnel[stage] ?? 0,
  }));
}

function trendChartData(
  trend: NewBelieverHealthSummary['attendanceTrend'],
): Array<{ idx: number; date: string; topic: string | null; rate: number; attended: number; eligible: number }> {
  // newest-first from API → reverse to oldest-first for left-to-right chart.
  return [...trend].reverse().map((point, idx) => ({
    idx,
    date: point.sessionDate,
    topic: point.topic,
    rate: Math.round(point.attendanceRate * 100),
    attended: point.attended,
    eligible: point.eligible,
  }));
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function ProgramHealthStrip({ branchId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useNewBelieversHealth(branchId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Programme health loading">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-md border border-border/60 bg-muted"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hasSessions = data.attendanceTrend.length > 0;
  const hasActivity = data.summary.activeEnrollments > 0;

  // Empty: hide entirely when there are no sessions AND no active enrollments.
  if (!hasSessions && !hasActivity) return null;

  const staleIsRed = data.stale.count >= RAG_STALE_THRESHOLD;

  return (
    <section aria-label="Programme health" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Programme health
          </h2>
          <p className="text-xs text-muted-foreground">
            Last {data.attendanceTrend.length || 0} session
            {data.attendanceTrend.length === 1 ? '' : 's'} · {data.summary.activeEnrollments} active
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          aria-pressed={expanded}
          aria-label={expanded ? 'Collapse programme health' : 'Expand programme health'}
        >
          {expanded ? (
            <>
              <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
              Collapse
            </>
          ) : (
            <>
              <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
              Expand
            </>
          )}
        </Button>
      </div>

      {expanded ? (
        <ExpandedView data={data} staleIsRed={staleIsRed} />
      ) : (
        <CompactView data={data} hasSessions={hasSessions} staleIsRed={staleIsRed} />
      )}
    </section>
  );
}

// ── Compact (default) ─────────────────────────────────────

interface ViewProps {
  data: NewBelieverHealthSummary;
  staleIsRed: boolean;
}

interface CompactProps extends ViewProps {
  hasSessions: boolean;
}

function CompactView({ data, hasSessions, staleIsRed }: CompactProps) {
  const trend = trendChartData(data.attendanceTrend);
  const funnel = funnelChartData(data.stageFunnel);

  return (
    <div
      className={
        hasSessions
          ? 'grid grid-cols-1 gap-4 md:grid-cols-3'
          : 'grid grid-cols-1 gap-4 md:grid-cols-2'
      }
    >
      {hasSessions && (
        <TrendTile
          avgAttendanceRate={data.summary.avgAttendanceRate}
          windowSize={data.attendanceTrend.length}
          chartData={trend}
        />
      )}
      <FunnelTile activeEnrollments={data.summary.activeEnrollments} chartData={funnel} />
      <StaleTile count={data.stale.count} thresholdDays={data.stale.thresholdDays} isRed={staleIsRed} />
    </div>
  );
}

interface TrendTileProps {
  avgAttendanceRate: number | null;
  windowSize: number;
  chartData: ReturnType<typeof trendChartData>;
}

function TrendTile({ avgAttendanceRate, windowSize, chartData }: TrendTileProps) {
  return (
    <Card className="border border-border/60 bg-card">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Attendance
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {toPercent(avgAttendanceRate)}
          </span>
          <span className="text-xs text-muted-foreground">avg · last {windowSize}</span>
        </div>
        <div className="mt-3 h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5D3FD3" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#5D3FD3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#5D3FD3"
                strokeWidth={2}
                fill="url(#trendFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface FunnelTileProps {
  activeEnrollments: number;
  chartData: ReturnType<typeof funnelChartData>;
}

function FunnelTile({ activeEnrollments, chartData }: FunnelTileProps) {
  return (
    <Card className="border border-border/60 bg-card">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Stage funnel
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {activeEnrollments}
          </span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
        <div className="mt-3 h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="short"
                tick={{ fontSize: 9, fill: CHART_MUTED }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={entry.stage === 'integrated' ? '#f8b537' : '#5D3FD3'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface StaleTileProps {
  count: number;
  thresholdDays: number;
  isRed: boolean;
}

function StaleTile({ count, thresholdDays, isRed }: StaleTileProps) {
  const surface = isRed ? 'bg-rose-500/15' : 'bg-[#f8b537]/15';
  const accent = isRed ? 'text-rose-600 dark:text-rose-400' : 'text-[#9a6b04] dark:text-[#f8b537]';
  return (
    <Card
      data-stale-rag={isRed ? 'red' : 'amber'}
      className={`border border-border/60 ${surface}`}
    >
      <CardContent className="p-4">
        <Link
          href="/new-believers?filter=stale"
          className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f8b537]"
          aria-label={`${count} stale enrollments — view list`}
        >
          <p className={`text-xs font-medium uppercase tracking-wide ${accent}`}>Stale</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-semibold tracking-tight ${accent}`}>{count}</span>
            <span className="text-xs text-muted-foreground">
              {thresholdDays}+ days no progress
            </span>
          </div>
          <p className="mt-3 inline-flex items-center text-xs font-medium text-primary group-hover:underline">
            View stale list
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Expanded (full insights) ──────────────────────────────

function ExpandedView({ data, staleIsRed }: ViewProps) {
  const trend = trendChartData(data.attendanceTrend);
  const funnel = funnelChartData(data.stageFunnel);
  const alerts = useEnrollmentAlerts();
  const topStale = useMemo(() => {
    const rows = (alerts.data?.data ?? []) as NewBelieverEnrollmentWithMember[];
    return [...rows]
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .slice(0, 5);
  }, [alerts.data?.data]);

  return (
    <Card className="border border-border/60 bg-card">
      <CardContent className="grid gap-6 p-4 lg:grid-cols-[1fr_1fr_minmax(220px,280px)]">
        {/* Attendance trend */}
        <section aria-label="Attendance trend" className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attendance trend
            </h3>
            <span className="text-sm font-medium text-foreground">
              {toPercent(data.summary.avgAttendanceRate)} avg
            </span>
          </div>
          {data.attendanceTrend.length === 0 ? (
            <p className="rounded border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
              No sessions yet.
            </p>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeOpacity={0.55} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: CHART_MUTED }}
                    tickFormatter={(value) =>
                      formatDate(value, { month: 'short', day: 'numeric' })
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: CHART_MUTED }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [`${value}%`, 'Attendance']}
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as
                        | { date: string; topic: string | null; attended: number; eligible: number }
                        | undefined;
                      const date = point ? formatShortDate(point.date) : String(label);
                      return point?.topic ? `${date} · ${point.topic}` : date;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#5D3FD3"
                    strokeWidth={2.5}
                    dot={{ fill: '#5D3FD3', r: 3 }}
                    activeDot={{ r: 5, fill: '#f8b537', stroke: '#5D3FD3' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Full funnel */}
        <section aria-label="Stage funnel" className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stage funnel
            </h3>
            <span className="text-sm font-medium text-foreground">
              {data.summary.activeEnrollments} active
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeOpacity={0.55} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: CHART_MUTED }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: CHART_MUTED }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value) => [value, 'Active']}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {funnel.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={entry.stage === 'integrated' ? '#f8b537' : '#5D3FD3'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Stale list */}
        <section
          aria-label="Stale enrollments preview"
          data-stale-rag={staleIsRed ? 'red' : 'amber'}
          className="space-y-2"
        >
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stale
            </h3>
            <span
              className={`text-sm font-medium ${
                staleIsRed ? 'text-rose-600 dark:text-rose-400' : 'text-[#9a6b04] dark:text-[#f8b537]'
              }`}
            >
              {data.stale.count} {data.stale.count === 1 ? 'person' : 'people'}
            </span>
          </div>
          {alerts.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : topStale.length === 0 ? (
            <p className="rounded border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              Nobody is stale right now.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {topStale.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/new-believers/${row.id}`}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
                  >
                    <span className="truncate font-medium text-foreground">
                      {row.memberFirstName} {row.memberLastName}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {daysSince(row.updatedAt)}d
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/new-believers?filter=stale"
            className="inline-flex items-center text-xs font-medium text-primary hover:underline"
          >
            View all stale enrollments
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Link>
        </section>
      </CardContent>
    </Card>
  );
}
