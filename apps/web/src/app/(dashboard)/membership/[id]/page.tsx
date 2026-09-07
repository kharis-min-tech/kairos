'use client';

export const runtime = 'edge';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
  CustomSelect,
  cn,
} from '@kairos/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  GraduationCap,
  CalendarDays,
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  CalendarPlus,
  Pencil,
  UserMinus,
} from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { CHURCH_SCOPE } from '@kairos/types';
import { useCapabilities } from '@/hooks/use-capabilities';
import {
  useMembershipCohort,
  useMembershipEnrollments,
  useSaveSessionRecords,
  useSaveSession,
  useRecordFinalTest,
  useWithdrawEnrollment,
  useRecordInduction,
  useGraduateMembers,
} from '@/hooks/use-membership';
import { MEMBERSHIP_SESSION_NUMBERS } from '@kairos/types';
import type {
  MembershipEnrollmentWithMember,
  MembershipSession,
  MembershipSessionNumber,
} from '@kairos/types';
import { useMembers } from '@/hooks/use-members';
// DateSelect is an app-level component, not a design-system primitive.
// packages/ui does not export one — see apps/web/CLAUDE.md.
import { DateSelect } from '@/components/date-select';

type Tab = 'roster' | 'sessions' | 'graduation';

/**
 * Cohort detail. Three tabs matching how the class is actually run:
 *
 *   Roster     — who is in, and their final-test mark.
 *   Sessions   — the four sessions, and the register for each (attendance plus
 *                homework and quiz marks, saved in one write).
 *   Graduation — the six-requirement gate, and who is clear to graduate.
 *
 * Everything administrative here — marking included — is gated on
 * `membership:admin` at CHURCH scope. A church-wide cohort has no branch,
 * fellowship or department that could contain it, so no branch-scoped grant
 * could describe authority over one; the church scope exists for exactly this.
 *
 * Teaching is per SESSION and confers nothing: different people teach
 * different sessions of one cohort, and admins do the marking.
 */
export default function CohortDetailPage() {
  const params = useParams<{ id: string }>();
  const cohortId = params.id;
  const caps = useCapabilities();
  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);

  const [tab, setTab] = useState<Tab>('roster');

  const { data: cohort, isLoading, error } = useMembershipCohort(cohortId);
  const { data: enrollments } = useMembershipEnrollments(cohortId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading cohort…</p>;
  }
  if (error || !cohort) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm">
        {error instanceof Error ? error.message : 'Cohort not found.'}
      </div>
    );
  }

  const roster = enrollments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/membership"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All cohorts
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <GraduationCap className="size-5 text-[#5D3FD3]" />
          {cohort.name}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Starts {formatShortDate(cohort.startDate)}
          </span>
          {cohort.graduationDate ? (
            <span>Induction {formatShortDate(cohort.graduationDate)}</span>
          ) : null}
          {cohort.finalTestDeadline ? (
            <span>Final test by {formatShortDate(cohort.finalTestDeadline)}</span>
          ) : null}
          <span className="capitalize">{cohort.status}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['roster', 'sessions', 'graduation'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition',
              tab === t
                ? 'border-[#5D3FD3] text-[#5D3FD3]'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'roster' ? <RosterTab roster={roster} /> : null}
      {tab === 'sessions' ? (
        <SessionsTab cohortId={cohortId} sessions={cohort.sessions} roster={roster} />
      ) : null}
      {tab === 'graduation' ? (
        <GraduationTab cohortId={cohortId} roster={roster} isAdmin={isAdmin} />
      ) : null}
    </div>
  );
}

// ── Roster ────────────────────────────────────────────────────────────────

