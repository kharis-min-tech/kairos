'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useEnrollment, useUpdateEnrollment } from '@/hooks/use-new-believers';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import type { NewBelieverStageValue, UpdateEnrollmentRequest } from '@kairos/types';

const STAGES: { value: NewBelieverStageValue; label: string }[] = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'session-1', label: 'Session 1' },
  { value: 'session-2', label: 'Session 2' },
  { value: 'session-3', label: 'Session 3' },
  { value: 'session-4', label: 'Session 4' },
  { value: 'completed', label: 'Completed' },
  { value: 'integrated', label: 'Joined a Department' },
];

const STAGE_COLORS: Record<NewBelieverStageValue, string> = {
  enrolled: 'bg-slate-100 text-slate-700',
  'session-1': 'bg-blue-100 text-blue-700',
  'session-2': 'bg-indigo-100 text-indigo-700',
  'session-3': 'bg-purple-100 text-purple-700',
  'session-4': 'bg-violet-100 text-violet-700',
  completed: 'bg-emerald-100 text-emerald-700',
  integrated: 'bg-amber-100 text-amber-700',
};

const SESSION_STAGES: NewBelieverStageValue[] = ['session-1', 'session-2', 'session-3', 'session-4'];

const MOCK_DEPARTMENTS = [
  { id: 'mock-choir', departmentName: 'Choir' },
  { id: 'mock-ushers', departmentName: 'Ushers' },
  { id: 'mock-media', departmentName: 'Media Team' },
];

