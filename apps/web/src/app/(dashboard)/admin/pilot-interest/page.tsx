'use client';

import { useState } from 'react';
import { Check, Mail, Phone, CalendarDays } from 'lucide-react';
import {
  PILOT_INTEREST_STATUS_VALUES,
  PILOT_ROLE_LABEL,
  type PilotInterestRow,
  type PilotInterestStatus,
  type PilotRole,
} from '@kairos/types';
import { usePilotInterestList, useUpdatePilotInterest } from '@/hooks/use-pilot-interest';

/**
 * Who has put their branch forward.
 *
 * Platform admin only, matching the API. The queue is every branch's answers
 * side by side and the point is comparing them, so a branch-scoped grant
 * would be the wrong shape — a branch admin has no business seeing who else
 * volunteered.
 */
export default function PilotInterestPage() {
  const [status, setStatus] = useState<PilotInterestStatus | 'all'>('all');
  const { data, isLoading, error } = usePilotInterestList(
    status === 'all' ? undefined : { status },
  );

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Pilot interest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Branches that have put themselves forward to go first.
          {data ? ` ${data.total} in total.` : ''}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all', ...PILOT_INTEREST_STATUS_VALUES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              status === s
                ? 'border-[#5D3FD3] bg-[#5D3FD3] text-white'
                : 'border-black/10 text-muted-foreground hover:border-[#5D3FD3]/50 dark:border-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          Could not load submissions. {error instanceof Error ? error.message : ''}
        </p>
      )}
      {data?.rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-muted-foreground dark:border-white/10">
          Nobody has put a branch forward yet.
        </p>
      )}

      <div className="space-y-4">
        {data?.rows.map((row) => <SubmissionCard key={row.id} row={row} />)}
      </div>
    </div>
  );
}

function SubmissionCard({ row }: { row: PilotInterestRow }) {
  const update = useUpdatePilotInterest();

  return (
    <article className="rounded-2xl border border-black/[0.08] bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{row.branchName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {row.fullName} ·{' '}
            {row.roleAtBranch === 'other'
              ? row.roleOther ?? 'Other role'
              : PILOT_ROLE_LABEL[row.roleAtBranch as PilotRole]}
          </p>
        </div>
        <select
          value={row.status}
          onChange={(e) =>
            update.mutate({ id: row.id, status: e.target.value })
          }
          className="rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wider dark:border-white/10"
        >
          {PILOT_INTEREST_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={row.email} />
        {row.phone && <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={row.phone} />}
        <Row label="Fellowships / departments"
          value={`${row.fellowshipCount ?? '—'} / ${row.departmentCount ?? '—'}`} />
        <Row label="Approx members" value={row.approxMembers?.toString() ?? '—'} />
        <Row label="Head of admin"
          value={row.headOfAdminName ? `${row.headOfAdminName}${row.headOfAdminEmail ? ` · ${row.headOfAdminEmail}` : ''}` : 'Not named'} />
        <Row
          label="Safeguarding lead"
          value={
            row.safeguardingLeadInPost
              ? row.safeguardingLeadName ?? 'In post'
              : 'Not in post'
          }
          tone={row.safeguardingLeadInPost ? 'good' : 'warn'}
        />
        {row.earliestStart && (
          <Row icon={<CalendarDays className="h-3.5 w-3.5" />} label="Earliest start" value={row.earliestStart} />
        )}
        <Row label="Submitted" value={new Date(row.submittedAt).toLocaleString('en-GB')} />
      </dl>

      {row.whyThisBranch && (
        <blockquote className="mt-4 border-l-2 border-[#f8b537] pl-4 text-sm leading-relaxed text-muted-foreground">
          {row.whyThisBranch}
        </blockquote>
      )}
      {row.notes && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{row.notes}</p>
      )}

      {/* Every commitment was required to submit, so this is a reminder of
          what they agreed to rather than a checklist with gaps in it. */}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        All commitments confirmed (wording {row.requirementsVersion})
      </p>
    </article>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd
        className={`flex items-center gap-1.5 font-medium ${
          tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : ''
        }`}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}
