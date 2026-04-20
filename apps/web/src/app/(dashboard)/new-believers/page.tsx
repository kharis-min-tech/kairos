'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useEnrollments, useEnrollmentAlerts, useCreateEnrollment, useUpdateEnrollment } from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import { useMembers } from '@/hooks/use-members';
import { Card, CardContent } from '@kairos/ui';
import type { NewBelieverStageValue, EnrollmentListParams } from '@kairos/types';

const STAGES: { value: NewBelieverStageValue; label: string; topic?: string }[] = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'session-1', label: 'Session 1', topic: 'Foundations of Faith' },
  { value: 'session-2', label: 'Session 2', topic: 'Who is a Christian' },
  { value: 'session-3', label: 'Session 3', topic: 'Working out your Salvation' },
  { value: 'session-4', label: 'Session 4', topic: 'The Importance of Fellowship' },
  { value: 'completed', label: 'Completed' },
  { value: 'integrated', label: 'Joined a Department' },
];

const STAGE_COLORS: Record<NewBelieverStageValue, string> = {
  enrolled: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'session-1': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
  'session-2': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800',
  'session-3': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800',
  'session-4': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800',
  integrated: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
};

function MemberCombobox({
  members,
  value,
  onChange,
  placeholder = 'Search members…',
  id,
}: {
  members: { id: string; firstName: string; lastName: string }[];
  value: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMember = members.find((m) => m.id === value);
  const selectedLabel = selectedMember
    ? `${selectedMember.firstName} ${selectedMember.lastName}`
    : '';

  // When open: filter by search text. When closed: show selected label.
  const filtered = open
    ? members.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function handleSelect(m: { id: string; firstName: string; lastName: string }) {
    onChange(m.id, `${m.firstName} ${m.lastName}`);
    setSearch('');
    setOpen(false);
  }

  function handleFocus() {
    setSearch(''); // clear so full list shows immediately
    setOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    // Clear current selection so the user is picking fresh
    if (value) onChange('', '');
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange('', '');
    setSearch('');
    setOpen(true);
  }

  // Input displays: search text when open, selected name when closed
  const inputValue = open ? search : selectedLabel;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          className="w-full rounded-lg border bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
        {/* Chevron / clear button */}
        {value && !open ? (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-900 dark:hover:text-gray-100"
          >
            ✕
          </button>
        ) : (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            ▾
          </span>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filtered.length > 0 ? (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 ${
                    m.id === value
                      ? 'bg-purple-50 font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(m)}
                >
                  {m.firstName} {m.lastName}
                  {m.id === value && <span className="ml-2 text-xs">✓</span>}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {members.length === 0 ? 'No members available' : 'No matches'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

const SESSION_STAGE_VALUES = new Set(['session-1', 'session-2', 'session-3', 'session-4']);
const MAX_SELECT = 5;

function StageColumn({
  stage,
  enrollments,
  canSelect,
  selectMode,
  selectedIds,
  isAdvancing,
  onEnterSelectMode,
  onCancelSelectMode,
  onToggle,
  onAdvanceSelected,
}: {
  stage: { value: NewBelieverStageValue; label: string; topic?: string };
  enrollments: Array<{
    id: string;
    memberFirstName: string;
    memberLastName: string;
    teacherFirstName?: string | null;
    teacherLastName?: string | null;
    mentorFirstName?: string | null;
    mentorLastName?: string | null;
    enrolledAt: string | Date;
    updatedAt: string | Date;
  }>;
  canSelect?: boolean;
  selectMode: boolean;
  selectedIds: Set<string>;
  isAdvancing: boolean;
  onEnterSelectMode: () => void;
  onCancelSelectMode: () => void;
  onToggle: (id: string) => void;
  onAdvanceSelected: () => void;
}) {
  const colorClass = STAGE_COLORS[stage.value];
  const nextStageIdx = STAGES.findIndex((s) => s.value === stage.value) + 1;
  const nextStage = STAGES[nextStageIdx];
  const selectedCount = selectedIds.size;
  const isSessionStage = SESSION_STAGE_VALUES.has(stage.value);

  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      {/* Column header */}
      <div className={`rounded-lg border px-3 py-2 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {stage.label}
            <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-xs font-bold dark:bg-white/20">
              {enrollments.length}
            </span>
          </span>
          {canSelect && enrollments.length > 0 && nextStage && !selectMode && (
            <button
              onClick={onEnterSelectMode}
              className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium opacity-70 hover:opacity-100 hover:underline"
            >
              Select
            </button>
          )}
        </div>
        {stage.topic && (
          <p className="mt-0.5 text-xs opacity-70">{stage.topic}</p>
        )}
      </div>

      {/* Select-mode action bar */}
      {selectMode && nextStage && (
        <div className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-950/40">
          <p className="text-xs text-purple-700 dark:text-purple-300">
            {selectedCount === 0
              ? `Pick up to ${MAX_SELECT} people`
              : `${selectedCount} / ${MAX_SELECT} selected`}
          </p>
          {isSessionStage && (
            <p className="mt-0.5 text-xs text-purple-600/70 dark:text-purple-400/70">
              Will mark session complete &amp; advance
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={onAdvanceSelected}
              disabled={selectedCount === 0 || isAdvancing}
              className="flex-1 rounded-lg bg-purple-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-40"
            >
              {isAdvancing ? 'Advancing…' : `Advance (${selectedCount}) → ${nextStage.label}`}
            </button>
            <button
              onClick={onCancelSelectMode}
              disabled={isAdvancing}
              className="rounded-lg border px-2 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {enrollments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No enrollments
          </p>
        ) : (
          enrollments.map((e) => {
            const checked = selectedIds.has(e.id);
            const atMax = selectedCount >= MAX_SELECT && !checked;

            if (selectMode) {
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={atMax}
                  onClick={() => onToggle(e.id)}
                  className={`w-full rounded-xl border text-left transition-shadow ${
                    checked
                      ? 'border-purple-500 bg-purple-50 shadow-md dark:border-purple-500 dark:bg-purple-950/40'
                      : atMax
                      ? 'border-gray-200 opacity-40 dark:border-gray-700'
                      : 'border-gray-200 hover:shadow-md dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2 p-3">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
                        checked
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}
                    >
                      {checked && '✓'}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {e.memberFirstName} {e.memberLastName}
                      </p>
                      {(e.teacherFirstName || e.teacherLastName) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Teacher: {e.teacherFirstName} {e.teacherLastName}
                        </p>
                      )}
                      {e.mentorFirstName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Mentor: {e.mentorFirstName} {e.mentorLastName}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <Link key={e.id} href={`/new-believers/${e.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">
                      {e.memberFirstName} {e.memberLastName}
                    </p>
                    {(e.teacherFirstName || e.teacherLastName) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Teacher: {e.teacherFirstName} {e.teacherLastName}
                      </p>
                    )}
                    {e.mentorFirstName && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Mentor: {e.mentorFirstName} {e.mentorLastName}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function NewBelieversContent() {
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';

  const [filterStage, setFilterStage] = useState<NewBelieverStageValue | ''>('');
  const [search, setSearch] = useState('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    memberId: '',
    memberName: '',
    teacherId: '',
    teacherName: '',
    mentorId: '',
    mentorName: '',
    notes: '',
  });

  const fetchParams: EnrollmentListParams = {
    page: 1,
    limit: 200,
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
    stage: filterStage || undefined,
  };

  const { data: result, isLoading } = useEnrollments(fetchParams);
  const { data: alertsResult } = useEnrollmentAlerts();
  const createEnrollment = useCreateEnrollment();
  const updateEnrollment = useUpdateEnrollment();

  // Select-to-advance state: which stage column is in select mode
  const [selectStage, setSelectStage] = useState<NewBelieverStageValue | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdvancing, setIsAdvancing] = useState(false);

  function enterSelectMode(stageValue: NewBelieverStageValue) {
    setSelectStage(stageValue);
    setSelectedIds(new Set());
  }

  function cancelSelectMode() {
    setSelectStage(null);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECT) {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAdvanceSelected(stageValue: NewBelieverStageValue) {
    const nextStageIdx = STAGES.findIndex((s) => s.value === stageValue) + 1;
    const nextStage = STAGES[nextStageIdx];
    if (!nextStage || selectedIds.size === 0) return;
    setIsAdvancing(true);
    const isSessionStage = SESSION_STAGE_VALUES.has(stageValue);
    let ok = 0;
    let failed = 0;
    for (const eid of selectedIds) {
      try {
        const sessionCompletedAt = isSessionStage
          ? { [stageValue]: new Date().toISOString() }
          : undefined;
        await updateEnrollment.mutateAsync({
          id: eid,
          data: {
            stage: nextStage.value,
            ...(sessionCompletedAt ? { sessionCompletedAt } : {}),
          },
        });
        ok++;
      } catch {
        failed++;
      }
    }
    setIsAdvancing(false);
    cancelSelectMode();
    if (failed === 0) {
      toast.success(`${ok} member${ok !== 1 ? 's' : ''} advanced to ${nextStage.label}`);
    } else {
      toast.warning(`${ok} advanced, ${failed} failed`);
    }
  }

  const { data: memberData } = useMembers(
    user?.homeBranchId
      ? { branchId: user.homeBranchId, limit: 500 }
      : undefined,
  );
  const branchMembers = memberData?.data ?? [];

  const enrollments = result?.data ?? [];
  const alerts = alertsResult?.data ?? [];

  const displayedEnrollments = enrollments.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const memberName = `${e.memberFirstName} ${e.memberLastName}`.toLowerCase();
    const teacherName = `${e.teacherFirstName ?? ''} ${e.teacherLastName ?? ''}`.toLowerCase();
    return memberName.includes(q) || teacherName.includes(q);
  });

  // Pool helpers
  const activeStudentIds = new Set(enrollments.map((e) => e.memberId));
  const activeTeacherIds = new Set(
    enrollments.filter((e) => e.teacherId).map((e) => e.teacherId!),
  );
  const activeMentorIds = new Set(
    enrollments.filter((e) => e.mentorId).map((e) => e.mentorId!),
  );

  // Member pool: not a current student, teacher, or mentor
  const memberPool = branchMembers.filter(
    (m) =>
      !activeStudentIds.has(m.id) &&
      !activeTeacherIds.has(m.id) &&
      !activeMentorIds.has(m.id),
  );

  // Teacher pool: not a current student (teachers can teach multiple students)
  const teacherPool = branchMembers.filter(
    (m) => !activeStudentIds.has(m.id) && m.id !== enrollForm.memberId,
  );

  // Mentor pool: not a current student, not the enrollee (mentors can mentor many)
  const mentorPool = branchMembers.filter(
    (m) => !activeStudentIds.has(m.id) && m.id !== enrollForm.memberId,
  );

  const byStage = STAGES.reduce<Record<string, typeof displayedEnrollments>>(
    (acc, s) => {
      acc[s.value] = displayedEnrollments.filter((e) => e.stage === s.value);
      return acc;
    },
    {},
  );

  async function handleEnroll() {
    if (!enrollForm.memberId || !user?.homeBranchId) return;
    try {
      await createEnrollment.mutateAsync({
        memberId: enrollForm.memberId,
        branchId: user.homeBranchId,
        teacherId: enrollForm.teacherId || undefined,
        mentorId: enrollForm.mentorId || undefined,
        notes: enrollForm.notes || undefined,
      });
      toast.success('Member enrolled in New Believers programme');
      setShowEnrollDialog(false);
      setEnrollForm({ memberId: '', memberName: '', teacherId: '', teacherName: '', mentorId: '', mentorName: '', notes: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll member');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">New Believers</h1>
            <p className="mt-1 text-sm text-purple-200">
              Journey tracking from enrolment to joining a department
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/new-believers/sessions"
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
            >
              Sessions
            </Link>
            {isAdminOrPastor && (
              <button
                onClick={() => setShowEnrollDialog(true)}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-purple-900 transition-colors hover:bg-purple-50"
              >
                + Enrol Member
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
            <p className="text-lg font-bold">{result?.total ?? 0}</p>
            <p className="text-xs text-purple-200">Active</p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
            <p className="text-lg font-bold text-amber-300">{alerts.length}</p>
            <p className="text-xs text-purple-200">No progress in 7+ days</p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
            <p className="text-lg font-bold">{byStage['integrated']?.length ?? 0}</p>
            <p className="text-xs text-purple-200">Joined a Department</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by member or teacher name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-white px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-900 dark:hover:text-gray-100"
          >
            ✕
          </button>
        )}
      </div>

      {/* Stale alert banner */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {alerts.length} enrolment{alerts.length !== 1 ? 's have' : ' has'} had no progress in over 7 days.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {alerts.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                href={`/new-believers/${e.id}`}
                className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-800/60"
              >
                {e.memberFirstName} {e.memberLastName}
              </Link>
            ))}
            {alerts.length > 5 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">+{alerts.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStage('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filterStage === ''
              ? 'bg-purple-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStage(s.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStage === s.value
                ? 'bg-purple-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {s.label}{s.topic ? ` · ${s.topic}` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading pipeline…</p>
        </div>
      ) : filterStage ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayedEnrollments.map((e) => (
            <Link key={e.id} href={`/new-believers/${e.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <p className="font-medium">
                    {e.memberFirstName} {e.memberLastName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {STAGES.find((s) => s.value === e.stage)?.label ?? e.stage}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: STAGES.length * 240 + 'px' }}>
            {STAGES.map((s) => (
              <StageColumn
                key={s.value}
                stage={s}
                enrollments={byStage[s.value] ?? []}
                canSelect={isAdminOrPastor && s.value !== 'integrated'}
                selectMode={selectStage === s.value}
                selectedIds={selectStage === s.value ? selectedIds : new Set()}
                isAdvancing={isAdvancing && selectStage === s.value}
                onEnterSelectMode={() => enterSelectMode(s.value)}
                onCancelSelectMode={cancelSelectMode}
                onToggle={toggleSelected}
                onAdvanceSelected={() => handleAdvanceSelected(s.value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enrol Member Dialog */}
      {showEnrollDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-4 text-lg font-semibold">Enrol Member in New Believers</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="enrol-member" className="mb-1 block text-sm font-medium">
                  Member
                </label>
                <MemberCombobox
                  id="enrol-member"
                  members={memberPool}
                  value={enrollForm.memberId}
                  onChange={(id, name) =>
                    setEnrollForm((f) => ({
                      ...f,
                      memberId: id,
                      memberName: name,
                      // clear teacher/mentor if they happen to be the same person
                      teacherId: f.teacherId === id ? '' : f.teacherId,
                      teacherName: f.teacherId === id ? '' : f.teacherName,
                      mentorId: f.mentorId === id ? '' : f.mentorId,
                      mentorName: f.mentorId === id ? '' : f.mentorName,
                    }))
                  }
                  placeholder="Type name to search…"
                />
              </div>

              <div>
                <label htmlFor="enrol-teacher" className="mb-1 block text-sm font-medium">
                  Assign Teacher
                </label>
                <MemberCombobox
                  id="enrol-teacher"
                  members={teacherPool}
                  value={enrollForm.teacherId}
                  onChange={(id, name) => setEnrollForm((f) => ({ ...f, teacherId: id, teacherName: name }))}
                  placeholder="Search teacher…"
                />
              </div>

              <div>
                <label htmlFor="enrol-mentor" className="mb-1 block text-sm font-medium">
                  Assign Mentor{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <MemberCombobox
                  id="enrol-mentor"
                  members={mentorPool}
                  value={enrollForm.mentorId}
                  onChange={(id, name) => setEnrollForm((f) => ({ ...f, mentorId: id, mentorName: name }))}
                  placeholder="Search mentor…"
                />
                {mentorPool.length === 0 && enrollments.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">All branch members are currently enrolled as students.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Notes{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  rows={2}
                  value={enrollForm.notes}
                  onChange={(e) => setEnrollForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEnrollDialog(false);
                  setEnrollForm({ memberId: '', memberName: '', teacherId: '', teacherName: '', mentorId: '', mentorName: '', notes: '' });
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={!enrollForm.memberId || !enrollForm.teacherId || createEnrollment.isPending}
                onClick={handleEnroll}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:opacity-50"
              >
                {createEnrollment.isPending ? 'Enrolling\u2026' : 'Enrol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewBelieversPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <NewBelieversContent />
    </Suspense>
  );
}