function RosterTab({ roster }: { roster: MembershipEnrollmentWithMember[] }) {
  const recordFinalTest = useRecordFinalTest();
  const withdraw = useWithdrawEnrollment();
  const [scores, setScores] = useState<Record<string, string>>({});

  if (roster.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nobody has enrolled yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Final test</th>
              <th className="px-4 py-2 font-medium">Induction</th>
              <th className="px-4 py-2 font-medium sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((e) => (
              <tr key={e.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/members/${e.memberId}`}
                    className="font-medium text-foreground hover:text-[#5D3FD3]"
                  >
                    {e.memberFirstName} {e.memberLastName}
                  </Link>
                  {/* Provenance: through the interest pool, or added directly by
                      an admin (the paper-signup case). */}
                  {e.fromPool ? null : (
                    <span className="ml-2 text-[10px] text-muted-foreground">added directly</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{e.branchName ?? '—'}</td>
                <td className="px-4 py-2 capitalize text-muted-foreground">{e.status}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 w-20"
                      inputMode="numeric"
                      placeholder={e.finalTestScore?.toString() ?? '—'}
                      value={scores[e.id] ?? ''}
                      onChange={(ev) =>
                        setScores((s) => ({ ...s, [e.id]: ev.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!scores[e.id] || recordFinalTest.isPending}
                      onClick={() =>
                        recordFinalTest.mutate(
                          { enrollmentId: e.id, score: Number(scores[e.id]) },
                          {
                            onSuccess: () => {
                              toast.success('Final test recorded.');
                              setScores((s) => ({ ...s, [e.id]: '' }));
                            },
                            onError: (err: unknown) =>
                              toast.error(
                                err instanceof Error ? err.message : 'Could not save.',
                              ),
                          },
                        )
                      }
                    >
                      Save
                    </Button>
                    {e.finalTestPassed === true ? (
                      <Badge variant="default">Passed</Badge>
                    ) : e.finalTestPassed === false ? (
                      <Badge variant="destructive">Failed</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {e.inductionAttended ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not yet</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {/* Only an open enrolment can be withdrawn. A graduated one
                      is settled, and the API refuses it. */}
                  {e.status === 'enrolled' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={withdraw.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Withdraw ${e.memberFirstName} ${e.memberLastName} from this cohort? Their marks are kept and they can be admitted to a later intake.`,
                          )
                        ) {
                          return;
                        }
                        withdraw.mutate(
                          { enrollmentId: e.id, data: { reason: 'withdrew' } },
                          {
                            onSuccess: () => toast.success('Enrolment withdrawn.'),
                            onError: (err: unknown) =>
                              toast.error(
                                err instanceof Error ? err.message : 'Could not withdraw.',
                              ),
                          },
                        );
                      }}
                    >
                      <UserMinus className="size-4" />
                      <span className="sr-only">
                        Withdraw {e.memberFirstName} {e.memberLastName}
                      </span>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Sessions ──────────────────────────────────────────────────────────────

