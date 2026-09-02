'use client';

export const runtime = 'edge';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, Badge, Button, Input, cn } from '@kairos/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  GraduationCap,
  CalendarDays,
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatShortDate } from '@kairos/core';
import { useCapabilities } from '@/hooks/use-capabilities';
import {
  useMembershipCohort,
  useMembershipEnrollments,
  useSaveSessionRecords,
  useRecordFinalTest,
  useRecordInduction,
  useGraduateMembers,
} from '@/hooks/use-membership';
import type {
  MembershipEnrollmentWithMember,
  MembershipSession,
} from '@kairos/types';

type Tab = 'roster' | 'sessions' | 'graduation';

/**
 * Cohort detail. Three tabs matching how the class is actually run:
 *
 *   Roster     — who is in, and their final-test mark.
 *   Sessions   — the four sessions, and the register for each (attendance plus
 *                homework and quiz marks, saved in one write).
 *   Graduation — the six-requirement gate, and who is clear to graduate.
 *
 * Marking is open to cohort teachers; cohort administration and graduation are
 * platform-admin only, because a church-wide cohort has no branch-scoped grant
 * that could describe authority over it.
 */
export default function CohortDetailPage() {
  const params = useParams<{ id: string }>();
  const cohortId = params.id;
  const caps = useCapabilities();
  const isAdmin = caps.systemRole === 'admin';

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
        {cohort.teachers.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Taught by{' '}
            {cohort.teachers
              .map((t) => `${t.memberFirstName} ${t.memberLastName}`)
              .join(', ')}
          </p>
        ) : null}
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
        <SessionsTab sessions={cohort.sessions} roster={roster} />
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
                  {e.selfEnrolled ? (
                    <span className="ml-2 text-[10px] text-muted-foreground">self-enrolled</span>
                  ) : null}
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
  sessions,
  roster,
}: {
  sessions: MembershipSession[];
  roster: MembershipEnrollmentWithMember[];
}) {
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No sessions scheduled yet. A cohort needs all four before anyone can graduate.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
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
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpenSessionId(openSessionId === s.id ? null : s.id)}
              >
                <ClipboardCheck className="mr-1 size-4" />
                {openSessionId === s.id ? 'Close register' : 'Open register'}
              </Button>
            </div>
            {openSessionId === s.id ? (
              <SessionRegister sessionId={s.id} roster={roster} />
            ) : null}
          </CardContent>
        </Card>
      ))}
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

  const active = useMemo(() => roster.filter((r) => r.status === 'enrolled'), [roster]);

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
                          if (r.blocked.length > 0) {
                            toast.error(
                              `${r.blocked.length} member(s) are not eligible yet: ${
                                r.blocked[0]?.outstanding[0] ?? 'requirements outstanding'
                              }`,
                            );
                          }
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
    </div>
  );
}
