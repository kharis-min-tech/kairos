'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@kairos/ui';
import { useMembers } from '@/hooks/use-members';
import { useSessions } from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import type { NewBelieverSession } from '@kairos/types';
import { CreateSessionDialog } from './_components/create-session-dialog';
import { ProgramHealthStrip } from './_components/program-health-strip';
import { SessionDetailPane } from './_components/session-detail-pane';
import { SessionListItem } from './_components/session-list-item';
import {
  formatShortSessionDate,
  formatSessionTime,
  isUpcomingSession,
} from './_components/session-helpers';

export default function SessionsPage() {
  const { user, activeRole } = useAuthStore();
  const branchId = user?.homeBranchId ?? '';
  const userMemberId = user?.id ?? '';
  const userRole = activeRole ?? 'member';
  // RBAC Phase 4c: pastor/leader are gone; Phase 5 will replace this with a
  // capability check. For now, gate on admin only — non-admins fall back to
  // the read-only session list (server-side checks still allow grant holders).
  const canManageSessions = userRole === 'admin';

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sessionData, isLoading } = useSessions(branchId ? { branchId } : undefined);
  const { data: memberData } = useMembers(
    branchId ? { branchId, limit: 500 } : undefined,
  );

  const sessions = useMemo(() => sessionData ?? [], [sessionData]);
  const teacherOptions = useMemo(
    () =>
      (memberData?.data ?? []).map((member) => ({
        value: member.id,
        label: `${member.firstName} ${member.lastName}`,
      })),
    [memberData?.data],
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter((session) => isUpcomingSession(session.sessionDate))
        .sort(
          (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime(),
        ),
    [sessions],
  );
  const past = useMemo(
    () =>
      sessions
        .filter((session) => !isUpcomingSession(session.sessionDate))
        .sort(
          (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
        ),
    [sessions],
  );

  const nextSession = upcoming[0];

  // Default selection follows: next-upcoming → most-recent-past → none.
  useEffect(() => {
    if (selectedId && sessions.some((session) => session.id === selectedId)) return;
    const fallback = upcoming[0] ?? past[0];
    if (fallback) setSelectedId(fallback.id);
  }, [selectedId, sessions, upcoming, past]);

  const selectedSession: NewBelieverSession | undefined = sessions.find(
    (session) => session.id === selectedId,
  );

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link
            href="/new-believers"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            New Believers
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em]">New Believers Sessions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {sessions.length} session{sessions.length === 1 ? '' : 's'}
              {nextSession && (
                <>
                  {' · '}
                  <span className="font-medium text-foreground">
                    Next: {formatShortSessionDate(nextSession.sessionDate)} ·{' '}
                    {formatSessionTime(nextSession.sessionDate)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {canManageSessions && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        )}
      </div>

      <ProgramHealthStrip branchId={branchId || undefined} />

      {isLoading ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Loading sessions...
        </p>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No sessions scheduled yet.
          </p>
          {canManageSessions && (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[320px_1fr]">
          <aside aria-label="Sessions list" className="space-y-5">
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Upcoming ({upcoming.length})
                </h2>
                <div className="space-y-1.5">
                  {upcoming.map((session) => (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      isSelected={session.id === selectedId}
                      onSelect={() => setSelectedId(session.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Past ({past.length})
                </h2>
                <div className="space-y-1.5">
                  {past.map((session) => (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      isSelected={session.id === selectedId}
                      onSelect={() => setSelectedId(session.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </aside>

          <main>
            {selectedSession ? (
              <SessionDetailPane
                session={selectedSession}
                branchId={branchId}
                userMemberId={userMemberId}
                userRole={userRole}
              />
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select a session to see details.
              </div>
            )}
          </main>
        </div>
      )}

      {branchId && (
        <CreateSessionDialog
          branchId={branchId}
          teacherOptions={teacherOptions}
          open={showCreate}
          onOpenChange={setShowCreate}
        />
      )}
    </div>
  );
}
