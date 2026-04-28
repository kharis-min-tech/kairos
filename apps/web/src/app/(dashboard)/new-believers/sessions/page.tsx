'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  useSessions,
  useCreateSession,
  useSessionAttendance,
  useRecordSessionAttendance,
  useUpdateSession,
  useEnrollments,
} from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import type { CreateNewBelieverSessionRequest } from '@kairos/types';

// --------------------------------------------------------------------------
// Session row — expands to show attendance recorder
// --------------------------------------------------------------------------
function SessionRow({
  session,
  branchId,
  userMemberId,
  userRole,
}: {
  session: {
    id: string;
    sessionDate: string | Date;
    topic: string;
    teacherId?: string | null;
    feedback?: string | null;
    teacherFirstName?: string | null;
    teacherLastName?: string | null;
  };
  branchId: string;
  userMemberId: string;
  userRole: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: attendance } = useSessionAttendance(expanded ? session.id : '');
  const recordAttendance = useRecordSessionAttendance();
  const updateSession = useUpdateSession();

  // Local toggle state keyed by enrollmentId
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState(session.feedback ?? '');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const isTeacherOfSession = !!session.teacherId && session.teacherId === userMemberId;
  const canEditFeedback = isTeacherOfSession;
  const canViewFeedback =
    isTeacherOfSession || ['admin', 'pastor', 'leader'].includes(userRole);

  async function handleSaveFeedback() {
    try {
      await updateSession.mutateAsync({ id: session.id, data: { feedback: feedbackText } });
      toast.success('Feedback saved');
      setFeedbackSaved(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save feedback');
    }
  }

  const rows = attendance ?? [];

  // Initialize toggles from server when first loaded
  function getAttended(enrollmentId: string): boolean {
    if (enrollmentId in toggles) return toggles[enrollmentId] ?? false;
    const existing = rows.find((r) => r.enrollmentId === enrollmentId);
    return existing?.attended ?? false;
  }

  async function handleSaveAttendance() {
    const records = rows.map((r) => ({
      enrollmentId: r.enrollmentId,
      attended: getAttended(r.enrollmentId),
    }));
    try {
      await recordAttendance.mutateAsync({ sessionId: session.id, data: { records } });
      toast.success('Attendance saved');
      setSaved(true);
      setToggles({});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
    }
  }

  // Fetch enrolled members for this branch so we can show anyone not yet in attendance
  const { data: enrollmentData } = useEnrollments(
    expanded ? { branchId, stage: undefined } : undefined
  );
  const enrolled = enrollmentData?.data ?? [];

  // Merge rows: prefer server rows, supplement with enrollments that have no row yet
  const mergedRows: Array<{
    enrollmentId: string;
    memberFirstName: string;
    memberLastName: string;
    attended: boolean;
  }> = rows.length > 0
    ? rows
    : enrolled
        .filter((e) => e.isActive)
        .map((e) => ({
          enrollmentId: e.id,
          memberFirstName: e.memberFirstName,
          memberLastName: e.memberLastName,
          attended: false,
        }));

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="font-medium">{session.topic}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(session.sessionDate).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            {session.teacherFirstName && (
              <> · {session.teacherFirstName} {session.teacherLastName}</>
            )}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? '▲ hide' : '▼ attendance'}</span>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          {mergedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrolled members.</p>
          ) : (
            <>
              <div className="mb-3 space-y-2">
                {mergedRows.map((r) => (
                  <div key={r.enrollmentId} className="flex items-center justify-between">
                    <span className="text-sm">
                      {r.memberFirstName} {r.memberLastName}
                    </span>
                    <button
                      onClick={() =>
                        setToggles((t) => ({
                          ...t,
                          [r.enrollmentId]: !getAttended(r.enrollmentId),
                        }))
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        getAttended(r.enrollmentId)
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {getAttended(r.enrollmentId) ? '✓ Present' : 'Absent'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveAttendance}
                  disabled={recordAttendance.isPending}
                  className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
                >
                  {recordAttendance.isPending ? 'Saving…' : 'Save Attendance'}
                </button>
                {saved && (
                  <span className="text-xs text-emerald-600">✓ Saved</span>
                )}
              </div>

              {/* Teacher Feedback */}
              {canViewFeedback && (
                <div className="mt-4 border-t pt-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Teacher Feedback
                  </p>
                  {canEditFeedback ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        placeholder="Add session feedback…"
                        value={feedbackText}
                        onChange={(e) => {
                          setFeedbackText(e.target.value);
                          setFeedbackSaved(false);
                        }}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveFeedback}
                          disabled={updateSession.isPending}
                          className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
                        >
                          {updateSession.isPending ? 'Saving…' : 'Save Feedback'}
                        </button>
                        {feedbackSaved && (
                          <span className="text-xs text-emerald-600">✓ Saved</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {session.feedback ?? (
                        <span className="italic text-muted-foreground">No feedback recorded yet.</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Create Session Dialog
// --------------------------------------------------------------------------
function CreateSessionDialog({
  branchId,
  onClose,
}: {
  branchId: string;
  onClose: () => void;
}) {
  const createSession = useCreateSession();
  const [form, setForm] = useState<CreateNewBelieverSessionRequest>({
    branchId,
    sessionDate: new Date().toISOString().slice(0, 10),
    topic: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createSession.mutateAsync(form);
      toast.success('Session created');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create session');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100"
      >
        <h2 className="mb-4 text-lg font-semibold">New Session</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={form.sessionDate}
              onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Topic</label>
            <input
              type="text"
              required
              placeholder="e.g. Foundations of Faith"
              className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Feedback <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={form.feedback ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value || undefined }))}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSession.isPending}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
          >
            {createSession.isPending ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------
export default function SessionsPage() {
  const { user, activeRole } = useAuthStore();
  const branchId = user?.homeBranchId ?? '';
  const userMemberId = user?.id ?? '';
  const userRole = activeRole ?? 'member';

  const { data: sessionData, isLoading } = useSessions(branchId ? { branchId } : undefined);
  const sessions = sessionData ?? [];

  const [showCreate, setShowCreate] = useState(false);

  const upcoming = sessions.filter(
    (s) => new Date(s.sessionDate) >= new Date(new Date().toDateString())
  );
  const past = sessions.filter(
    (s) => new Date(s.sessionDate) < new Date(new Date().toDateString())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <p className="text-sm text-purple-200">New Believers</p>
        <h1 className="mt-1 text-2xl font-bold">Sessions</h1>
        <p className="mt-1 text-sm text-purple-200">
          Record attendance and manage discipleship sessions.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sessions.length} sessions total</p>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800"
        >
          + New Session
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((s) => (
              <SessionRow key={s.id} session={s} branchId={branchId} userMemberId={userMemberId} userRole={userRole} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Past
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.map((s) => (
              <SessionRow key={s.id} session={s} branchId={branchId} userMemberId={userMemberId} userRole={userRole} />
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-purple-700 hover:underline"
          >
            Create your first session →
          </button>
        </div>
      )}

      {showCreate && branchId && (
        <CreateSessionDialog branchId={branchId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
