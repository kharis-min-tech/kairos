'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  MessageSquareText,
  Plus,
  Users,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CustomSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  TimeSelect,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { useMembers } from '@/hooks/use-members';
import {
  useCreateSession,
  useEnrollments,
  useRecordSessionAttendance,
  useSessionAttendance,
  useSessions,
  useUpdateSession,
} from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import type {
  CreateNewBelieverSessionRequest,
  NewBelieverAttendanceWithMember,
  NewBelieverEnrollmentWithMember,
  NewBelieverSession,
  NewBelieverStageValue,
} from '@kairos/types';
import { STAGES, SESSION_STAGE_VALUES } from '../_components/stage-config';

const createSessionFormSchema = z.object({
  sessionStage: z.enum(['session-1', 'session-2', 'session-3', 'session-4']),
  sessionDate: z.string().min(1, 'Choose a session date'),
  sessionTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a session time'),
  location: z.string().trim().min(1, 'Enter a location').max(300, 'Location is too long'),
  teacherId: z.string().min(1, 'Choose a teacher'),
  feedback: z.string().max(2000, 'Notes are too long').optional(),
});

type CreateSessionFormValues = z.infer<typeof createSessionFormSchema>;

function todayIso() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isUpcomingSession(sessionDate: string | Date) {
  return new Date(sessionDate) >= startOfToday();
}

