'use client';

export const runtime = 'edge';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, Badge, Button, cn } from '@kairos/ui';
import {
  GraduationCap,
  CalendarDays,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  ListChecks,
} from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { useCapabilities } from '@/hooks/use-capabilities';
import {
  useMembershipCohorts,
  useMyMembership,
  useExpressInterest,
  useWithdrawInterest,
  useMembershipBranchView,
} from '@/hooks/use-membership';
import { toast } from 'sonner';
import { CHURCH_SCOPE } from '@kairos/types';
import type {
  MembershipCohortStatus,
  MembershipCohortSummary,
  MembershipBranchViewResponse,
} from '@kairos/types';
import { useTranslation } from 'react-i18next';

/**
 * Membership classes.
 *
 * Cohorts are church-wide rather than branch-scoped, so this page has no
 * branch filter and every approved member can see it. Two audiences share it:
 *
 *   - Any member: their own progress, and a way to join the interest pool.
 *     Enrolment is NOT self-service — expressing interest is as far as a
 *     member can take themselves. An admin admits from the pool into a cohort.
 *   - Membership admins: the full list, the pool, and cohort creation. Gated
 *     on `membership:admin` at church scope, NOT on `systemRole === 'admin'`:
 *     the church has people who run this class and hold no platform authority.
 */
