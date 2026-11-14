'use client';

import { useEffect, useMemo, useState } from 'react';
import { GitCompare, Zap } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
} from '@kairos/ui';
import { useServices, useCohortDiff } from '@/hooks/use-attendance';
import { formatShortDate } from '@kairos/core';
import { useTranslation } from 'react-i18next';

type Mode = 'any' | 'all';
type PresetKey = 'missed-last-4' | 'first-timers-this-week' | 'regulars-slipped';

interface CohortCompareCardProps {
  /** Branch scope. Required semantically — the compare API is single-branch.
   *  Card renders a "pick a branch first" hint when this is undefined. */
  branchId?: string;
}

/**
 * "Who came to A but not B?" form. Pick any number of services in each bucket;
 * use the ANY/ALL toggle when a bucket has 2+ services (toggle collapses to one
 * answer when the bucket is single-select).
 *
 * The compare API validates that every referenced service belongs to a single
 * branch — cross-branch cohorts aren't meaningful (a member can't attend two
 * branches' services simultaneously). We enforce that at the UI too: this
 * card is inert until a branch is selected on the parent report page, and we
 * clear selections whenever the branch changes so stale UUIDs from a
 * different branch can't leak into the next submission.
 */
export function CohortCompareCard({ branchId }: CohortCompareCardProps) {  const { t } = useTranslation(['attendance', 'common']);

  const { data: servicesPage } = useServices(branchId ? { branchId, limit: 100 } : undefined);
  const serviceOptions = useMemo(
    () => (branchId ? servicesPage?.data ?? [] : []),
    [branchId, servicesPage?.data],
  );

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [presentMode, setPresentMode] = useState<Mode>('any');
  const [absentMode, setAbsentMode] = useState<Mode>('all');

  // When the outer filter switches branches, old service UUIDs point at rows
  // in a different branch and would fail the server-side branch check. Wipe
  // selections + any prior result so the user starts fresh.
  const cohort = useCohortDiff();
  useEffect(() => {
    setPresentIds(new Set());
    setAbsentIds(new Set());
    cohort.reset();
    // Intentionally omit `cohort` from deps — mutation is a fresh object every
    // render, we only want to reset when the scope actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const result = cohort.data?.members ?? [];
  const canSubmit = Boolean(branchId) && (presentIds.size > 0 || absentIds.size > 0);

  function toggle(set: Set<string>, setter: (next: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    await cohort.mutateAsync({
      presentInServiceIds: Array.from(presentIds),
      absentFromServiceIds: Array.from(absentIds),
      presentMode,
      absentMode,
      branchId,
    });
  }

  // Presets pre-fill and submit in one click. They assume services are ordered
  // most-recent-first in the useServices() response — the API defaults to
  // that ordering (services router lists newest first).
  async function runPreset(key: PresetKey) {
    if (!branchId || serviceOptions.length === 0) return;
    const mostRecent = serviceOptions[0]?.id;
    const last4 = serviceOptions.slice(0, 4).map((s) => s.id);
    const prior4 = serviceOptions.slice(4, 8).map((s) => s.id);

    if (key === 'missed-last-4' && last4.length > 0) {
      const absentSet = new Set(last4);
      setPresentIds(new Set());
      setAbsentIds(absentSet);
      setAbsentMode('all');
      await cohort.mutateAsync({
        presentInServiceIds: [],
        absentFromServiceIds: last4,
        presentMode: 'any',
        absentMode: 'all',
        branchId,
      });
    } else if (key === 'first-timers-this-week' && mostRecent) {
      // "Present at the most recent service but absent from every one of the
      // 4 services before it" — proxy for a first-timer this week.
      const presentSet = new Set([mostRecent]);
      const absentSet = new Set(prior4);
      setPresentIds(presentSet);
      setAbsentIds(absentSet);
      setPresentMode('any');
      setAbsentMode('all');
      if (prior4.length === 0) return;
      await cohort.mutateAsync({
        presentInServiceIds: [mostRecent],
        absentFromServiceIds: prior4,
        presentMode: 'any',
        absentMode: 'all',
        branchId,
      });
    } else if (key === 'regulars-slipped' && prior4.length > 0 && last4.length > 0) {
      // "Attended every one of the 4 services BEFORE the last 4, but missed
      // every one of the last 4" — regulars who've dropped off recently.
      const presentSet = new Set(prior4);
      const absentSet = new Set(last4);
      setPresentIds(presentSet);
      setAbsentIds(absentSet);
      setPresentMode('all');
      setAbsentMode('all');
      await cohort.mutateAsync({
        presentInServiceIds: prior4,
        absentFromServiceIds: last4,
        presentMode: 'all',
        absentMode: 'all',
        branchId,
      });
    }
  }

  const presetsEnabled = Boolean(branchId) && serviceOptions.length > 0 && !cohort.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4 text-[#5D3FD3]" aria-hidden />{t('attendance:compareCohorts')}</CardTitle>
        <CardDescription>
          {t('attendance:cohortCompareCaption')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {branchId && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5" aria-hidden />{t('attendance:presets')}</span>
            <PresetButton
              label={t('attendance:missedLast')}
              disabled={!presetsEnabled}
              onClick={() => runPreset('missed-last-4')}
            />
            <PresetButton
              label={t('attendance:firstTimersThisWeek')}
              disabled={!presetsEnabled || serviceOptions.length < 5}
              onClick={() => runPreset('first-timers-this-week')}
            />
            <PresetButton
              label={t('attendance:regularsWhoSlipped')}
              disabled={!presetsEnabled || serviceOptions.length < 8}
              onClick={() => runPreset('regulars-slipped')}
            />
          </div>
        )}
        {!branchId ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Pick a specific branch in the filter above to compare cohorts. Comparison only runs
            within one branch at a time: a member can only attend one branch&rsquo;s services on
            a given day.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <ServiceColumn
              title={t('attendance:presentIn')}
              services={serviceOptions}
              selected={presentIds}
              mode={presentMode}
              onToggleService={(id) => toggle(presentIds, setPresentIds, id)}
              onModeChange={setPresentMode}
            />
            <ServiceColumn
              title={t('attendance:absentFrom')}
              services={serviceOptions}
              selected={absentIds}
              mode={absentMode}
              onToggleService={(id) => toggle(absentIds, setAbsentIds, id)}
              onModeChange={setAbsentMode}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || cohort.isPending}
            className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
          >
            {cohort.isPending ? t('attendance:comparing') : t('attendance:runComparison')}
          </Button>
          {cohort.isSuccess && (
            <span className="text-xs text-muted-foreground">
              {t('attendance:membersMatch', { count: result.length })}
            </span>
          )}
          {cohort.isError && (
            <span role="alert" className="text-xs font-medium text-destructive">
              {cohort.error instanceof Error ? cohort.error.message : 'Could not run comparison.'}
            </span>
          )}
        </div>

        {cohort.isSuccess && result.length > 0 && (
          <ul className="divide-y rounded-lg border bg-card" aria-label={t('attendance:cohortComparisonResult')}>
            {result.map((m) => (
              <li key={m.memberId} className="px-3 py-2 text-sm">
                {m.firstName} {m.lastName}
              </li>
            ))}
          </ul>
        )}
        {cohort.isSuccess && result.length === 0 && (
          <p className="rounded-lg border border-dashed bg-card px-3 py-6 text-center text-sm text-muted-foreground">{t('attendance:noMembersMatchThisComparison')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PresetButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-foreground/10 bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-[#5D3FD3]/40 hover:bg-[#5D3FD3]/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function ServiceColumn({
  title,
  services,
  selected,
  mode,
  onToggleService,
  onModeChange,
}: {
  title: string;
  services: Array<{ id: string; serviceDate: string; serviceType: string; serviceTitle: string | null }>;
  selected: Set<string>;
  mode: Mode;
  onToggleService: (id: string) => void;
  onModeChange: (mode: Mode) => void;
}) {  const { t } = useTranslation(['attendance', 'common']);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <div role="radiogroup" aria-label={t('attendance:v1Mode', { v1: title })} className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
          {(['any', 'all'] as const).map((m) => (
            <button
              key={m}
              role="radio"
              type="button"
              aria-checked={mode === m}
              onClick={() => onModeChange(m)}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border bg-card p-2">
        {services.length === 0 && (
          <li className="px-2 py-1 text-xs text-muted-foreground">{t('attendance:noServicesInScope')}</li>
        )}
        {services.map((s) => {
          const checked = selected.has(s.id);
          return (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/[0.04]">
                <Checkbox
                  checked={checked}
                  onChange={() => onToggleService(s.id)}
                />
                <span className="font-medium">{t(`attendance:serviceType_${s.serviceType}`)}</span>
                <span className="text-muted-foreground">{formatShortDate(s.serviceDate)}</span>
                {s.serviceTitle && <span className="text-xs text-muted-foreground">· {s.serviceTitle}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
