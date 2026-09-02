'use client';

export const runtime = 'edge';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, Badge, Button, cn } from '@kairos/ui';
import { GraduationCap, CalendarDays, Users, Plus, CheckCircle2 } from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMembershipCohorts, useMyMembership, useEnrolSelf } from '@/hooks/use-membership';
import { toast } from 'sonner';
import type { MembershipCohortStatus, MembershipCohortSummary } from '@kairos/types';

/**
 * Membership classes (migration 0047).
 *
 * Cohorts are church-wide rather than branch-scoped, so this page has no
 * branch filter and every approved member can see it. Two audiences share it:
 *
 *   - Any member: their own progress, and a way to self-enrol in an open
 *     cohort. People sign up whenever they want; no admin step, and no link to
 *     the new believers pipeline.
 *   - Platform admins: the full list, plus cohort creation.
 */
export default function MembershipPage() {
  const caps = useCapabilities();
  const isAdmin = caps.systemRole === 'admin';

  const [statusFilter, setStatusFilter] = useState<MembershipCohortStatus | 'all'>('all');

  const { data, isLoading } = useMembershipCohorts(
    statusFilter === 'all' ? undefined : { status: statusFilter },
  );
  const { data: mine } = useMyMembership();

  const cohorts = data?.cohorts ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <GraduationCap className="size-5 text-[#5D3FD3]" />
            Membership classes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Four sessions, coursework, a final test and the induction ceremony. Completing
            all of it is what makes someone a confirmed Member.
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/membership/new"
            className="inline-flex h-9 items-center rounded-md bg-[#5D3FD3] px-4 text-sm font-medium text-white transition hover:bg-[#451ebb]"
          >
            <Plus className="mr-1 size-4" />
            New cohort
          </Link>
        ) : null}
      </header>

      <MyProgressCard mine={mine} />

      <div className="flex flex-wrap gap-2">
        {(['all', 'planned', 'active', 'completed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium capitalize transition',
              statusFilter === s
                ? 'border-[#5D3FD3] bg-[#5D3FD3] text-white'
                : 'border-border text-muted-foreground hover:bg-muted/60',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading cohorts…</p>
      ) : cohorts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No cohorts yet.
            {isAdmin ? ' Create one to start enrolling members.' : ' Check back soon.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cohorts.map((c) => (
            <CohortCard key={c.id} cohort={c} canEnrol={!mine?.enrollment && !mine?.confirmedAt} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyProgressCard({ mine }: { mine: ReturnType<typeof useMyMembership>['data'] }) {
  if (!mine) return null;

  if (mine.confirmedAt) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-foreground">
              You are a confirmed Member
            </p>
            <p className="text-xs text-muted-foreground">
              Membership class completed on {formatShortDate(mine.confirmedAt)}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!mine.enrollment) return null;

  const readiness = mine.readiness;
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            Your progress in {mine.enrollment.cohortName}
          </p>
          <Badge variant={readiness?.eligible ? 'default' : 'secondary'}>
            {readiness?.eligible ? 'Ready to graduate' : 'In progress'}
          </Badge>
        </div>
        {readiness && readiness.outstanding.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {readiness.outstanding.map((o) => (
              <li key={o}>• {o}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CohortCard({
  cohort,
  canEnrol,
}: {
  cohort: MembershipCohortSummary;
  canEnrol: boolean;
}) {
  const enrolSelf = useEnrolSelf();

  const statusTone: Record<MembershipCohortStatus, string> = {
    planned: 'bg-amber-500/10 text-amber-700 dark:text-[#f8b537]',
    active: 'bg-[#5D3FD3]/10 text-[#5D3FD3]',
    completed: 'bg-emerald-500/10 text-emerald-700',
    cancelled: 'bg-muted text-muted-foreground',
  };

  const showEnrol = canEnrol && cohort.enrolmentOpen && cohort.status !== 'completed';

  return (
    <Card className="transition hover:border-[#5D3FD3]/40">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/membership/${cohort.id}`}
            className="text-sm font-semibold text-foreground hover:text-[#5D3FD3]"
          >
            {cohort.name}
          </Link>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
              statusTone[cohort.status],
            )}
          >
            {cohort.status}
          </span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Starts {formatShortDate(cohort.startDate)}
            {cohort.graduationDate ? ` · induction ${formatShortDate(cohort.graduationDate)}` : ''}
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {cohort.enrolledCount} enrolled · {cohort.graduatedCount} graduated
          </p>
          <p className="flex items-center gap-1.5">
            <GraduationCap className="size-3.5" />
            {cohort.sessionCount} of 4 sessions scheduled
          </p>
        </div>

        {showEnrol ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={enrolSelf.isPending}
            onClick={() =>
              enrolSelf.mutate(cohort.id, {
                onSuccess: () => toast.success(`Enrolled in ${cohort.name}.`),
                onError: (e: unknown) =>
                  toast.error(e instanceof Error ? e.message : 'Could not enrol.'),
              })
            }
          >
            {enrolSelf.isPending ? 'Enrolling…' : 'Enrol me'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
