'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMeHome, useMyLeadership } from '@/hooks/use-me';
import { useMembers } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { CustomSelect } from '@kairos/ui';
import {
  AgendaBlock,
  GettingStartedBlock,
  GroupsBlock,
  HomeSkeleton,
  NeedsYouBlock,
  PulseBlock,
  StreakBlock,
} from '@/components/dashboard/home-blocks';

/**
 * The control centre.
 *
 * One set of blocks for every lens. `altitude` from GET /api/me/home decides
 * which blocks render and where — so adding a role never means adding a
 * branch to this file. That replaced a seven-way persona cascade, each arm of
 * which carried its own hard-coded stat row; the cascade was also why a
 * fellowship leader saw branch-wide numbers (they fell through to the pastor
 * arm). Scope now comes from the payload, which is derived from the caller's
 * own grants.
 *
 * Mobile stacks the same blocks and reads priority top-down; here they're
 * zones and priority is read by position and size.
 */

// ── Daily verses ───────────────────────────────────────────

const DAILY_VERSES = [
  { text: 'Let all that you do be done in love.', ref: 'Psalm 46:10' },
  { text: 'Trust in the Lord with all your heart.', ref: 'Prov 3:5' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Phil 4:13' },
  { text: 'Be still and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'For I know the plans I have for you.', ref: 'Jer 29:11' },
  { text: 'Love one another as I have loved you.', ref: 'John 15:12' },
];
const getDailyVerse = () => DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length]!;

// ── Role label ─────────────────────────────────────────────

interface RoleLabelInputs {
  scope: { kind: string; id: string } | null | undefined;
  scopeBranchName?: string;
  homeBranchName?: string;
  homeBranchInBsa: boolean;
  homeBranchInBda: boolean;
  isSystemAdmin: boolean;
  isBranchSystemAdmin: boolean;
  isBranchDataAdmin: boolean;
  canWriteBranch: boolean;
  canLead: boolean;
  leadFellowshipName?: string;
  leadDepartmentName?: string;
}

/**
 * The badge under the greeting — which lens the caller is looking through.
 * Display only: it carries no authority and gates nothing. First match wins,
 * higher authority overriding lower. When `scope` is set the caller has
 * picked a specific branch, so the label reflects that choice rather than
 * their full authority.
 */
function deriveRoleLabel(i: RoleLabelInputs): string {
  if (i.scope?.kind === 'branch') {
    const suffix = i.scopeBranchName ? `, ${i.scopeBranchName}` : '';
    if (i.isSystemAdmin) {
      return i.isBranchSystemAdmin
        ? `Branch System Admin${suffix}`
        : `Administrator${suffix}`;
    }
    if (i.isBranchDataAdmin) return `Branch Data Admin${suffix}`;
    if (i.canWriteBranch) return `Pastor${suffix}`;
    return `Branch${suffix}`;
  }
  if (i.scope?.kind === 'fellowship') {
    return i.leadFellowshipName
      ? `Fellowship Leader, ${i.leadFellowshipName}`
      : 'Fellowship Leader';
  }
  if (i.scope?.kind === 'department') {
    return i.leadDepartmentName
      ? `Department Lead, ${i.leadDepartmentName}`
      : 'Department Lead';
  }
  if (i.isSystemAdmin) return 'Administrator';
  if (i.isBranchSystemAdmin) {
    return i.homeBranchInBsa && i.homeBranchName
      ? `Branch System Admin, ${i.homeBranchName}`
      : 'Branch System Admin';
  }
  if (i.isBranchDataAdmin) {
    return i.homeBranchInBda && i.homeBranchName
      ? `Branch Data Admin, ${i.homeBranchName}`
      : 'Branch Data Admin';
  }
  if (i.canWriteBranch) return 'Pastor';
  if (i.leadFellowshipName && i.leadDepartmentName) return 'Fellowship & Department Lead';
  if (i.leadFellowshipName) return `Fellowship Leader, ${i.leadFellowshipName}`;
  if (i.leadDepartmentName) return `Department Lead, ${i.leadDepartmentName}`;
  if (i.canLead) return 'Leader';
  return 'Member';
}

// ── Recent activity ────────────────────────────────────────

/**
 * What has happened, as opposed to the agenda's what's next.
 *
 * It used to also list fellowships with their meeting schedules under a
 * "Recently" heading, which was doubly wrong: a schedule is not activity, and
 * upcoming fellowship meetings are already agenda items. Only things that have
 * actually happened belong here.
 */
function RecentActivity({ branchId, isMember }: { branchId?: string; isMember: boolean }) {
  const { data: result } = useMembers({ approvalStatus: 'pending', branchId, limit: 4 });
  const pending = result?.data ?? [];

  const items: { text: React.ReactNode; sub: string; href?: string }[] = [];
  // Membership requests are a leadership concern — a plain member seeing
  // other people's pending signups would be a disclosure, not a feature.
  if (!isMember) {
    pending.slice(0, 2).forEach((m) =>
      items.push({
        text: (
          <>
            <span className="font-semibold text-foreground">
              {m.firstName} {m.lastName}
            </span>
            <span className="text-muted-foreground"> requested membership.</span>
          </>
        ),
        sub: 'Recently',
        href: `/members/${m.id}`,
      }),
    );
  }
  return (
    <section>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Recent activity
      </p>
      <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
        {items.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground/70">No recent activity.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/15">
                  <svg
                    className="h-3.5 w-3.5 text-[#5D3FD3] dark:text-[#a488ff]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    {item.href ? (
                      <Link href={item.href} className="hover:underline">
                        {item.text}
                      </Link>
                    ) : (
                      item.text
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Branch scope picker ────────────────────────────────────

/**
 * Per-page scope selector, retained from the RBAC rebuild. Only renders for
 * someone holding branch-admin authority on more than one branch.
 */
function BranchScopePicker({
  adminBranchIds,
  allBranches,
}: {
  adminBranchIds: string[];
  allBranches: Array<{ id: string; branchName: string }>;
}) {
  const scope = useAuthStore((s) => s.scope);
  const setScope = useAuthStore((s) => s.setScope);

  if (adminBranchIds.length < 2) return null;

  const branchById = new Map(allBranches.map((b) => [b.id, b.branchName]));
  const options = [
    { value: '__all__', label: 'All my branches' },
    ...adminBranchIds.map((id) => ({ value: id, label: branchById.get(id) ?? id })),
  ];
  const currentValue = scope?.kind === 'branch' ? scope.id : '__all__';

  return (
    <CustomSelect
      value={currentValue}
      onValueChange={(value) => {
        if (value === '__all__') setScope(null);
        else setScope({ kind: 'branch', id: value });
      }}
      options={options}
      placeholder="Pick a branch"
      className="h-7 px-2 text-xs"
    />
  );
}

// ── Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
  const activeRole = useAuthStore((s) => s.activeRole);
  const scope = useAuthStore((s) => s.scope);

  const home = useMeHome();
  // Leadership still drives the role badge and the scope picker's branch list.
  // The blocks themselves need none of it — that's the point of the payload.
  const leadership = useMyLeadership();
  const { data: branches } = useBranches();

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const branchId = scope?.kind === 'branch' ? scope.id : user?.homeBranchId;
  const verse = getDailyVerse();

  const bsaIds = leadership.data?.branchSystemAdminBranchIds ?? [];
  const bdaIds = leadership.data?.branchDataAdminBranchIds ?? [];
  const allLeadFellowships = [
    ...(leadership.data?.leadFellowships ?? []),
    ...(leadership.data?.coLeadFellowships ?? []),
  ];
  const allLeadDepartments = [
    ...(leadership.data?.leadDepartments ?? []),
    ...(leadership.data?.deputyDepartments ?? []),
  ];

  const roleLabel = deriveRoleLabel({
    scope,
    scopeBranchName:
      scope?.kind === 'branch'
        ? branches?.find((b) => b.id === scope.id)?.branchName
        : undefined,
    homeBranchName: user?.homeBranchId
      ? branches?.find((b) => b.id === user.homeBranchId)?.branchName
      : undefined,
    homeBranchInBsa: !!user?.homeBranchId && bsaIds.includes(user.homeBranchId),
    homeBranchInBda: !!user?.homeBranchId && bdaIds.includes(user.homeBranchId),
    isSystemAdmin: activeRole === 'admin',
    isBranchSystemAdmin: bsaIds.length > 0,
    isBranchDataAdmin: bdaIds.length > 0,
    canWriteBranch: caps.has('branch:write'),
    canLead: caps.has('fellowship:write') || caps.has('department:write'),
    leadFellowshipName: allLeadFellowships[0]?.fellowshipName,
    leadDepartmentName: allLeadDepartments[0]?.departmentName,
  });

  const data = home.data;
  const altitude = data?.altitude ?? 'personal';

  const header = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{today}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
          {user?.firstName ? `Good day, ${user.firstName}!` : 'Dashboard'}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full border border-[#5D3FD3]/40 bg-[#5D3FD3]/15 px-2.5 py-0.5 text-xs font-semibold text-[#5D3FD3] dark:text-[#a488ff]">
            {roleLabel}
          </span>
          <BranchScopePicker
            adminBranchIds={[...new Set([...bsaIds, ...bdaIds])]}
            allBranches={branches ?? []}
          />
        </div>
      </div>
    </div>
  );

  if (home.isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <HomeSkeleton />
      </div>
    );
  }

  if (home.isError || !data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-lg border border-[#e11d48]/40 bg-[#e11d48]/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            We couldn&apos;t load your dashboard.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {home.error instanceof Error ? home.error.message : 'Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => home.refetch()}
            className="mt-3 rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] px-3 py-1.5 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // The agenda column is the one that can be empty — the queue column always
  // has Recent Activity, which renders its own empty state.
  const hasAgenda =
    data.today.length > 0 || data.thisWeek.length > 0 || data.gettingStarted.length > 0;

  const pulse = data.pulse ? <PulseBlock pulse={data.pulse} /> : null;
  const agenda = (
    <>
      <AgendaBlock label="Today" items={data.today} />
      <AgendaBlock label="This week" items={data.thisWeek} withDay />
      {data.gettingStarted.length > 0 ? (
        <GettingStartedBlock items={data.gettingStarted} />
      ) : null}
    </>
  );
  const sidebar = (
    <>
      <NeedsYouBlock items={data.needsYou} />
      <GroupsBlock
        label={altitude === 'church' ? 'All branches' : 'My groups'}
        groups={data.groups}
      />
      {data.streakWeeks ? <StreakBlock weeks={data.streakWeeks} /> : null}
      <RecentActivity branchId={branchId} isMember={altitude === 'personal'} />
    </>
  );

  return (
    <div className="space-y-6">
      {header}

      {/* Pulse spans the top where it exists; the agenda leads the left
          column and the queue the right. At church altitude the numbers are
          the whole story — a system admin has no personal duties — so the
          agenda drops below the fold rather than leading an empty section.

          When a column has nothing in it the grid collapses to one column
          rather than reserving dead space, so the remaining blocks line up
          with the full-width pulse row above them. A system admin with no
          personal agenda is the common case, not an edge one. */}
      {pulse}

      {hasAgenda ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">{altitude === 'church' ? sidebar : agenda}</div>
          <div className="space-y-6">{altitude === 'church' ? agenda : sidebar}</div>
        </div>
      ) : (
        <div className="space-y-6">{sidebar}</div>
      )}

      <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-ambient">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Daily verse
        </p>
        <p className="mb-2 text-sm italic leading-relaxed text-foreground/80">
          &ldquo;{verse.text}&rdquo;
        </p>
        <p className="text-sm font-bold text-[#9a6b04] dark:text-[#f8b537]">— {verse.ref}</p>
      </div>
    </div>
  );
}