function SessionsTab({
  cohortId,
  sessions,
  roster,
}: {
  cohortId: string;
  sessions: MembershipSession[];
  roster: MembershipEnrollmentWithMember[];
}) {
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<MembershipSessionNumber | null>(null);

  // Every number 1-4 always shows, scheduled or not. Sessions are addressed by
  // NUMBER (there is exactly one session 3 per cohort, so saving it twice
  // moves it rather than duplicating it), and an unscheduled slot blocks the
  // whole cohort from graduating — so it has to be visible, not absent.
  const slots = MEMBERSHIP_SESSION_NUMBERS.map((n) => ({
    number: n,
    session: sessions.find((s) => s.sessionNumber === n) ?? null,
  }));

  return (
    <div className="space-y-3">
      {slots.map(({ number, session: s }) =>
        s === null ? (
          <Card key={number} className="border-dashed">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Session {number}</p>
                <p className="text-xs text-muted-foreground">
                  Not scheduled yet. All four are required before anyone can graduate.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditingNumber(number)}>
                <CalendarPlus className="mr-1 size-4" />
                Schedule
              </Button>
            </CardContent>
            {editingNumber === number ? (
              <CardContent className="pt-0">
                <SessionEditor
                  cohortId={cohortId}
                  sessionNumber={number}
                  existing={null}
                  onDone={() => setEditingNumber(null)}
                />
              </CardContent>
            ) : null}
          </Card>
        ) : (
        <Card key={s.id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Session {s.sessionNumber}: {s.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.sessionDate ? formatShortDate(s.sessionDate) : 'Date to be confirmed'}
                  {s.location ? ` · ${s.location}` : ''}
                  {s.teacherFirstName
                    ? ` · taught by ${s.teacherFirstName} ${s.teacherLastName}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditingNumber(
                      editingNumber === s.sessionNumber ? null : s.sessionNumber,
                    )
                  }
                >
                  <Pencil className="mr-1 size-4" />
                  {editingNumber === s.sessionNumber ? 'Cancel' : 'Edit'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenSessionId(openSessionId === s.id ? null : s.id)}
                >
                  <ClipboardCheck className="mr-1 size-4" />
                  {openSessionId === s.id ? 'Close register' : 'Open register'}
                </Button>
              </div>
            </div>
            {editingNumber === s.sessionNumber ? (
              <SessionEditor
                cohortId={cohortId}
                sessionNumber={s.sessionNumber}
                existing={s}
                onDone={() => setEditingNumber(null)}
              />
            ) : null}
            {openSessionId === s.id ? (
              <SessionRegister sessionId={s.id} roster={roster} />
            ) : null}
          </CardContent>
        </Card>
        ),
      )}
    </div>
  );
}

/**
 * Schedule or move one session.
 *
 * Upserts by session NUMBER, so saving session 3 twice moves it rather than
 * creating a second one. `teacherId` records whoever teaches that single
 * session — different people teach different sessions of the same cohort —
 * and confers no permissions whatsoever.
 */
function SessionEditor({
  cohortId,
  sessionNumber,
  existing,
  onDone,
}: {
  cohortId: string;
  sessionNumber: MembershipSessionNumber;
  existing: MembershipSession | null;
  onDone: () => void;
}) {
  const save = useSaveSession(cohortId);
  const { data: memberPage } = useMembers({ page: 1, limit: 200 });

  const [title, setTitle] = useState(existing?.title ?? '');
  // The API takes a full ISO datetime; DateSelect speaks YYYY-MM-DD.
  const [date, setDate] = useState(existing?.sessionDate?.slice(0, 10) ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [teacherId, setTeacherId] = useState(existing?.teacherId ?? '');
  const [error, setError] = useState<string | null>(null);

  const teacherOptions = [
    { value: '', label: 'No teacher assigned' },
    ...(memberPage?.data ?? []).map((m) => ({
      value: m.id,
      label: `${m.firstName} ${m.lastName}`,
    })),
  ];

  function submit() {
    if (title.trim().length < 2) {
      setError('Give the session a title.');
      return;
    }
    setError(null);
    save.mutate(
      {
        sessionNumber,
        title: title.trim(),
        // Midday rather than midnight, so a timezone shift cannot roll the
        // date onto the day before for anyone reading it back.
        sessionDate: date ? new Date(`${date}T12:00:00.000Z`).toISOString() : null,
        location: location.trim() || null,
        teacherId: teacherId || null,
      },
      {
        onSuccess: () => {
          toast.success(`Session ${sessionNumber} saved.`);
          onDone();
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : 'Could not save the session.'),
      },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`title-${sessionNumber}`}>Title</Label>
          <Input
            id={`title-${sessionNumber}`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Who we are as a church"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <DateSelect value={date} onChange={setDate} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`location-${sessionNumber}`}>Location</Label>
          <Input
            id={`location-${sessionNumber}`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Main hall"
          />
        </div>
        <div className="space-y-1">
          <Label>Teacher</Label>
          <CustomSelect
            value={teacherId}
            onValueChange={setTeacherId}
            options={teacherOptions}
            placeholder="No teacher assigned"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-[#5D3FD3] hover:bg-[#451ebb]"
          disabled={save.isPending}
          onClick={submit}
        >
          {save.isPending ? 'Saving…' : 'Save session'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * The register. Attendance plus homework and quiz marks for the whole roster
 * save in one request, because that is how a teacher works through a class
 * rather than one member at a time.
 */
function SessionRegister({
  sessionId,
  roster,
}: {
  sessionId: string;
  roster: MembershipEnrollmentWithMember[];
}) {
  const save = useSaveSessionRecords(sessionId);
  const [draft, setDraft] = useState<
    Record<string, { attended: boolean; homework: string; quiz: string }>
  >(() =>
    Object.fromEntries(
      roster.map((r) => [r.id, { attended: false, homework: '', quiz: '' }]),
    ),
  );

  const active = roster.filter((r) => r.status === 'enrolled');

  function submit() {
    const records = active.map((r) => {
      const d = draft[r.id];
      return {
        enrollmentId: r.id,
        attended: d?.attended ?? false,
        // An empty box means "not marked", which is different from a zero.
        ...(d?.homework ? { homeworkScore: Number(d.homework) } : {}),
        ...(d?.quiz ? { quizScore: Number(d.quiz) } : {}),
      };
    });
    save.mutate(
      { records },
      {
        onSuccess: (res) => toast.success(`Saved ${res.saved} record(s).`),
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : 'Could not save the register.'),
      },
    );
  }

  if (active.length === 0) {
    return <p className="text-xs text-muted-foreground">No active enrolments to mark.</p>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">Member</th>
            <th className="py-1 font-medium">Attended</th>
            <th className="py-1 font-medium">Homework</th>
            <th className="py-1 font-medium">Quiz</th>
          </tr>
        </thead>
        <tbody>
          {active.map((r) => (
            <tr key={r.id}>
              <td className="py-1.5">
                {r.memberFirstName} {r.memberLastName}
              </td>
              <td className="py-1.5">
                <input
                  type="checkbox"
                  className="size-4 accent-[#5D3FD3]"
                  checked={draft[r.id]?.attended ?? false}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [r.id]: {
                        attended: e.target.checked,
                        homework: d[r.id]?.homework ?? '',
                        quiz: d[r.id]?.quiz ?? '',
                      },
                    }))
                  }
                  aria-label={`${r.memberFirstName} ${r.memberLastName} attended`}
                />
              </td>
              <td className="py-1.5">
                <Input
                  className="h-8 w-20"
                  inputMode="numeric"
                  placeholder="score"
                  aria-label={`${r.memberFirstName} ${r.memberLastName} homework score`}
                  value={draft[r.id]?.homework ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [r.id]: {
                        attended: d[r.id]?.attended ?? false,
                        homework: e.target.value,
                        quiz: d[r.id]?.quiz ?? '',
                      },
                    }))
                  }
                />
              </td>
              <td className="py-1.5">
                <Input
                  className="h-8 w-20"
                  inputMode="numeric"
                  placeholder="score"
                  aria-label={`${r.memberFirstName} ${r.memberLastName} quiz score`}
                  value={draft[r.id]?.quiz ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [r.id]: {
                        attended: d[r.id]?.attended ?? false,
                        homework: d[r.id]?.homework ?? '',
                        quiz: e.target.value,
                      },
                    }))
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        size="sm"
        className="bg-[#5D3FD3] hover:bg-[#451ebb]"
        disabled={save.isPending}
        onClick={submit}
      >
        {save.isPending ? 'Saving…' : 'Save register'}
      </Button>
    </div>
  );
}

// ── Graduation ────────────────────────────────────────────────────────────

function GraduationTab({
  cohortId,
  roster,
  isAdmin,
}: {
  cohortId: string;
  roster: MembershipEnrollmentWithMember[];
  isAdmin: boolean;
}) {
  const graduate = useGraduateMembers(cohortId);
  const induction = useRecordInduction(cohortId);
  const [selected, setSelected] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<
    { enrollmentId: string; outstanding: string[] }[]
  >([]);
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const active = useMemo(() => roster.filter((r) => r.status === 'enrolled'), [roster]);

  const nameFor = useMemo(() => {
    const map = new Map(
      roster.map((r) => [r.id, `${r.memberFirstName} ${r.memberLastName}`]),
    );
    return (id: string) => map.get(id) ?? 'This member';
  }, [roster]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="space-y-4">
      <Card className="border-[#5D3FD3]/20 bg-[#5D3FD3]/5">
        <CardContent className="py-4 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">What graduation requires</p>
          All four sessions attended, homework passed for each, quizzes passed for each, the
          final test passed on or before the deadline, and the induction ceremony attended.
          Finishing session four is not completion on its own.
        </CardContent>
      </Card>

      {active.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nobody is currently enrolled.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-4">
            <ul className="space-y-2">
              {active.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#5D3FD3]"
                    checked={selected.includes(e.id)}
                    onChange={() => toggle(e.id)}
                    aria-label={`Select ${e.memberFirstName} ${e.memberLastName}`}
                  />
                  <span className="flex-1">
                    {e.memberFirstName} {e.memberLastName}
                  </span>
                  {e.inductionAttended ? (
                    <Badge variant="secondary">Induction done</Badge>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="size-3.5" />
                      Induction outstanding
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={selected.length === 0 || induction.isPending}
                onClick={() =>
                  induction.mutate(
                    { enrollmentIds: selected, attended: true },
                    {
                      onSuccess: (r) =>
                        toast.success(`Induction recorded for ${r.updated} member(s).`),
                      onError: (e: unknown) =>
                        toast.error(e instanceof Error ? e.message : 'Could not record.'),
                    },
                  )
                }
              >
                <Users className="mr-1 size-4" />
                Mark induction attended
              </Button>

              {isAdmin ? (
                <Button
                  size="sm"
                  className="bg-[#5D3FD3] hover:bg-[#451ebb]"
                  disabled={selected.length === 0 || graduate.isPending}
                  onClick={() =>
                    graduate.mutate(
                      { enrollmentIds: selected },
                      {
                        onSuccess: (r) => {
                          if (r.graduated > 0) {
                            toast.success(`Graduated ${r.graduated} member(s).`);
                          }
                          // Keep the blocked list on screen rather than in a
                          // toast: "3 not eligible" is useless without the
                          // reasons, and the admin needs them to act.
                          setBlocked(r.blocked);
                          setSelected([]);
                        },
                        onError: (e: unknown) =>
                          toast.error(
                            e instanceof Error ? e.message : 'Could not graduate.',
                          ),
                      },
                    )
                  }
                >
                  <GraduationCap className="mr-1 size-4" />
                  Graduate selected
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {blocked.map((b) => (
        <Card key={b.enrollmentId} className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-2 py-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertCircle className="size-4 text-destructive" />
              {nameFor(b.enrollmentId)} did not meet the gate
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {b.outstanding.map((o) => (
                <li key={o}>• {o}</li>
              ))}
            </ul>

            {overrideFor === b.enrollmentId ? (
              <div className="space-y-2 pt-1">
                <Label htmlFor={`reason-${b.enrollmentId}`}>Why are you overriding?</Label>
                <Textarea
                  id={`reason-${b.enrollmentId}`}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Attended the induction at another branch"
                />
                <p className="text-xs text-muted-foreground">
                  Appended to the enrolment notes and kept permanently. Be specific enough
                  that someone reading it in a year understands the decision.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[#5D3FD3] hover:bg-[#451ebb]"
                    // The API rejects an override with no reason, so don't let
                    // the request leave without one.
                    disabled={!overrideReason.trim() || graduate.isPending}
                    onClick={() =>
                      graduate.mutate(
                        {
                          enrollmentIds: [b.enrollmentId],
                          override: true,
                          overrideReason: overrideReason.trim(),
                        },
                        {
                          onSuccess: () => {
                            toast.success('Graduated with an override.');
                            setBlocked((prev) =>
                              prev.filter((x) => x.enrollmentId !== b.enrollmentId),
                            );
                            setOverrideFor(null);
                            setOverrideReason('');
                          },
                          onError: (e: unknown) =>
                            toast.error(
                              e instanceof Error ? e.message : 'Could not graduate.',
                            ),
                        },
                      )
                    }
                  >
                    Graduate anyway
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setOverrideFor(null);
                      setOverrideReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOverrideFor(b.enrollmentId);
                  setOverrideReason('');
                }}
              >
                Override and graduate
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