function formatSessionDate(sessionDate: string | Date) {
  return new Date(sessionDate).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSessionTime(sessionDate: string | Date) {
  return new Date(sessionDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getSessionStageDef(sessionStage: string) {
  return STAGES.find((stage) => stage.value === sessionStage);
}

const curriculumOptions = STAGES
  .filter((stage) => SESSION_STAGE_VALUES.has(stage.value))
  .map((stage) => ({
    value: stage.value,
    label: `${stage.label}: ${stage.topic}`,
  }));

function teacherName(session: NewBelieverSession) {
  if (!session.teacherFirstName) return 'Unassigned teacher';
  return `${session.teacherFirstName} ${session.teacherLastName ?? ''}`.trim();
}

function SessionRow({
  session,
  branchId,
  userMemberId,
  userRole,
  canRecordAttendance,
}: {
  session: NewBelieverSession;
  branchId: string;
  userMemberId: string;
  userRole: string;
  canRecordAttendance: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [sessionNotes, setSessionNotes] = useState(session.feedback ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const sessionStage = session.sessionStage as NewBelieverStageValue;
  const stageDef = getSessionStageDef(sessionStage);

  const { data: attendance, isLoading: attendanceLoading } = useSessionAttendance(
    expanded ? session.id : '',
  );
  const { data: enrollmentData, isLoading: enrollmentsLoading } = useEnrollments(
    { branchId, stage: sessionStage, limit: 500 },
    { enabled: expanded && !!branchId },
  );
  const recordAttendance = useRecordSessionAttendance();
  const updateSession = useUpdateSession();

  const isAdminOrPastor = userRole === 'admin' || userRole === 'pastor';
  const isTeacherOfSession = !!session.teacherId && session.teacherId === userMemberId;
  const canEditSessionNotes = isTeacherOfSession || isAdminOrPastor;
  const canViewSessionNotes = canEditSessionNotes || userRole === 'leader';
  const status = isUpcomingSession(session.sessionDate) ? 'Upcoming' : 'Past';

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

  async function handleSaveAttendance() {
    const records = mergedRows.map((row) => ({
      enrollmentId: row.enrollmentId,
      attended: getAttended(row.enrollmentId),
    }));

    try {
      await recordAttendance.mutateAsync({ sessionId: session.id, data: { records } });
      toast.success('Attendance saved');
      setAttendanceSaved(true);
      setToggles({});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
    }
  }

  async function handleSaveNotes() {
    try {
      await updateSession.mutateAsync({
        id: session.id,
        data: { feedback: sessionNotes.trim() },
      });
      toast.success('Session notes saved');
      setNotesSaved(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save session notes');
    }
  }

  return (
    <div className="rounded-lg border border-input/10 bg-card shadow-ambient">
      <button
        type="button"
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{session.topic}</h2>
            {stageDef && (
              <Badge
                variant="outline"
                className="border-[#5D3FD3]/30 bg-[#5D3FD3]/10 text-[#5D3FD3]"
              >
                {stageDef.label}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                status === 'Upcoming'
                  ? 'border-[#5D3FD3]/30 bg-[#5D3FD3]/10 text-[#5D3FD3]'
                  : 'border-foreground/10 bg-muted text-muted-foreground'
              }
            >
              {status}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{formatSessionDate(session.sessionDate)}</span>
            <span>{formatSessionTime(session.sessionDate)}</span>
            {session.location && <span>{session.location}</span>}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {teacherName(session)}
            </span>
            {session.feedback && (
              <span className="inline-flex items-center gap-1 text-[#D97706]">
                <MessageSquareText className="h-3.5 w-3.5" />
                Notes recorded
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-foreground/10 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Attendance</p>
              <p className="text-xs text-muted-foreground">
                {mergedRows.length === 0
                  ? 'No active enrollments available for this branch.'
                  : `${presentCount} of ${mergedRows.length} marked present`}
                {stageDef ? ` · ${stageDef.label} candidates only` : ''}
              </p>
            </div>
            {canRecordAttendance && mergedRows.length > 0 && (
              <Button
                onClick={handleSaveAttendance}
                disabled={recordAttendance.isPending}
                size="sm"
              >
                <ClipboardCheck className="mr-1.5 h-4 w-4" />
                {recordAttendance.isPending ? 'Saving...' : 'Save Attendance'}
              </Button>
            )}
          </div>

          {attendanceLoading || enrollmentsLoading ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Loading attendance...
            </p>
          ) : mergedRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No enrolled members are currently in the active class pipeline.
            </p>
          ) : (
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
                        setAttendanceSaved(false);
                      }}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {attended ? 'Present' : 'Absent'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {attendanceSaved && (
            <p className="text-xs font-medium text-emerald-600">Attendance saved.</p>
          )}

          {canViewSessionNotes && (
            <div className="space-y-2 border-t border-foreground/10 pt-4">
              <div>
                <p className="text-sm font-semibold">Session Notes</p>
                <p className="text-xs text-muted-foreground">
                  Class-level notes for this session.
                </p>
              </div>
              {canEditSessionNotes ? (
                <>
                  <Textarea
                    rows={3}
                    placeholder="Capture class-wide observations, questions raised, or follow-up themes."
                    value={sessionNotes}
                    onChange={(event) => {
                      setSessionNotes(event.target.value);
                      setNotesSaved(false);
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={updateSession.isPending}
                    >
                      {updateSession.isPending ? 'Saving...' : 'Save Notes'}
                    </Button>
                    {notesSaved && (
                      <span className="text-xs font-medium text-emerald-600">Notes saved.</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {session.feedback || 'No session notes recorded yet.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateSessionDialog({
  branchId,
  teacherOptions,
  open,
  onOpenChange,
}: {
  branchId: string;
  teacherOptions: { value: string; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createSession = useCreateSession();
  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionFormSchema),
    defaultValues: {
      sessionStage: 'session-1',
      sessionDate: todayIso(),
      sessionTime: '19:00',
      location: '',
      teacherId: '',
      feedback: '',
    },
  });

  const sessionDate = form.watch('sessionDate');
  const sessionStage = form.watch('sessionStage');
  const selectedStage = getSessionStageDef(sessionStage);

  async function handleSubmit(values: CreateSessionFormValues) {
    const payload: CreateNewBelieverSessionRequest = {
      branchId,
      sessionStage: values.sessionStage,
      sessionDate: combineDateAndTime(values.sessionDate, values.sessionTime),
      location: values.location.trim(),
      teacherId: values.teacherId,
      feedback: values.feedback?.trim() || undefined,
    };

    try {
      await createSession.mutateAsync(payload);
      toast.success('Session created');
      form.reset({
        sessionStage: 'session-1',
        sessionDate: todayIso(),
        sessionTime: '19:00',
        location: '',
        teacherId: '',
        feedback: '',
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create session');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset({
            sessionStage: 'session-1',
            sessionDate: todayIso(),
            sessionTime: '19:00',
            location: '',
            teacherId: '',
            feedback: '',
          });
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
          <DialogDescription>
            Schedule a New Believers class session for this branch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Curriculum Session</label>
            <CustomSelect
              value={sessionStage}
              onValueChange={(value) =>
                form.setValue('sessionStage', value as CreateSessionFormValues['sessionStage'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={curriculumOptions}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Topic: {selectedStage?.topic ?? 'Select a session'}
            </p>
            {form.formState.errors.sessionStage && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.sessionStage.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <DateSelect
              value={sessionDate}
              onChange={(value) =>
                form.setValue('sessionDate', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {form.formState.errors.sessionDate && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.sessionDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Time</label>
            <TimeSelect
              value={form.watch('sessionTime')}
              onValueChange={(value) =>
                form.setValue('sessionTime', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              allowEmpty={false}
            />
            {form.formState.errors.sessionTime && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.sessionTime.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="session-location" className="mb-1 block text-sm font-medium">
              Location
            </label>
            <Input
              id="session-location"
              placeholder="Main auditorium"
              {...form.register('location')}
            />
            {form.formState.errors.location && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Teacher</label>
            <CustomSelect
              value={form.watch('teacherId')}
              onValueChange={(value) =>
                form.setValue('teacherId', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={teacherOptions}
              placeholder="Assign teacher"
            />
            {form.formState.errors.teacherId && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.teacherId.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="session-feedback" className="mb-1 block text-sm font-medium">
              Session Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="session-feedback"
              rows={3}
              placeholder="Class-wide observations or follow-up themes"
              {...form.register('feedback')}
            />
            {form.formState.errors.feedback && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.feedback.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSession.isPending}>
              {createSession.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SessionsPage() {
  const { user, activeRole } = useAuthStore();
  const branchId = user?.homeBranchId ?? '';
  const userMemberId = user?.id ?? '';
  const userRole = activeRole ?? 'member';
  const canManageSessions = userRole === 'admin' || userRole === 'pastor' || userRole === 'leader';

  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'upcoming' | 'past' | 'all'>('upcoming');

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
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()),
    [sessions],
  );
  const past = useMemo(
    () =>
      sessions
        .filter((session) => !isUpcomingSession(session.sessionDate))
        .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()),
    [sessions],
  );

  const visibleSessions =
    view === 'upcoming' ? upcoming : view === 'past' ? past : [...upcoming, ...past];
  const nextSession = upcoming[0];

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
            <p className="text-muted-foreground">
              Class scheduling, attendance, and session-level notes.
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Total sessions</p>
            </div>
            <CalendarDays className="h-5 w-5 text-[#5D3FD3]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-2xl font-bold text-[#5D3FD3]">{upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-[#5D3FD3]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold">
                {nextSession ? formatSessionDate(nextSession.sessionDate) : 'No upcoming session'}
              </p>
              <p className="text-xs text-muted-foreground">Next class</p>
            </div>
            <MessageSquareText className="h-5 w-5 text-[#D97706]" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {[
            { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { value: 'past', label: `Past (${past.length})` },
            { value: 'all', label: `All (${sessions.length})` },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value as typeof view)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {visibleSessions.length} session{visibleSessions.length === 1 ? '' : 's'} shown
        </p>
      </div>

      {isLoading ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Loading sessions...
        </p>
      ) : visibleSessions.length > 0 ? (
        <div className="space-y-3">
          {visibleSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              branchId={branchId}
              userMemberId={userMemberId}
              userRole={userRole}
              canRecordAttendance={canManageSessions}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {view === 'upcoming'
              ? 'No upcoming sessions scheduled.'
              : view === 'past'
                ? 'No past sessions recorded.'
                : 'No sessions yet.'}
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
