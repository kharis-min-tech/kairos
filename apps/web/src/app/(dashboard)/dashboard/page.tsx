'use client';

import React from 'react';
import { resolveVerse } from '@kairos/core';
import { useAuthStore } from '@/lib/auth-store';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMeHome, useMyLeadership } from '@/hooks/use-me';
import { useBranches } from '@/hooks/use-branches';
import { CustomSelect } from '@kairos/ui';
import {
  AgendaBlock,
  RecentActivityBlock,
  GettingStartedBlock,
  GroupsBlock,
  HomeSkeleton,
  NeedsYouBlock,
  PulseBlock,
  StreakBlock,
} from '@/components/dashboard/home-blocks';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/date-locale';

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

// ── Role label ─────────────────────────────────────────────

interface RoleLabelInputs {
  scope: { kind: string; id: string } | null | undefined;
  scopeBranchName?: string;
  homeBranchName?: string;
  homeBranchInBsa: boolean;
  homeBranchInBda: boolean;
  isSystemAdmin: boolean;
  /** Main Pastor of their branch — an identity, which outranks authority here. */
  isBranchMainPastor: boolean;
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
/**
 * Which role to show, as a catalogue key plus the branch or group it is
 * scoped to. It used to return a finished English string ("Pastor, Kharis
 * Accra"), which no translation could reach.
 */
function deriveRoleLabel(i: RoleLabelInputs): { key: string; name?: string } {
  // Pastor is an identity on branch_leadership; branch-admin authority is a
  // grant. A pastor usually holds both, and the lens they think in is pastor.
  if (i.isBranchMainPastor) {
    return { key: 'pastor', name: i.scopeBranchName ?? i.homeBranchName };
  }
  if (i.scope?.kind === 'branch') {
    const name = i.scopeBranchName;
    if (i.isSystemAdmin) {
      return { key: i.isBranchSystemAdmin ? 'branchSystemAdmin' : 'administrator', name };
    }
    if (i.isBranchDataAdmin) return { key: 'branchDataAdmin', name };
    if (i.canWriteBranch) return { key: 'pastor', name };
    return { key: 'branch', name };
  }
  if (i.scope?.kind === 'fellowship') {
    return { key: 'fellowshipLeader', name: i.leadFellowshipName };
  }
  if (i.scope?.kind === 'department') {
    return { key: 'departmentLead', name: i.leadDepartmentName };
  }
  if (i.isSystemAdmin) return { key: 'administrator' };
  if (i.isBranchSystemAdmin) {
    return {
      key: 'branchSystemAdmin',
      name: i.homeBranchInBsa ? i.homeBranchName : undefined,
    };
  }
  if (i.isBranchDataAdmin) {
    return {
      key: 'branchDataAdmin',
      name: i.homeBranchInBda ? i.homeBranchName : undefined,
    };
  }
  if (i.canWriteBranch) return { key: 'pastor' };
  if (i.leadFellowshipName && i.leadDepartmentName) return { key: 'fellowshipAndDepartmentLead' };
  if (i.leadFellowshipName) return { key: 'fellowshipLeader', name: i.leadFellowshipName };
  if (i.leadDepartmentName) return { key: 'departmentLead', name: i.leadDepartmentName };
  if (i.canLead) return { key: 'leader' };
  return { key: 'member' };
}

// ── Recent activity ────────────────────────────────────────

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
}) {  const { t } = useTranslation(['common']);

  const scope = useAuthStore((s) => s.scope);
  const setScope = useAuthStore((s) => s.setScope);

  if (adminBranchIds.length < 2) return null;

  const branchById = new Map(allBranches.map((b) => [b.id, b.branchName]));
  const options = [
    { value: '__all__', label: t('common:allMyBranches') },
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
      placeholder={t('common:pickABranch')}
      className="h-7 px-2 text-xs"
    />
  );
}

// ── Page ───────────────────────────────────────────────────

export default function DashboardPage() {  const { t, i18n } = useTranslation(['common']);

  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
  const activeRole = useAuthStore((s) => s.activeRole);
  const scope = useAuthStore((s) => s.scope);

  const home = useMeHome();
  // Leadership still drives the role badge and the scope picker's branch list.
  // The blocks themselves need none of it — that's the point of the payload.
  const leadership = useMyLeadership();
  const { data: branches } = useBranches();

  const today = new Date().toLocaleDateString(dateLocale(i18n.language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  // Follow the reader's language. resolveVerse carries a real Bible version
  // per language and reports when it had to fall back, so the card can say so
  // rather than presenting English as though it were the reader's language.
  const verse = resolveVerse(i18n.language);

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

  const data = home.data;
  const altitude = data?.altitude ?? 'personal';

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
    isBranchMainPastor: data?.viewerIsBranchMainPastor ?? false,
    isBranchSystemAdmin: bsaIds.length > 0,
    isBranchDataAdmin: bdaIds.length > 0,
    canWriteBranch: caps.has('branch:write'),
    canLead: caps.has('fellowship:write') || caps.has('department:write'),
    leadFellowshipName: allLeadFellowships[0]?.fellowshipName,
    leadDepartmentName: allLeadDepartments[0]?.departmentName,
  });

  const header = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{today}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
          {user?.firstName ? t('common:goodDayName', { name: user.firstName }) : t('common:dashboard')}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full border border-[#5D3FD3]/40 bg-[#5D3FD3]/15 px-2.5 py-0.5 text-xs font-semibold text-[#5D3FD3] dark:text-[#a488ff]">
            {roleLabel.name
              ? `${t(`common:role.${roleLabel.key}`)}, ${roleLabel.name}`
              : t(`common:role.${roleLabel.key}`)}
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
          <p className="text-sm font-semibold text-foreground">{t('common:weCouldnTLoadDashboard')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {home.error instanceof Error ? home.error.message : 'Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => home.refetch()}
            className="mt-3 rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] px-3 py-1.5 text-sm font-medium text-white"
          >{t('common:retry')}</button>
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
      <AgendaBlock label={t('common:today')} items={data.today} />
      <AgendaBlock label={t('common:thisWeek')} items={data.thisWeek} withDay />
      {data.gettingStarted.length > 0 ? (
        <GettingStartedBlock items={data.gettingStarted} />
      ) : null}
    </>
  );
  const sidebar = (
    <>
      <NeedsYouBlock items={data.needsYou} />
      <GroupsBlock
        label={altitude === 'church' ? t('common:allBranches') : t('common:groupsILead')}
        groups={data.groups}
      />
      {data.streakWeeks ? <StreakBlock weeks={data.streakWeeks} /> : null}
      {altitude === 'personal' ? null : <RecentActivityBlock items={data.recentActivity} />}
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
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('common:dailyVerse')}</p>
        <p className="mb-2 text-sm italic leading-relaxed text-foreground/80">
          &ldquo;{verse.text}&rdquo;
        </p>
        <p className="text-sm font-bold text-[#9a6b04] dark:text-[#f8b537]">
          — {verse.ref} ({verse.version})
          {verse.fellBackToEnglish ? ` · ${t('common:shownInEnglish')}` : ''}
        </p>
      </div>
    </div>
  );
}
