'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Check, AlertTriangle, Award } from 'lucide-react';
import { useEnrollment, useUpdateEnrollment } from '@/hooks/use-new-believers';
import { useMembers } from '@/hooks/use-members';
import { useDepartments } from '@/hooks/use-departments';
import { useAuthStore } from '@/lib/auth-store';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomSelect,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kairos/ui';
import type { NewBelieverStageValue, UpdateEnrollmentRequest } from '@kairos/types';

import {
  STAGES,
  SESSION_STAGE_VALUES,
  getStageByValue,
  getNextStage,
} from '../_components/stage-config';
import type { EnrollmentDetail, AttendanceLogItem } from '../_components/types';

export default function EnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const canEdit = isAdminOrPastor || activeRole === 'leader';

  const { data, isLoading, error } = useEnrollment(id);
  const enrollment = data as EnrollmentDetail | undefined;
  const updateEnrollment = useUpdateEnrollment();

  const { data: memberData } = useMembers(
    user?.homeBranchId ? { branchId: user.homeBranchId, limit: 200 } : undefined,
  );
  const branchMembers = memberData?.data ?? [];

  // Fetch branch departments for the "Joined a Department" picker
  const { data: deptData } = useDepartments(
    enrollment?.branchId ? { branchId: enrollment.branchId } : undefined,
  );
  type DeptRow = { id: string; departmentName: string };
  const branchDepartments: DeptRow[] = ((): DeptRow[] => {
    if (!deptData) return [];
    // The branch-departments list response is paginated; defensively unwrap.
    const raw = Array.isArray(deptData)
      ? deptData
      : ((deptData as { data?: unknown }).data as unknown[] | undefined) ?? [];
    return (raw as Array<{ id: string; departmentName: string }>).map((d) => ({
      id: d.id,
      departmentName: d.departmentName,
    }));
  })();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEnrollmentRequest>({});

  const [showJoinDeptModal, setShowJoinDeptModal] = useState(false);
  const [joinDeptId, setJoinDeptId] = useState('');

  const [showMarkCompleteModal, setShowMarkCompleteModal] = useState(false);
  const [markCompleteFeedback, setMarkCompleteFeedback] = useState('');
  const [markCompleteShouldAdvance, setMarkCompleteShouldAdvance] = useState(false);

  function startEdit() {
    if (!enrollment) return;
    setEditForm({
      stage: enrollment.stage,
      teacherId: enrollment.teacherId ?? undefined,
      mentorId: enrollment.mentorId ?? undefined,
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
    setMarkCompleteShouldAdvance(false);
    setShowMarkCompleteModal(true);
  }

  async function handleConfirmMarkComplete() {
    if (!enrollment) return;
    const currentStage = enrollment.stage;
    const existingSca = (enrollment.sessionCompletedAt ?? {}) as Record<string, string>;
    const existingSf = enrollment.sessionFeedback ?? {};
    try {
      await updateEnrollment.mutateAsync({
        id,
        data: updateData,
      });
      toast.success(
        nextStage
          ? `Session completed and advanced to ${nextStage.label}`
          : 'Session marked as completed',
      );
      setShowMarkCompleteModal(false);
      setMarkCompleteFeedback('');
      setMarkCompleteShouldAdvance(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark session complete');
    }
  }

  async function handleAdvanceStage() {
    if (!enrollment) return;
    const nextStage = getNextStage(enrollment.stage);
    if (!nextStage) return;

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
        data: { stage: 'integrated', joinedDepartmentId: joinDeptId || null },
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
        <p className="text-muted-foreground">Loading enrollment...</p>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Enrollment not found.</p>
        <Link href="/new-believers" className="mt-2 inline-flex items-center gap-1 text-sm text-[#5D3FD3] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to New Believers
        </Link>
      </div>
    );
  }

  const stage = getStageByValue(enrollment.stage);
  const currentStageIdx = STAGES.findIndex((s) => s.value === enrollment.stage);
  const nextStage = getNextStage(enrollment.stage);
  const canAdvance = currentStageIdx < STAGES.length - 1;
  const isSessionStage = SESSION_STAGE_VALUES.has(enrollment.stage as NewBelieverStageValue);
  const sessionCompletedAt = (enrollment.sessionCompletedAt ?? {}) as Record<string, string>;
  const sessionFeedback = (enrollment.sessionFeedback ?? {}) as Record<string, string>;
  const currentSessionFeedback = sessionFeedback[enrollment.stage]?.trim();
  const currentSessionDone =
    isSessionStage && !!sessionCompletedAt[enrollment.stage] && !!currentSessionFeedback;
  const memberOptions = branchMembers.map((m) => ({
    value: m.id,
    label: `${m.firstName} ${m.lastName}`,
  }));

  const attendanceHistory: AttendanceLogItem[] = enrollment.attendanceHistory ?? [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Link
        href="/new-believers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> New Believers
      </Link>

      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">
          {enrollment.memberFirstName} {enrollment.memberLastName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            <span
              className={`inline-block h-2 w-2 rounded-full ${stage?.dotColor ?? 'bg-slate-400'}`}
              aria-hidden
            />
            {stage?.label ?? enrollment.stage}
          </span>
          {isSessionStage && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                currentSessionDone
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-[#f8b537]/20 text-[#f8b537]'
              }`}
            >
              {currentSessionDone ? 'Session Completed' : 'Session In Progress'}
            </span>
          )}
          {enrollment.teacherFirstName && (
            <span className="text-muted-foreground">
              Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName}
            </span>
          )}
          {enrollment.mentorFirstName && (
            <span className="text-muted-foreground">
              Mentor: {enrollment.mentorFirstName} {enrollment.mentorLastName}
            </span>
          )}
          <span className="text-muted-foreground">
            Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
          </span>
        </div>
      </header>

      {/* Stage progress bar */}
      <div>
        <div className="flex items-center gap-1">
          {STAGES.map((s, idx) => (
            <div
              key={s.value}
              className={`h-2 flex-1 rounded-full transition-colors ${
                idx <= currentStageIdx ? 'bg-[#5D3FD3]' : 'bg-foreground/10'
              }`}
              title={s.label}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Session 1</span>
          <span>Joined a Department</span>
        </div>
      </div>

      {/* Teacher-as-student warning */}
      {enrollment.memberId === enrollment.teacherId && (
        <div className="flex items-start gap-3 rounded-lg border border-[#f8b537]/40 bg-[#f8b537]/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f8b537]" />
          <div>
            <p className="text-sm font-semibold text-[#f8b537]">
              Member enrolled as their own teacher
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#f8b537]">
              {enrollment.memberFirstName} {enrollment.memberLastName} is assigned as both the
              student and the teacher on this enrolment. Please reassign the teacher using Edit.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canEdit && !isEditing && (
        <div className="flex flex-wrap gap-2">
          {isSessionStage && !currentSessionDone && (
            <Button
              variant="outline"
              onClick={handleMarkComplete}
              disabled={updateEnrollment.isPending}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              <Check className="mr-1.5 h-4 w-4" /> Mark Session Complete
            </Button>
          )}
          {canAdvance && enrollment.stage !== 'integrated' && nextStage && (
            <Button
              onClick={handleAdvanceStage}
              disabled={updateEnrollment.isPending}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              Advance to {nextStage.label}
            </Button>
          )}
          <Button variant="outline" onClick={startEdit}>
            Edit
          </Button>
          {isAdminOrPastor && (
            <Button
              variant="outline"
              onClick={handleDeactivate}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Deactivate
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Stage</label>
                  <CustomSelect
                    value={(editForm.stage ?? enrollment.stage) as string}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, stage: v as NewBelieverStageValue }))
                    }
                    options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
                  />
                  <p className="mt-1 text-xs font-medium text-[#f8b537]">
                    Changing stage manually bypasses session-complete checks — use with care.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Assign Teacher</label>
                  <CustomSelect
                    value={editForm.teacherId ?? ''}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, teacherId: v || null }))
                    }
                    options={memberOptions}
                    placeholder="Unassigned"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Assign Mentor</label>
                  <CustomSelect
                    value={editForm.mentorId ?? ''}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, mentorId: v || null }))
                    }
                    options={memberOptions}
                    placeholder="Unassigned"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Notes</label>
                  <Textarea
                    rows={3}
                    value={editForm.notes ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateEnrollment.isPending}
                    className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
                  >
                    {updateEnrollment.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
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
                    <dd className="font-medium">{stage?.label ?? enrollment.stage}</dd>
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
                    <dt className="text-muted-foreground">Mentor</dt>
                    <dd className="font-medium">
                      {enrollment.mentorFirstName
                        ? `${enrollment.mentorFirstName} ${enrollment.mentorLastName}`
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
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Department</dt>
                    <dd className="font-medium">
                      {enrollment.stage !== 'integrated' ? (
                        <span className="italic text-muted-foreground">
                          Not yet integrated into a department
                        </span>
                      ) : enrollment.joinedDepartmentId ? (
                        branchDepartments.find((d) => d.id === enrollment.joinedDepartmentId)
                          ?.departmentName ?? enrollment.joinedDepartmentId
                      ) : (
                        <span className="italic text-muted-foreground">
                          Integrated — department not recorded
                        </span>
                      )}
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
                  const isIntegrated = s.value === 'integrated';
                  const sessionDone =
                    SESSION_STAGE_VALUES.has(s.value) && !!sessionCompletedAt[s.value];
                  return (
                    <li key={s.value} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent && isIntegrated
                              ? 'bg-[#f8b537] text-white'
                              : isCurrent
                                ? 'bg-[#5D3FD3] text-white'
                                : 'bg-foreground/10 text-muted-foreground'
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : isCurrent && isIntegrated ? (
                          <Award className="h-3 w-3" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <span
                          className={`text-sm ${
                            isCurrent
                              ? 'font-semibold text-[#5D3FD3]'
                              : isDone
                                ? 'text-muted-foreground line-through'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {s.label}
                        </span>
                        {isCurrent && SESSION_STAGE_VALUES.has(s.value) && (
                          <span
                            className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                              sessionDone
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : 'bg-[#f8b537]/20 text-[#f8b537]'
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

      {/* Mark Session Complete dialog */}
      <Dialog
        open={showMarkCompleteModal}
        onOpenChange={(openMarkCompleteDialog) => {
          setShowMarkCompleteModal(openMarkCompleteDialog);
          if (!openMarkCompleteDialog) {
            setMarkCompleteFeedback('');
            setMarkCompleteShouldAdvance(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {markCompleteShouldAdvance ? 'Session Feedback Required' : 'Mark Session Complete'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {markCompleteShouldAdvance
                ? `Record feedback before moving to ${nextStage?.label ?? 'the next stage'}.`
                : 'Record feedback for this session before marking it complete.'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Session Feedback <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={4}
              placeholder="How did the session go? Any observations about the student's progress?"
              value={markCompleteFeedback}
              onChange={(e) => setMarkCompleteFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMarkCompleteModal(false);
                setMarkCompleteFeedback('');
                setMarkCompleteShouldAdvance(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!markCompleteFeedback.trim() || updateEnrollment.isPending}
              onClick={handleConfirmMarkComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updateEnrollment.isPending
                ? 'Saving...'
                : markCompleteShouldAdvance
                  ? 'Confirm & Advance'
                  : 'Confirm & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Joined a Department dialog */}
      <Dialog open={showJoinDeptModal} onOpenChange={setShowJoinDeptModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Joined a Department</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Optionally link this member to a department. You can skip this step.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            {branchDepartments.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No departments configured for this branch yet. Departments are set up in the
                Recruitment workflow.
              </p>
            ) : (
              <CustomSelect
                value={joinDeptId}
                onValueChange={setJoinDeptId}
                options={branchDepartments.map((d) => ({
                  value: d.id,
                  label: d.departmentName,
                }))}
                placeholder="Skip — not specified"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDeptModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmJoinDept}
              disabled={updateEnrollment.isPending}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              {updateEnrollment.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
