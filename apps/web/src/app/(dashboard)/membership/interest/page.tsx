'use client';

export const runtime = 'edge';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Input, Badge, cn } from '@kairos/ui';
import { toast } from 'sonner';
import { ArrowLeft, ListChecks, Clock, TriangleAlert } from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { useCapabilities } from '@/hooks/use-capabilities';
import {
  useMembershipInterest,
  useMembershipCohorts,
  useAdmitMembers,
} from '@/hooks/use-membership';
import { CHURCH_SCOPE } from '@kairos/types';
import type { MembershipInterestStatus, MembershipInterestWithMember } from '@kairos/types';

/**
 * The interest pool: who is waiting, and admitting them into a cohort.
 *
 * Enrolment is not self-service. People express interest, which puts them in
 * this church-wide pool belonging to no cohort, and an admin decides who goes
 * into which intake.
 *
 * Admission is a JUDGEMENT CALL, not a queue, which is why each row shows
 * both how long someone has waited and how often they have actually turned up
 * in the last 90 days. Someone who signed up and then stopped attending for a
 * season should not roll into the next intake just because they are top of
 * the list; entries lapse on their own so that outcome is the default rather
 * than something an admin has to remember to do.
 */
export default function MembershipInterestPage() {
  const router = useRouter();
  const caps = useCapabilities();
  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);

  const [status, setStatus] = useState<MembershipInterestStatus>('waiting');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cohortId, setCohortId] = useState('');

  const { data, isLoading } = useMembershipInterest({
    status,
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  // Only cohorts that can actually take people. Admitting into a completed or
  // closed cohort is refused by the API, so it should not be offered here.
  const { data: cohortData } = useMembershipCohorts({ enrolmentOpen: true });
  const admit = useAdmitMembers(cohortId);

  const rows = useMemo(() => data?.interest ?? [], [data]);
  const openCohorts = useMemo(
    () => (cohortData?.cohorts ?? []).filter((c) => c.status !== 'completed' && c.status !== 'cancelled'),
    [cohortData],
  );

  useEffect(() => {
    if (!isAdmin) router.replace('/membership');
  }, [isAdmin, router]);

  // Selection is only meaningful for the waiting list, and a row that scrolls
  // out of the current filter must not stay silently selected underneath it.
  useEffect(() => {
    setSelected(new Set());
  }, [status, search]);

  if (!isAdmin) return null;

  function toggle(memberId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function admitSelected() {
    if (!cohortId) {
      toast.error('Pick the cohort to admit them into.');
      return;
    }
    const memberIds = [...selected];
    if (memberIds.length === 0) return;

    admit.mutate(
      { memberIds },
      {
        onSuccess: (created) => {
          setSelected(new Set());
          toast.success(
            `Admitted ${created.length} ${created.length === 1 ? 'person' : 'people'}.`,
          );
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : 'Could not admit them.'),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/membership"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Membership classes
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ListChecks className="size-5 text-[#5D3FD3]" />
          Interest pool
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People waiting to be placed in a membership class. Nobody enters a cohort on
          their own: pick who goes into the next intake. Entries lapse after six months,
          so somebody who has been away for a season drops off rather than rolling
          forward.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(['waiting', 'admitted', 'lapsed', 'withdrawn'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium capitalize transition',
              status === s
                ? 'border-[#5D3FD3] bg-[#5D3FD3] text-white'
                : 'border-border text-muted-foreground hover:bg-muted/60',
            )}
          >
            {s}
          </button>
        ))}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className="h-8 w-full max-w-56 sm:ml-auto"
        />
      </div>

      {status === 'waiting' && selected.size > 0 ? (
        <Card className="border-[#5D3FD3]/40 bg-[#5D3FD3]/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <p className="text-sm font-medium text-foreground">
              {selected.size} selected
            </p>
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Admit into…</option>
              {openCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button size="sm" disabled={admit.isPending || !cohortId} onClick={admitSelected}>
              {admit.isPending ? 'Admitting…' : 'Admit'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {openCohorts.length === 0 && status === 'waiting' ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
            <TriangleAlert className="size-4 shrink-0 text-amber-600" />
            No cohort is open to admissions. Create one, or reopen an existing cohort,
            before you can place anybody.
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the pool…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {status === 'waiting' ? 'Nobody is waiting right now.' : `No ${status} entries.`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <InterestRow
              key={row.id}
              row={row}
              selectable={status === 'waiting'}
              selected={selected.has(row.memberId)}
              onToggle={() => toggle(row.memberId)}
            />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total > rows.length ? (
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} of {data.pagination.total}.
        </p>
      ) : null}
    </div>
  );
}

function InterestRow({
  row,
  selectable,
  selected,
  onToggle,
}: {
  row: MembershipInterestWithMember;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  // The signal that matters at admission time. Someone who has not been at a
  // service in three months is the case the lapse rule exists for, so say it
  // plainly rather than making the admin read a zero and infer it.
  const absent = row.recentAttendanceCount === 0;

  return (
    <Card className={cn('transition', selected && 'border-[#5D3FD3] bg-[#5D3FD3]/5')}>
      <CardContent className="flex flex-wrap items-center gap-3 py-3">
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${row.memberFirstName} ${row.memberLastName}`}
            className="size-4 accent-[#5D3FD3]"
          />
        ) : null}

        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium text-foreground">
            {row.memberFirstName} {row.memberLastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.branchName ?? 'No home branch'}
            {row.memberEmail ? ` · ${row.memberEmail}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" />
            Waiting {row.waitingDays} {row.waitingDays === 1 ? 'day' : 'days'}
          </span>

          {row.recentAttendanceCount === null ? null : (
            <Badge variant={absent ? 'destructive' : 'secondary'}>
              {absent
                ? 'Not seen in 90 days'
                : `${row.recentAttendanceCount} services in 90 days`}
            </Badge>
          )}

          {row.status === 'waiting' ? (
            <span className="text-muted-foreground">
              Lapses {formatShortDate(row.expiresAt)}
            </span>
          ) : row.status === 'admitted' && row.admittedAt ? (
            <span className="text-muted-foreground">
              Admitted {formatShortDate(row.admittedAt)}
            </span>
          ) : (
            <span className="capitalize text-muted-foreground">{row.status}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
