'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import type { FollowupQueueRow } from '@kairos/types';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useFirstTimerQueue, useNoGroupQueue, useDueFollowups } from '@/hooks/use-followups';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@kairos/ui';

/**
 * The follow-up surface for people who belong to no group.
 *
 * Two queues rather than one list, because they are different motions: a
 * first-timer is a welcome on a clock of hours to days, a member in no
 * fellowship or department is drifting on a clock of weeks. Same record
 * behind both — a branch-context follow-up — but mixing them would bury the
 * urgent one.
 *
 * Fellowship and department follow-ups are not here; they live on their own
 * group pages, where the context is implicit in the page you are on.
 */
type Queue = 'first-timers' | 'no-group' | 'due';

const QUEUES: Array<{ value: Queue; label: string }> = [
  { value: 'first-timers', label: 'First-timers' },
  { value: 'no-group', label: 'No group' },
  { value: 'due', label: 'Due' },
];

export default function FollowUpsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caps = useCapabilities();
  // Mirrors the server gate: these queues are branch-level work.
  const canSeeQueues = caps.has('branch:write');

  const requested = searchParams.get('queue');
  const initial: Queue = QUEUES.some((q) => q.value === requested)
    ? (requested as Queue)
    : 'first-timers';
  const [queue, setQueue] = useState<Queue>(initial);

  useEffect(() => {
    if (!canSeeQueues) router.replace('/dashboard');
  }, [canSeeQueues, router]);

  const firstTimers = useFirstTimerQueue();
  const noGroup = useNoGroupQueue();
  const due = useDueFollowups();

  if (!canSeeQueues) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People who need contact and belong to no fellowship or department. Group
          follow-ups live on each fellowship and department page.
        </p>
      </div>

      <Tabs
        value={queue}
        onValueChange={(v) => {
          setQueue(v as Queue);
          router.replace(`/follow-ups?queue=${v}`);
        }}
      >
        <TabsList aria-label="Follow-up queues">
          {QUEUES.map((q) => (
            <TabsTrigger key={q.value} value={q.value}>
              {q.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="first-timers">
          <QueueList
            rows={firstTimers.data ?? []}
            isLoading={firstTimers.isLoading}
            emptyText="No first-timers waiting on a first visit."
            showInviter
          />
        </TabsContent>

        <TabsContent value="no-group">
          <QueueList
            rows={noGroup.data ?? []}
            isLoading={noGroup.isLoading}
            emptyText="Everyone in this branch belongs to a fellowship or department."
          />
        </TabsContent>

        <TabsContent value="due">
          {due.isLoading ? (
            <Skeleton />
          ) : (due.data ?? []).length === 0 ? (
            <Empty text="Nothing due." />
          ) : (
            <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
              <div className="divide-y divide-border">
                {(due.data ?? []).map((row) => (
                  <Link
                    key={row.id}
                    href={`/members/${row.memberId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.contextKind} · due {row.nextFollowUpDate}
                      </p>
                    </div>
                    <span aria-hidden className="text-muted-foreground">
                      &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueList({
  rows,
  isLoading,
  emptyText,
  showInviter,
}: {
  rows: FollowupQueueRow[];
  isLoading: boolean;
  emptyText: string;
  showInviter?: boolean;
}) {
  if (isLoading) return <Skeleton />;
  if (rows.length === 0) return <Empty text={emptyText} />;

  return (
    <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <Link
            key={row.memberId}
            href={`/members/${row.memberId}`}
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.firstName} {row.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  row.phone ?? row.email,
                  showInviter && row.invitedByName ? `invited by ${row.invitedByName}` : null,
                  row.branchName,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span aria-hidden className="text-muted-foreground">
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-primary/20 bg-muted"
        />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 text-center shadow-ambient">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