export default function EnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const canEdit = isAdminOrPastor || activeRole === 'leader';

  const { data: enrollment, isLoading, error } = useEnrollment(id);
  const updateEnrollment = useUpdateEnrollment();

  const { data: memberData } = useMembers(
    user?.homeBranchId ? { branchId: user.homeBranchId, limit: 200 } : undefined,
  );
  const branchMembers = memberData?.data ?? [];

  // Fetch branch departments for the "Joined a Department" picker
  const { data: deptData } = useQuery({
    queryKey: ['departments', user?.homeBranchId],
    queryFn: async () => {
      const res = await api.departments.list({ branchId: user!.homeBranchId! });
      return res.data ?? [];
    },
    enabled: !!user?.homeBranchId,
  });
  const branchDepartments: { id: string; departmentName: string }[] =
    deptData && deptData.length > 0 ? deptData : MOCK_DEPARTMENTS;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEnrollmentRequest>({});

  // State for "Joined a Department" advance modal
  const [showJoinDeptModal, setShowJoinDeptModal] = useState(false);
  const [joinDeptId, setJoinDeptId] = useState('');

  // State for "Mark Session Complete" modal — feedback is required before marking
  const [showMarkCompleteModal, setShowMarkCompleteModal] = useState(false);
  const [markCompleteFeedback, setMarkCompleteFeedback] = useState('');

  function startEdit() {
    if (!enrollment) return;
    setEditForm({
      stage: enrollment.stage,
      teacherId: enrollment.teacherId ?? undefined,
      mentorId: (enrollment as { mentorId?: string | null }).mentorId ?? undefined,
      notes: enrollment.notes ?? undefined,
    });
    setIsEditing(true);
  }

  async function handleSave() {
    try {
      await updateEnrollment.mutateAsync({ id, data: editForm });
      toast.success('Enrollment updated');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update enrollment');
    }
  }

  function handleMarkComplete() {
    setMarkCompleteFeedback('');
    setShowMarkCompleteModal(true);
  }

  async function handleConfirmMarkComplete() {
    if (!enrollment) return;
    const currentStage = enrollment.stage;
    const existingSca = (enrollment.sessionCompletedAt ?? {}) as Record<string, string>;
    const existingSf = ((enrollment as unknown as Record<string, unknown>).sessionFeedback ?? {}) as Record<string, string>;
    try {
      await updateEnrollment.mutateAsync({
        id,
        data: {
          sessionCompletedAt: { ...existingSca, [currentStage]: new Date().toISOString() },
          sessionFeedback: { ...existingSf, [currentStage]: markCompleteFeedback.trim() },
        },
      });
      toast.success('Session marked as completed');
      setShowMarkCompleteModal(false);
      setMarkCompleteFeedback('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark session complete');
    }
  }

  async function handleAdvanceStage() {
    if (!enrollment) return;
    const currentIdx = STAGES.findIndex((s) => s.value === enrollment.stage);
    const nextStage = STAGES[currentIdx + 1];
    if (!nextStage) return;

    // If advancing to 'integrated', show the department picker modal
    if (nextStage.value === 'integrated') {
      setJoinDeptId('');
      setShowJoinDeptModal(true);
      return;
    }

    try {
      await updateEnrollment.mutateAsync({ id, data: { stage: nextStage.value } });
      toast.success(`Stage advanced to ${nextStage.label}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance stage');
    }
  }

  async function handleConfirmJoinDept() {
    try {
      await updateEnrollment.mutateAsync({
        id,
        data: {
          stage: 'integrated',
          joinedDepartmentId: joinDeptId || null,
        },
      });
      toast.success('Stage advanced to Joined a Department');
      setShowJoinDeptModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance stage');
    }
  }

  async function handleDeactivate() {
    if (!confirm('Are you sure you want to deactivate this enrollment?')) return;
    try {
      await updateEnrollment.mutateAsync({ id, data: { isActive: false } });
      toast.success('Enrollment deactivated');
      router.push('/new-believers');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading enrollment…</p>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Enrollment not found.</p>
        <Link href="/new-believers" className="mt-2 inline-block text-sm text-purple-700 hover:underline">
          ← Back to New Believers
        </Link>
      </div>
    );
  }

  const currentStageIdx = STAGES.findIndex((s) => s.value === enrollment.stage);
  const canAdvance = currentStageIdx < STAGES.length - 1;
  const stageColor = STAGE_COLORS[enrollment.stage as NewBelieverStageValue] ?? 'bg-gray-100 text-gray-700';

  const isSessionStage = SESSION_STAGES.includes(enrollment.stage as NewBelieverStageValue);
  const sessionCompletedAt = (enrollment.sessionCompletedAt ?? {}) as Record<string, string>;
  const currentSessionDone = isSessionStage && !!sessionCompletedAt[enrollment.stage];

  type AttendanceHistoryItem = {
    sessionId: string;
    sessionDate: string | Date;
    topic?: string | null;
    attended: boolean;
    notes?: string | null;
  };
  const attendanceHistory: AttendanceHistoryItem[] =
    ((enrollment as unknown as Record<string, unknown>).attendanceHistory as AttendanceHistoryItem[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      {/* Purple header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <Link href="/new-believers" className="mb-3 inline-block text-sm text-purple-200 hover:text-white">
          ← New Believers
        </Link>
        <h1 className="text-2xl font-bold">
          {enrollment.memberFirstName} {enrollment.memberLastName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageColor}`}>
            {STAGES.find((s) => s.value === enrollment.stage)?.label ?? enrollment.stage}
          </span>
          {/* Session completion status pill */}
          {isSessionStage && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                currentSessionDone
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              }`}
            >
              {currentSessionDone ? '\u2713 Completed' : 'In Progress'}
            </span>
          )}
          {enrollment.teacherFirstName && (
            <span className="text-sm text-purple-200">
              Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName}
            </span>
          )}
          {enrollment.mentorFirstName && (
            <span className="text-sm text-purple-200">
              Mentor: {enrollment.mentorFirstName} {enrollment.mentorLastName}
            </span>
          )}
          <span className="text-sm text-purple-200">
            Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="flex items-center gap-1">
        {STAGES.map((s, idx) => (
          <div
            key={s.value}
            className={`h-2 flex-1 rounded-full transition-colors ${
              idx <= currentStageIdx ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            title={s.label}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Enrolled</span>
        <span>Joined a Department</span>
      </div>

      {/* Teacher-as-student warning */}
      {enrollment.memberId === enrollment.teacherId && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/40">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Member enrolled as their own teacher
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              {enrollment.memberFirstName} {enrollment.memberLastName} is assigned as both the student and the teacher on this enrolment. Please reassign the teacher using Edit.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canEdit && !isEditing && (
        <div className="flex flex-wrap gap-2">
          {/* Mark Complete — only for session stages not yet marked */}
          {isSessionStage && !currentSessionDone && (
            <button
              onClick={handleMarkComplete}
              disabled={updateEnrollment.isPending}
              className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              ✓ Mark Session Complete
            </button>
          )}
          {canAdvance && enrollment.stage !== 'integrated' && (
            <button
              onClick={handleAdvanceStage}
              disabled={updateEnrollment.isPending}
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
            >
              Advance to {STAGES[currentStageIdx + 1]?.label}
            </button>
          )}
          <button
            onClick={startEdit}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Edit
          </button>
          {isAdminOrPastor && (
            <button
              onClick={handleDeactivate}
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Deactivate
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details card */}
        <div className="space-y-4 lg:col-span-2">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Stage</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={editForm.stage ?? enrollment.stage}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, stage: e.target.value as NewBelieverStageValue }))
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Assign Teacher</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={editForm.teacherId ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, teacherId: e.target.value || null }))
                    }
                  >
                    <option value="">— unassigned —</option>
                    {branchMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Assign Mentor</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={editForm.mentorId ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, mentorId: e.target.value || null }))
                    }
                  >
                    <option value="">— unassigned —</option>
                    {branchMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Notes</label>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    rows={3}
                    value={editForm.notes ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateEnrollment.isPending}
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    {updateEnrollment.isPending ? 'Saving\u2026' : 'Save Changes'}
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Stage</dt>
                    <dd className="font-medium">
                      {STAGES.find((s) => s.value === enrollment.stage)?.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Enrolled On</dt>
                    <dd className="font-medium">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Teacher</dt>
                    <dd className="font-medium">
                      {enrollment.teacherFirstName
                        ? `${enrollment.teacherFirstName} ${enrollment.teacherLastName}`
                        : '\u2014'}
                    </dd>
                  </div>
                  <div>                    <dt className="text-muted-foreground">Mentor</dt>
                    <dd className="font-medium">
                      {enrollment.mentorFirstName
                        ? `${enrollment.mentorFirstName} ${enrollment.mentorLastName}`
                        : '—'}
                    </dd>
                  </div>
                  <div>                    <dt className="text-muted-foreground">Completed On</dt>
                    <dd className="font-medium">
                      {enrollment.completedAt
                        ? new Date(enrollment.completedAt).toLocaleDateString()
                        : '\u2014'}
                    </dd>
                  </div>
                  {enrollment.joinedDepartmentId && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Department Joined</dt>
                      <dd className="font-medium">
                        {branchDepartments.find((d) => d.id === enrollment.joinedDepartmentId)?.departmentName ?? enrollment.joinedDepartmentId}
                      </dd>
                    </div>
                  )}
                  {enrollment.notes && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="font-medium">{enrollment.notes}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Session attendance history */}
          {attendanceHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Session Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendanceHistory.map((a) => (
                    <div
                      key={a.sessionId}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{a.topic ?? 'Session'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.sessionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.attended
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {a.attended ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar \u2014 stage journey */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {STAGES.map((s, idx) => {
                  const isDone = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  const sessionDone = SESSION_STAGES.includes(s.value) && !!sessionCompletedAt[s.value];
                  return (
                    <li key={s.value} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                              ? 'bg-purple-700 text-white'
                              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {isDone ? '\u2713' : idx + 1}
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <span
                          className={`text-sm ${isCurrent ? 'font-semibold text-purple-700' : isDone ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}
                        >
                          {s.label}
                        </span>
                        {isCurrent && SESSION_STAGES.includes(s.value) && (
                          <span
                            className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                              sessionDone
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300'
                            }`}
                          >
                            {sessionDone ? 'Done' : 'Active'}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mark Session Complete modal — feedback required */}
      {showMarkCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-1 text-lg font-semibold">Mark Session Complete</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Record feedback for this session before marking it complete.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Session Feedback <span className="text-destructive">*</span>
              </label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                rows={4}
                placeholder="How did the session go? Any observations about the student’s progress?"
                value={markCompleteFeedback}
                onChange={(e) => setMarkCompleteFeedback(e.target.value)}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowMarkCompleteModal(false); setMarkCompleteFeedback(''); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={!markCompleteFeedback.trim() || updateEnrollment.isPending}
                onClick={handleConfirmMarkComplete}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateEnrollment.isPending ? 'Saving…' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Joined a Department" advance modal */}
      {showJoinDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-1 text-lg font-semibold">Joined a Department</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Optionally link this member to a department. You can skip this step.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Department</label>
                {branchDepartments.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    No departments configured for this branch yet. Departments are set up in the Recruitment workflow.
                  </p>
                ) : (
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={joinDeptId}
                    onChange={(e) => setJoinDeptId(e.target.value)}
                  >
                    <option value="">— skip / not specified —</option>
                    {branchDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowJoinDeptModal(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoinDept}
                disabled={updateEnrollment.isPending}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
              >
                {updateEnrollment.isPending ? 'Saving\u2026' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
