'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  CustomSelect,
  Textarea,
} from '@kairos/ui';
import {
  useEnrollment,
  useUpdateEnrollment,
  useRemoveEnrollment,
} from '@/hooks/use-new-believers';
import { useCapabilities } from '@/hooks/use-capabilities';
import { formatShortDate } from '@/lib/date-format';
import { STAGES, SESSION_STAGE_VALUES, getNextStage } from './stage-config';
import type { EnrollmentDetail } from './types';
import {
  NB_REMOVAL_REASONS,
  NB_REMOVAL_REASON_LABEL,
  type NewBelieverStageValue,
  type UpdateEnrollmentRequest,
  type NBRemovalReason,
} from '@kairos/types';

interface EnrollmentDetailDrawerProps {
  enrollmentId: string | null;
  onClose: () => void;
  /** Branch members available for teacher / mentor reassignment. */
  branchMembers: { id: string; firstName: string; lastName: string }[];
}

export function EnrollmentDetailDrawer({
  enrollmentId,
  onClose,
  branchMembers,
}: EnrollmentDetailDrawerProps) {
  const open = !!enrollmentId;
  const caps = useCapabilities();
  const canEdit = (caps.has('branch:write') || caps.has('fellowship:write') || caps.has('department:write'));

  const { data, isLoading } = useEnrollment(enrollmentId ?? '');
  const enrollment = data as EnrollmentDetail | undefined;
  const updateEnrollment = useUpdateEnrollment();
  const removeEnrollment = useRemoveEnrollment();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [advanceFeedback, setAdvanceFeedback] = useState('');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState<NBRemovalReason | ''>('');
  const [removeNotes, setRemoveNotes] = useState('');

  const stage = enrollment
    ? STAGES.find((s) => s.value === enrollment.stage)
    : undefined;
  const nextStage = enrollment ? getNextStage(enrollment.stage) : undefined;

  const attendanceHistory = enrollment?.attendanceHistory ?? [];

  function resetFeedbackModal() {
    setShowFeedbackModal(false);
    setAdvanceFeedback('');
  }

  function needsSessionFeedbackBeforeAdvance() {
    if (!enrollment || !SESSION_STAGE_VALUES.has(enrollment.stage as NewBelieverStageValue)) {
      return false;
    }
    const completedMap = (enrollment.sessionCompletedAt ?? {}) as Record<string, string>;
    const feedbackMap = (enrollment.sessionFeedback ?? {}) as Record<string, string>;
    return !completedMap[enrollment.stage] || !feedbackMap[enrollment.stage]?.trim();
  }

  async function commitAdvance(feedback?: string) {
    if (!enrollment || !nextStage) return false;
    const updateData: UpdateEnrollmentRequest = { stage: nextStage.value };
    const feedbackText = feedback?.trim();
    if (SESSION_STAGE_VALUES.has(enrollment.stage as NewBelieverStageValue) && feedbackText) {
      updateData.sessionCompletedAt = { [enrollment.stage]: new Date().toISOString() };
      updateData.sessionFeedback = { [enrollment.stage]: feedbackText };
    }

    try {
      await updateEnrollment.mutateAsync({
        id: enrollment.id,
        data: updateData,
      });
      toast.success(`Advanced to ${nextStage.label}`);
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance stage');
      return false;
    }
  }

  async function handleAdvance() {
    if (!enrollment || !nextStage) return;
    if (needsSessionFeedbackBeforeAdvance()) {
      const existingFeedback =
        ((enrollment.sessionFeedback ?? {}) as Record<string, string>)[enrollment.stage]?.trim() ??
        '';
      setAdvanceFeedback(existingFeedback);
      setShowFeedbackModal(true);
      return;
    }
    await commitAdvance();
  }

  async function handleConfirmAdvanceWithFeedback() {
    if (!advanceFeedback.trim()) return;
    const advanced = await commitAdvance(advanceFeedback);
    if (advanced) resetFeedbackModal();
  }

  function resetRemoveModal() {
    setShowRemoveModal(false);
    setRemoveReason('');
    setRemoveNotes('');
  }

  async function handleConfirmRemove() {
    if (!enrollment || !removeReason) return;
    try {
      await removeEnrollment.mutateAsync({
        id: enrollment.id,
        data: {
          reason: removeReason,
          ...(removeNotes.trim() ? { notes: removeNotes.trim() } : {}),
        },
      });
      toast.success('Removed from pipeline');
      resetRemoveModal();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  async function handleReassign(field: 'teacherId' | 'mentorId', value: string) {
    if (!enrollment) return;
    try {
      await updateEnrollment.mutateAsync({
        id: enrollment.id,
        data: { [field]: value || null },
      });
      toast.success('Saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  const memberOptions = branchMembers.map((m) => ({
    value: m.id,
    label: `${m.firstName} ${m.lastName}`,
  }));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            resetFeedbackModal();
            onClose();
          }
        }}
      >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-label="Enrollment details"
      >
        <DialogHeader>
          <DialogTitle>
            {enrollment
              ? `${enrollment.memberFirstName} ${enrollment.memberLastName}`
              : 'Loading...'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and update this new believer enrollment.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !enrollment ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading enrollment...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stage indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${stage?.dotColor ?? 'bg-slate-400'}`}
                aria-hidden
              />
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {stage?.label ?? enrollment.stage}
              </span>
              <span className="text-xs text-muted-foreground">
                · Enrolled {formatShortDate(enrollment.enrolledAt)}
              </span>
            </div>

            {/* Teacher + Mentor reassignment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                  Teacher
                </label>
                {canEdit ? (
                  <CustomSelect
                    value={enrollment.teacherId ?? ''}
                    onValueChange={(v) => handleReassign('teacherId', v)}
                    options={memberOptions}
                    placeholder="Assign teacher..."
                  />
                ) : (
                  <p className="text-sm">
                    {enrollment.teacherFirstName
                      ? `${enrollment.teacherFirstName} ${enrollment.teacherLastName}`
                      : 'Not assigned'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                  Mentor
                </label>
                {canEdit ? (
                  <CustomSelect
                    value={enrollment.mentorId ?? ''}
                    onValueChange={(v) => handleReassign('mentorId', v)}
                    options={memberOptions}
                    placeholder="Assign mentor..."
                  />
                ) : (
                  <p className="text-sm">
                    {enrollment.mentorFirstName
                      ? `${enrollment.mentorFirstName} ${enrollment.mentorLastName}`
                      : 'Not assigned'}
                  </p>
                )}
              </div>
            </div>

            {/* Session attendance log */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Session attendance
              </h3>
              {attendanceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No sessions logged yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {attendanceHistory.map((a) => (
                    <li
                      key={a.sessionId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium">{a.topic ?? 'Session'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(a.sessionDate)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.attended
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {a.attended ? 'Present' : 'Absent'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-foreground/10">
              <Link
                href={`/new-believers/${enrollment.id}`}
                className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-[#5D3FD3] hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3FD3]/40"
                onClick={onClose}
              >
                Open full page <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <div className="flex items-center gap-2">
                {canEdit && enrollment.isActive && enrollment.stage !== 'integrated' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRemoveModal(true)}
                    disabled={removeEnrollment.isPending}
                    className="border-rose-600/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                  >
                    Remove from pipeline
                  </Button>
                )}
                {canEdit && nextStage && enrollment.stage !== 'integrated' && (
                  <Button
                    onClick={handleAdvance}
                    disabled={updateEnrollment.isPending}
                    className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
                  >
                    Advance to {nextStage.label}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      </Dialog>

      <Dialog
        open={showFeedbackModal}
        onOpenChange={(openFeedbackDialog) => {
          if (!openFeedbackDialog) {
            resetFeedbackModal();
          } else {
            setShowFeedbackModal(true);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Session Feedback Required</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Record feedback before moving to {nextStage?.label ?? 'the next stage'}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Session Feedback <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={4}
              placeholder="How did the session go? Any observations about the student's progress?"
              value={advanceFeedback}
              onChange={(e) => setAdvanceFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetFeedbackModal}>
              Cancel
            </Button>
            <Button
              disabled={!advanceFeedback.trim() || updateEnrollment.isPending}
              onClick={handleConfirmAdvanceWithFeedback}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              {updateEnrollment.isPending ? 'Saving...' : 'Confirm & Advance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRemoveModal}
        onOpenChange={(o) => {
          if (!o) resetRemoveModal();
          else setShowRemoveModal(true);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from pipeline</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Capture why this new believer is leaving the pipeline. Their mentor
              and branch leadership will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <CustomSelect
                value={removeReason}
                onValueChange={(v) => setRemoveReason(v as NBRemovalReason)}
                options={NB_REMOVAL_REASONS.map((r) => ({
                  value: r,
                  label: NB_REMOVAL_REASON_LABEL[r],
                }))}
                placeholder="Select a reason..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Notes <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                rows={3}
                placeholder="Anything the mentor should know..."
                value={removeNotes}
                onChange={(e) => setRemoveNotes(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetRemoveModal}>
              Cancel
            </Button>
            <Button
              disabled={!removeReason || removeEnrollment.isPending}
              onClick={handleConfirmRemove}
              className="bg-rose-600 text-white hover:bg-rose-700 border-0"
            >
              {removeEnrollment.isPending ? 'Removing...' : 'Confirm removal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