export default function MembershipPage() {  const { t } = useTranslation(['membership', 'common']);

  const caps = useCapabilities();
  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  // A Champion holds `membership:branch:read` on at least one branch. We
  // don't need to name which branch here — the branch-view endpoint returns
  // the union of everything they cover, and admins see everything.
  const isChampion = caps.has('membership:branch:read');
  // A fellowship or department leader gets the same panel narrowed to their
  // own people — the endpoint does the narrowing, so the only question here
  // is whether to ask for it at all.
  const isGroupLeader = caps.has('fellowship:read') || caps.has('department:read');

  const [statusFilter, setStatusFilter] = useState<MembershipCohortStatus | 'all'>('all');

  const { data, isLoading } = useMembershipCohorts(
    statusFilter === 'all' ? undefined : { status: statusFilter },
    isAdmin,
  );
  const { data: mine } = useMyMembership();
  const { data: branchView } = useMembershipBranchView(isChampion || isAdmin || isGroupLeader);

  const cohorts = data?.cohorts ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <GraduationCap className="size-5 text-[#5D3FD3]" />{t('membership:membershipClasses')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('membership:fourSessionsCourseworkAFinalTest')}</p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/membership/interest"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted/60"
            >
              <ListChecks className="mr-1 size-4" />{t('membership:interestPool')}</Link>
            <Link
              href="/membership/new"
              className="inline-flex h-9 items-center rounded-md bg-[#5D3FD3] px-4 text-sm font-medium text-white transition hover:bg-[#451ebb]"
            >
              <Plus className="mr-1 size-4" />{t('membership:newCohort')}</Link>
          </div>
        ) : null}
      </header>

      <MyMembershipCard mine={mine} />

      {/* Champion + admin liaison view of the branch: waitlist plus
          currently-admitted members from their branch. Read-only. Not shown
          to plain members. */}
      {branchView ? (
        <ChampionBranchView view={branchView} scope={isChampion || isAdmin ? 'branch' : 'group'} />
      ) : null}

      {/* Cohort list is admin-only. Waitlist members shouldn't be sizing up
          intakes they can't join themselves — the admission call is made by
          the church membership admin team, not by the candidate. Members
          currently enrolled in a cohort reach it via the link inside their
          MyMembershipCard. */}
      {isAdmin ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(['all', 'planned', 'active', 'completed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  statusFilter === s
                    ? 'border-[#5D3FD3] bg-[#5D3FD3] text-white'
                    : 'border-border text-muted-foreground hover:bg-muted/60',
                )}
              >
                {t(`membership:cohortStatus_${s}`)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('membership:loadingCohorts')}</p>
          ) : cohorts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('membership:noCohortsYetCreateOneTo')}</CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cohorts.map((c) => (
                <CohortCard key={c.id} cohort={c} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/**
 * The caller's own state, in one card. Five cases, in priority order:
 * confirmed Member, enrolled in a cohort, waiting in the pool, a pool entry
 * that ended (lapsed or withdrawn), or nothing yet.
 *
 * The fourth case is why `me` returns the most recent entry of ANY status
 * rather than only a live one. Showing the join button again as though
 * nothing had happened is exactly the silent-drop the two-stage model exists
 * to avoid.
 */
function MyMembershipCard({ mine }: { mine: ReturnType<typeof useMyMembership>['data'] }) {  const { t } = useTranslation(['membership', 'common']);

  const express = useExpressInterest();
  const withdraw = useWithdrawInterest();

  if (!mine) return null;

  if (mine.confirmedAt) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('membership:youAreAConfirmedMember')}</p>
            <p className="text-xs text-muted-foreground">
              {t('membership:classCompletedOn', { date: formatShortDate(mine.confirmedAt) })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mine.enrollment) {
    const readiness = mine.readiness;
    return (
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {t('membership:yourProgressIn', { name: mine.enrollment.cohortName })}
            </p>
            <Badge variant={readiness?.eligible ? 'default' : 'secondary'}>
              {readiness?.eligible ? t('membership:readyGraduate') : t('membership:inProgress')}
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

  const interest = mine.interest;

  if (interest?.status === 'waiting') {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Clock className="size-5 shrink-0 text-[#5D3FD3]" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('membership:youAreOnTheListFor')}</p>
              <p className="text-xs text-muted-foreground">
                {t('membership:addedAdminWillPlaceYou', {
                  added: formatShortDate(interest.expressedAt),
                  until: formatShortDate(interest.expiresAt),
                })}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={withdraw.isPending}
            onClick={() =>
              withdraw.mutate(undefined, {
                onSuccess: () => toast.success(t('membership:takenOffList')),
                onError: (e: unknown) =>
                  toast.error(e instanceof Error ? e.message : 'Could not update the list.'),
              })
            }
          >
            {withdraw.isPending ? t('membership:removing') : t('membership:takeMeOff')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ended = interest?.status === 'lapsed' || interest?.status === 'withdrawn';

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            {ended ? t('membership:yourPlaceListEnded') : t('membership:interestedBecomingMember')}
          </p>
          <p className="text-xs text-muted-foreground">
            {interest?.status === 'lapsed'
              ? t('membership:yourPlaceLapsedOn', { date: formatShortDate(interest.expiresAt) })
              : interest?.status === 'withdrawn'
                ? t('membership:youTookYourselfOffTheList')
                : t('membership:joinTheListAndAdminWillPlaceYou')}
          </p>
        </div>
        <Button
          size="sm"
          disabled={express.isPending}
          onClick={() =>
            express.mutate(undefined, {
              onSuccess: () => toast.success(t('membership:youListNextClass')),
              onError: (e: unknown) =>
                toast.error(e instanceof Error ? e.message : 'Could not join the list.'),
            })
          }
        >
          {express.isPending ? 'Joining…' : ended ? t('membership:joinAgain') : t('membership:joinList')}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Champion's slice: their branch's waitlist + admitted members from their
 * branch, side by side. Empty lists are legitimate — a branch with nobody
 * waiting and nobody in cohorts renders as two empty panels. Read-only:
 * expressing interest, admitting, marking, and graduating all belong to
 * either the candidate themselves (interest) or the membership admin team.
 */
/**
 * The same two lists at two different reaches. A Champion or Membership Admin
 * is reading a branch; a fellowship/department leader is reading the people
 * they lead. Say which, so nobody mistakes a partial list for the whole one.
 */
function ChampionBranchView({
  view,
  scope,
}: {
  view: MembershipBranchViewResponse;
  scope: 'branch' | 'group';
}) {  const { t } = useTranslation(['membership', 'common']);

  const { waitlist, enrolled } = view;
  const isGroup = scope === 'group';
  return (
    <Card>
      <CardContent className="space-y-5 py-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#5D3FD3]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isGroup ? t('membership:yourPeopleWaiting') : t('membership:branchWaitlist')} ({waitlist.length})
            </h2>
          </div>
          {waitlist.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground/70">
              {isGroup
                ? t('membership:nobodyLeadCurrentlyWaiting')
: t('membership:nobodyBranchCurrentlyWaiting')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {waitlist.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-foreground">
                    {row.memberFirstName} {row.memberLastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('membership:waitingDaysAdded', {
                      count: row.waitingDays,
                      date: formatShortDate(row.expressedAt),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-[#5D3FD3]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isGroup ? t('membership:yourPeopleAdmitted') : t('membership:admittedBranch')} ({enrolled.length})
            </h2>
          </div>
          {enrolled.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground/70">{t('membership:noOneFromYourBranchIs')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {enrolled.map((row) => (
                <li key={row.enrollmentId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-foreground">
                    {row.memberFirstName} {row.memberLastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.cohortName} · admitted {formatShortDate(row.enrolledAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CohortCard({ cohort }: { cohort: MembershipCohortSummary }) {
  const { t } = useTranslation(['membership', 'common']);
  const statusTone: Record<MembershipCohortStatus, string> = {
    planned: 'bg-amber-500/10 text-amber-700 dark:text-[#f8b537]',
    active: 'bg-[#5D3FD3]/10 text-[#5D3FD3]',
    completed: 'bg-emerald-500/10 text-emerald-700',
    cancelled: 'bg-muted text-muted-foreground',
  };

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
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              statusTone[cohort.status],
            )}
          >
            {t(`membership:cohortStatus_${cohort.status}`)}
          </span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {t('membership:startsOn', { date: formatShortDate(cohort.startDate) })}
            {cohort.graduationDate
              ? t('membership:inductionSuffix', { date: formatShortDate(cohort.graduationDate) })
              : ''}
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {t('membership:enrolledGraduated', {
              enrolled: cohort.enrolledCount,
              graduated: cohort.graduatedCount,
            })}
          </p>
          <p className="flex items-center gap-1.5">
            <GraduationCap className="size-3.5" />
            {t('membership:ofFourSessionsScheduled', { count: cohort.sessionCount })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
