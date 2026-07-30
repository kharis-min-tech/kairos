'use client';

import { useMemo, useState } from 'react';
import { GitCompare } from 'lucide-react';
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
import { formatShortDate } from '@/lib/date-format';

type Mode = 'any' | 'all';

interface CohortCompareCardProps {
  /** Optional branch scope; admin/pastor can pass a chosen branchId, others omit (server scopes to caller). */
  branchId?: string;
}

/**
 * "Who came to A but not B?" form. Pick any number of services in each bucket;
 * use the ANY/ALL toggle when a bucket has 2+ services (toggle collapses to one
 * answer when the bucket is single-select).
 */
export function CohortCompareCard({ branchId }: CohortCompareCardProps) {
  const { data: servicesPage } = useServices({ branchId, limit: 100 });
  const serviceOptions = useMemo(() => servicesPage?.data ?? [], [servicesPage?.data]);

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [presentMode, setPresentMode] = useState<Mode>('any');
  const [absentMode, setAbsentMode] = useState<Mode>('all');

  const cohort = useCohortDiff();
  const result = cohort.data?.members ?? [];
  const canSubmit = presentIds.size > 0 || absentIds.size > 0;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Compare cohorts
        </CardTitle>
        <CardDescription>
          Who came to one selection of services but is missing from another? Pick services in each
          column; toggle ANY/ALL when comparing across multiple services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ServiceColumn
            title="Present in"
            services={serviceOptions}
            selected={presentIds}
            mode={presentMode}
            onToggleService={(id) => toggle(presentIds, setPresentIds, id)}
            onModeChange={setPresentMode}
          />
          <ServiceColumn
            title="Absent from"
            services={serviceOptions}
            selected={absentIds}
            mode={absentMode}
            onToggleService={(id) => toggle(absentIds, setAbsentIds, id)}
            onModeChange={setAbsentMode}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || cohort.isPending}
            className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
          >
            {cohort.isPending ? 'Comparing…' : 'Run comparison'}
          </Button>
          {cohort.isSuccess && (
            <span className="text-xs text-muted-foreground">
              {result.length} {result.length === 1 ? 'member' : 'members'} match.
            </span>
          )}
          {cohort.isError && (
            <span role="alert" className="text-xs font-medium text-destructive">
              {cohort.error instanceof Error ? cohort.error.message : 'Could not run comparison.'}
            </span>
          )}
        </div>

        {cohort.isSuccess && result.length > 0 && (
          <ul className="divide-y rounded-lg border bg-card" aria-label="Cohort comparison result">
            {result.map((m) => (
              <li key={m.memberId} className="px-3 py-2 text-sm">
                {m.firstName} {m.lastName}
              </li>
            ))}
          </ul>
        )}
        {cohort.isSuccess && result.length === 0 && (
          <p className="rounded-lg border border-dashed bg-card px-3 py-6 text-center text-sm text-muted-foreground">
            No members match this comparison.
          </p>
        )}
      </CardContent>
    </Card>
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
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <div role="radiogroup" aria-label={`${title} mode`} className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
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
          <li className="px-2 py-1 text-xs text-muted-foreground">No services in scope.</li>
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
                <span className="font-medium">{s.serviceType}</span>
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
