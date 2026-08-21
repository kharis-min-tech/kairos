'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Badge, cn } from '@kairos/ui';
import { HeartHandshake, ShieldAlert, Home, Phone, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useAuthStore } from '@/lib/auth-store';
import type { ConcernInboxItem } from '@kairos/types';

type Tab = 'welfare' | 'safeguarding';

/**
 * Welfare + Safeguarding inbox (0046) — leader tool that surfaces follow-ups
 * flagged with `welfare_concern` or `safeguarding_concern`. Two tabs so a
 * branch admin who also serves as the safeguarding lead can triage both
 * without leaving the screen; a welfare-only reader still hits the safeguarding
 * tab and gets an empty list rather than a 403 shock (server-side filter drops
 * rows they can't see).
 *
 * Endpoints:
 *   GET /api/me/followups/welfare
 *   GET /api/me/followups/safeguarding
 */
export default function ConcernsInboxPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
  const branchId = user?.homeBranchId ?? null;

  const canAccess =
    caps.systemRole === 'admin' ||
    caps.has('branch:write', branchId ? { kind: 'branch', id: branchId } : undefined) ||
    caps.has(
      'safeguarding:read',
      branchId ? { kind: 'branch', id: branchId } : undefined,
    );

  const [tab, setTab] = useState<Tab>('welfare');

  useEffect(() => {
    if (!canAccess) router.replace('/dashboard');
  }, [canAccess, router]);

  const welfare = useQuery({
    queryKey: ['concerns', 'welfare'],
    enabled: canAccess && tab === 'welfare',
    queryFn: async () => (await api.me.welfareInbox()).data ?? [],
  });
  const safeguarding = useQuery({
    queryKey: ['concerns', 'safeguarding'],
    enabled: canAccess && tab === 'safeguarding',
    queryFn: async () => (await api.me.safeguardingInbox()).data ?? [],
  });

  if (!canAccess) return null;

  const active = tab === 'welfare' ? welfare : safeguarding;
  const items = active.data ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldAlert className="h-6 w-6 text-[#5D3FD3]" strokeWidth={1.75} />
          Concerns
        </h1>
        <p className="text-sm text-muted-foreground">
          Follow-ups flagged for pastoral welfare or safeguarding attention. Tap
          a card to open the member profile.
        </p>
      </div>

      <div className="flex gap-2">
        {(['welfare', 'safeguarding'] as Tab[]).map((t) => {
          const isActive = t === tab;
          const Icon = t === 'welfare' ? HeartHandshake : ShieldAlert;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-[#5D3FD3] bg-[#5D3FD3]/10 text-[#5D3FD3]'
                  : 'border-border/60 bg-transparent text-muted-foreground hover:border-[#5D3FD3]/40 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {t === 'welfare' ? 'Welfare' : 'Safeguarding'}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {tab === 'welfare'
          ? 'Follow-ups flagged as welfare concerns. Reach out to the pastoral team.'
          : 'Follow-ups flagged as safeguarding matters. Escalate to the branch safeguarding lead.'}
      </p>

      {active.isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Loading concerns…</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">
              {tab === 'welfare'
                ? 'No welfare concerns flagged. All quiet.'
                : 'No safeguarding matters flagged.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <ConcernRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConcernRow({ row }: { row: ConcernInboxItem }) {
  const isVisit = row.type === 'visit';
  const Icon = isVisit
    ? Home
    : row.methods?.includes('phone_call')
      ? Phone
      : MessageCircle;

  const dateLabel = new Date(row.contactedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const outcomeLabel = isVisit
    ? row.visitOutcome === 'present'
      ? 'Present'
      : row.visitOutcome === 'not_present'
        ? 'Not present'
        : row.visitOutcome === 'rescheduled'
          ? 'Rescheduled'
          : null
    : row.contactReached === true
      ? 'Reached'
      : row.contactReached === false
        ? 'No answer'
        : null;

  return (
    <li>
      <Link
        href={`/members/${row.memberId}`}
        className="block rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-[#5D3FD3]/40 hover:bg-muted/30"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/10 text-[#5D3FD3]">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {row.memberFirstName} {row.memberLastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {dateLabel} · {row.scopeName} · by {row.recordedByFirstName}{' '}
              {row.recordedByLastName}
            </p>
          </div>
          {outcomeLabel && (
            <span className="shrink-0 rounded-full bg-[#5D3FD3]/15 px-2 py-0.5 text-[11px] font-medium text-[#5D3FD3]">
              {outcomeLabel}
            </span>
          )}
        </div>
        {row.notes ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
            {row.notes}
          </p>
        ) : (
          <p className="mt-3 text-xs italic text-muted-foreground">
            No notes recorded on this follow-up.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {row.welfareConcern && (
            <Badge variant="secondary" className="bg-[#f8b537]/20 text-[#9a6b04] dark:text-[#f8b537]">
              Welfare
            </Badge>
          )}
          {row.safeguardingConcern && (
            <Badge variant="destructive">Safeguarding</Badge>
          )}
        </div>
      </Link>
    </li>
  );
}
