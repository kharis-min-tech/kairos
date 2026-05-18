'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@kairos/ui';
import {
  useEnrollments,
  useRecordSessionAttendance,
  useSessionAttendance,
} from '@/hooks/use-new-believers';
import type {
  NewBelieverAttendanceWithMember,
  NewBelieverEnrollmentWithMember,
  NewBelieverSession,
  NewBelieverStageValue,
} from '@kairos/types';
import { getSessionStageDef } from './session-helpers';

interface Props {
  session: NewBelieverSession;
  branchId: string;
  canRecordAttendance: boolean;
}

export function AttendanceTab({ session, branchId, canRecordAttendance }: Props) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const sessionStage = session.sessionStage as NewBelieverStageValue;
  const stageDef = getSessionStageDef(sessionStage);

  const { data: attendance, isLoading: attendanceLoading } = useSessionAttendance(session.id);
  const { data: enrollmentData, isLoading: enrollmentsLoading } = useEnrollments(
    { branchId, stage: sessionStage, limit: 500 },
    { enabled: !!branchId },
  );
  const recordAttendance = useRecordSessionAttendance();

  const rows = useMemo(
    () => (attendance ?? []) as NewBelieverAttendanceWithMember[],
    [attendance],
  );
  const enrolled = useMemo(
    () => (enrollmentData?.data ?? []) as NewBelieverEnrollmentWithMember[],
    [enrollmentData?.data],
  );

  const mergedRows = useMemo(() => {
    const existingIds = new Set(rows.map((row) => row.enrollmentId));
    const missingEnrollmentRows = enrolled
      .filter((enrollment) => enrollment.isActive)
      .filter((enrollment) => !['completed', 'integrated'].includes(enrollment.stage))
      .filter((enrollment) => !existingIds.has(enrollment.id))
      .map((enrollment) => ({
        sessionId: session.id,
        enrollmentId: enrollment.id,
        memberFirstName: enrollment.memberFirstName,
        memberLastName: enrollment.memberLastName,
        attended: false,
        recordedAt: '',
      }));

    return [...rows, ...missingEnrollmentRows].sort((a, b) => {
      const last = a.memberLastName.localeCompare(b.memberLastName);
      return last !== 0 ? last : a.memberFirstName.localeCompare(b.memberFirstName);
    });
  }, [enrolled, rows, session.id]);

  function getAttended(enrollmentId: string): boolean {
    if (enrollmentId in toggles) return toggles[enrollmentId] ?? false;
    return rows.find((row) => row.enrollmentId === enrollmentId)?.attended ?? false;
  }

  const presentCount = mergedRows.filter((row) => getAttended(row.enrollmentId)).length;
  const allPresent = mergedRows.length > 0 && presentCount === mergedRows.length;
  const nonePresent = presentCount === 0;

  function setAll(attended: boolean) {
    const next: Record<string, boolean> = {};
    mergedRows.forEach((row) => {
      next[row.enrollmentId] = attended;
    });
    setToggles(next);
    setSaved(false);
  }

  async function handleSave() {
    const records = mergedRows.map((row) => ({
      enrollmentId: row.enrollmentId,
      attended: getAttended(row.enrollmentId),
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

  if (attendanceLoading || enrollmentsLoading) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Loading attendance...
      </p>
    );
  }

  if (mergedRows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No enrolled members are currently in the active class pipeline.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {`${presentCount} of ${mergedRows.length} marked present`}
          {stageDef ? ` · ${stageDef.label} candidates only` : ''}
        </p>
        {canRecordAttendance && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAll(true)}
              disabled={allPresent}
            >
              Mark all present
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAll(false)}
              disabled={nonePresent}
            >
              Mark all absent
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-input/10">
        {mergedRows.map((row) => {
          const attended = getAttended(row.enrollmentId);
          return (
            <div
              key={row.enrollmentId}
              className="flex items-center justify-between gap-3 border-b border-input/10 bg-background px-3 py-2.5 last:border-b-0"
            >
              <span className="text-sm font-medium">
                {row.memberFirstName} {row.memberLastName}
              </span>
              <Button
                type="button"
                size="sm"
                variant={attended ? 'success' : 'outline'}
                disabled={!canRecordAttendance}
                onClick={() => {
                  setToggles((current) => ({
                    ...current,
                    [row.enrollmentId]: !attended,
                  }));
                  setSaved(false);
                }}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {attended ? 'Present' : 'Absent'}
              </Button>
            </div>
          );
        })}
      </div>

      {canRecordAttendance && (
        <div className="flex items-center justify-between">
          {saved ? (
            <p className="text-xs font-medium text-emerald-600">Attendance saved.</p>
          ) : (
            <span />
          )}
          <Button
            onClick={handleSave}
            disabled={recordAttendance.isPending}
            size="sm"
          >
            <ClipboardCheck className="mr-1.5 h-4 w-4" />
            {recordAttendance.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
