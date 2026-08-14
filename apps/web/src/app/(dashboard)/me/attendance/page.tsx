'use client';

import Link from 'next/link';
import { Calendar, Flame, Sparkles, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@kairos/ui';
import { useMyAttendance } from '@/hooks/use-attendance';
import { formatShortDate } from '@kairos/core';
import type { MyAttendanceSnapshot } from '@kairos/types';

function getTone(rate: number, missedCount: number, servicesInWindow: number) {
  if (servicesInWindow === 0) return { kind: 'neutral' as const, label: 'Window just started', tone: 'text-muted-foreground' };
  if (rate >= 0.8) {
    return {
      kind: 'positive' as const,
      label: 'Great consistency — keep it up!',
      tone: 'text-emerald-700 dark:text-emerald-400',
    };
  }
  if (rate >= 0.6) {
    return {
      kind: 'neutral' as const,
      label: 'A few more services and you’re solidly in the green.',
      tone: 'text-[#9a6b04] dark:text-[#f8b537]',
    };
  }
  return {
    kind: 'warning' as const,
    label: `${missedCount} missed in this window — let’s rebuild the habit.`,
    tone: 'text-destructive',
  };
}

export default function MyAttendancePage() {
  const { data, isLoading, isError, error } = useMyAttendance({ weeks: 12 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">My Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Your service-attendance picture over the last 12 weeks. Only you, your pastor,
          and the church admin team can see this.
        </p>
      </header>

      {isLoading ? (
        <div aria-busy="true" aria-live="polite" className="space-y-3">
          <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
          </div>
          <span className="sr-only">Loading your attendance snapshot</span>
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : 'Could not load your attendance.'}
        </div>
      ) : data ? (
        <SnapshotBody snapshot={data} />
      ) : null}
    </div>
  );
}

function SnapshotBody({ snapshot }: { snapshot: MyAttendanceSnapshot }) {
  const tone = getTone(snapshot.rate, snapshot.missedCount, snapshot.servicesInWindow);
  const ratePct = Math.round(snapshot.rate * 100);

  return (
    <>
      {/* Hero rate */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Attendance rate ({snapshot.windowWeeks} weeks)
            </p>
            <p className={`mt-1 text-5xl font-bold ${tone.tone}`}>{ratePct}%</p>
            <p className={`mt-1 text-sm font-medium ${tone.tone}`}>{tone.label}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{snapshot.attendedCount}</span>{' '}
              attended of{' '}
              <span className="font-semibold text-foreground">{snapshot.servicesInWindow}</span>{' '}
              services
            </p>
            {snapshot.lastService && (
              <p className="mt-1">
                Last seen at{' '}
                <Link
                  href={`/attendance/${snapshot.lastService.id}`}
                  className="font-medium text-[#5D3FD3] hover:underline"
                >
                  {snapshot.lastService.serviceTitle || `${snapshot.lastService.serviceType} Service`}
                </Link>{' '}
                on {formatShortDate(snapshot.lastService.serviceDate)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Punctuality + streak */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Punctuality breakdown
            </CardTitle>
            <CardDescription>How your {snapshot.servicesInWindow} services split.</CardDescription>
          </CardHeader>
          <CardContent>
            <PunctualityBars snapshot={snapshot} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {snapshot.currentStreak.kind === 'attended' ? (
                <Flame className="h-4 w-4 text-[#f8b537]" aria-hidden />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
              )}{' '}
              Current streak
            </CardTitle>
            <CardDescription>
              {snapshot.currentStreak.kind === 'attended'
                ? 'Consecutive services attended.'
                : 'Consecutive services missed.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-5xl font-bold ${
                snapshot.currentStreak.kind === 'attended'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-destructive'
              }`}
            >
              {snapshot.currentStreak.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot.currentStreak.kind === 'attended' ? 'in a row, attended' : 'in a row, missed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-service history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Service history
          </CardTitle>
          <CardDescription>Every service in the window, oldest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No services in this window yet.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card" aria-label="My service history">
              {snapshot.history.map((h) => (
                <li key={h.serviceId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-foreground">{h.serviceType}</span>{' '}
                    <span className="text-muted-foreground">{formatShortDate(h.serviceDate)}</span>
                  </span>
                  <StatusPill status={h.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function PunctualityBars({ snapshot }: { snapshot: MyAttendanceSnapshot }) {
  const total = snapshot.servicesInWindow || 1;
  const buckets = [
    { label: 'Present', count: snapshot.presentOnTimeCount, tone: 'bg-emerald-500' },
    { label: 'Late', count: snapshot.lateCount, tone: 'bg-[#f8b537]' },
    { label: 'Virtual', count: snapshot.virtualCount, tone: 'bg-[#5D3FD3]' },
    { label: 'Missed', count: snapshot.missedCount, tone: 'bg-rose-500' },
  ];
  return (
    <ul className="space-y-2">
      {buckets.map((b) => {
        const pct = Math.round((b.count / total) * 100);
        return (
          <li key={b.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{b.label}</span>
              <span className="text-muted-foreground">
                {b.count} · {pct}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className={`h-full ${b.tone}`}
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const tone =
    status === 'Present'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : status === 'Late'
        ? 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]'
        : status === 'Virtual'
          ? 'bg-[#5D3FD3]/15 text-[#5D3FD3]'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status ?? 'Missed'}
    </span>
  );
}
