'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  CustomSelect,
} from '@kairos/ui';
import { useEnrollment, useUpdateEnrollment } from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import { STAGES, getNextStage } from './stage-config';

interface EnrollmentDetailDrawerProps {
  enrollmentId: string | null;
  onClose: () => void;
  /** Branch members available for teacher / mentor reassignment. */
  branchMembers: { id: string; firstName: string; lastName: string }[];
}

interface AttendanceHistoryItem {
  sessionId: string;
  sessionDate: string | Date;
  topic?: string | null;
  attended: boolean;
}

export function EnrollmentDetailDrawer({
  enrollmentId,
  onClose,
  branchMembers,
}: EnrollmentDetailDrawerProps) {
  const open = !!enrollmentId;
  const { activeRole } = useAuthStore();
  const canEdit = activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';

  const { data: enrollment, isLoading } = useEnrollment(enrollmentId ?? '');
  const updateEnrollment = useUpdateEnrollment();

  const stage = enrollment
    ? STAGES.find((s) => s.value === enrollment.stage)
    : undefined;
  const nextStage = enrollment ? getNextStage(enrollment.stage) : undefined;

  const attendanceHistory: AttendanceHistoryItem[] =
    ((enrollment as unknown as { attendanceHistory?: AttendanceHistoryItem[] })?.attendanceHistory) ?? [];

  async function handleAdvance() {
    if (!enrollment || !nextStage) return;
    try {
      await updateEnrollment.mutateAsync({
        id: enrollment.id,
        data: { stage: nextStage.value },
      });
      toast.success(`Advanced to ${nextStage.label}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance stage');
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
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
                · Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
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
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-foreground/10">
              <Link
                href={`/new-believers/${enrollment.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5D3FD3] hover:underline"
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
  );
}

