'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useEnrollment, useUpdateEnrollment } from '@/hooks/use-new-believers';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import type { NewBelieverStageValue, UpdateEnrollmentRequest } from '@kairos/types';

const STAGES: { value: NewBelieverStageValue; label: string }[] = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'session-1', label: 'Session 1' },
  { value: 'session-2', label: 'Session 2' },
  { value: 'session-3', label: 'Session 3' },
  { value: 'session-4', label: 'Session 4' },
  { value: 'completed', label: 'Completed' },
  { value: 'integrated', label: 'Integrated' },
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

export default function EnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const canEdit = isAdminOrPastor || activeRole === 'leader';

  const { data: enrollment, isLoading, error } = useEnrollment(id);
  const updateEnrollment = useUpdateEnrollment();

  const { data: memberData } = useMembers(
    user?.homeBranchId ? { branchId: user.homeBranchId, limit: 200 } : undefined
  );
  const branchMembers = memberData?.data ?? [];

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEnrollmentRequest>({});

  function startEdit() {
    if (!enrollment) return;
    setEditForm({
      stage: enrollment.stage,
      teacherId: enrollment.teacherId ?? undefined,
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

  async function handleAdvanceStage() {
    if (!enrollment) return;
    const currentIdx = STAGES.findIndex((s) => s.value === enrollment.stage);
    const nextStage = STAGES[currentIdx + 1];
    if (!nextStage) return;
    try {
      await updateEnrollment.mutateAsync({ id, data: { stage: nextStage.value } });
      toast.success(`Stage advanced to ${nextStage.label}`);
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
        <Link
          href="/new-believers"
          className="mb-3 inline-block text-sm text-purple-200 hover:text-white"
        >
          ← New Believers
        </Link>
        <h1 className="text-2xl font-bold">
          {enrollment.memberFirstName} {enrollment.memberLastName}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageColor}`}>
            {STAGES.find((s) => s.value === enrollment.stage)?.label ?? enrollment.stage}
          </span>
          {enrollment.teacherFirstName && (
            <span className="text-sm text-purple-200">
              Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName}
            </span>
          )}
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="flex items-center gap-1">
        {STAGES.map((s, idx) => (
          <div
            key={s.value}
            className={`h-2 flex-1 rounded-full transition-colors ${
              idx <= currentStageIdx ? 'bg-purple-600' : 'bg-gray-200'
            }`}
            title={s.label}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Enrolled</span>
        <span>Integrated</span>
      </div>

      {/* Action buttons */}
      {canEdit && !isEditing && (
        <div className="flex flex-wrap gap-2">
          {canAdvance && enrollment.stage !== 'integrated' && (
            <button
              onClick={handleAdvanceStage}
              disabled={updateEnrollment.isPending}
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
            >
              Advance to{' '}
              {STAGES[currentStageIdx + 1]?.label}
            </button>
          )}
          <button
            onClick={startEdit}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
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
        <div className="lg:col-span-2 space-y-4">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Stage</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
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
                    className="w-full rounded-lg border px-3 py-2 text-sm"
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
                  <label className="mb-1 block text-sm font-medium">Notes</label>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    rows={3}
                    value={editForm.notes ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateEnrollment.isPending}
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    {updateEnrollment.isPending ? 'Saving…' : 'Save Changes'}
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
                    <dd className="font-medium capitalize">
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
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Completed On</dt>
                    <dd className="font-medium">
                      {enrollment.completedAt
                        ? new Date(enrollment.completedAt).toLocaleDateString()
                        : '—'}
                    </dd>
                  </div>
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
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
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

        {/* Sidebar — stage journey */}
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
                  return (
                    <li key={s.value} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                              ? 'bg-purple-700 text-white'
                              : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-sm ${isCurrent ? 'font-semibold text-purple-700' : isDone ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}
                      >
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
