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
import { useEnrollment, useUpdateEnrollment } from '@/hooks/use-new-believers';
import { useCapabilities } from '@/hooks/use-capabilities';
import { formatShortDate } from '@/lib/date-format';
import { STAGES, SESSION_STAGE_VALUES, getNextStage } from './stage-config';
import type { EnrollmentDetail } from './types';
import type { NewBelieverStageValue, UpdateEnrollmentRequest } from '@kairos/types';

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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [advanceFeedback, setAdvanceFeedback] = useState('');

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
    </>
  );
}
