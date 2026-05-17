'use client';

import { Suspense, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
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

type EnrollmentCard = {
  id: string;
  memberId: string;
  stage: string;
  memberFirstName: string;
  memberLastName: string;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
  mentorFirstName?: string | null;
  mentorLastName?: string | null;
  enrolledAt: string | Date;
  updatedAt: string | Date;
};

function DraggableCard({
  enrollment,
  stageValue,
  isDraggable,
  selectMode = false,
  isSelected = false,
  onToggle,
}: {
  enrollment: EnrollmentCard;
  stageValue: string;
  isDraggable: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: enrollment.id,
    data: { stage: stageValue },
    disabled: !isDraggable || selectMode,
  });

  if (selectMode) {
    return (
      <div
        onClick={onToggle}
        className={`cursor-pointer rounded-xl border p-3 select-none transition-all ${
          isSelected
            ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/40'
            : 'border-gray-200 bg-white hover:border-purple-300 dark:border-gray-700 dark:bg-gray-800'
        }`}
      >
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
            isSelected
              ? 'border-purple-600 bg-purple-600 text-white'
              : 'border-gray-400 dark:border-gray-500'
          }`}>
            {isSelected && '✓'}
          </div>
          <div>
            <p className="text-sm font-medium">
              {enrollment.memberFirstName} {enrollment.memberLastName}
            </p>
            {(enrollment.teacherFirstName || enrollment.teacherLastName) && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      className={`rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800 select-none transition-all ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-30' : 'hover:shadow-md'}`}
    >
      <Link href={`/new-believers/${enrollment.id}`} className="block p-3">
        <p className="text-sm font-medium">
          {enrollment.memberFirstName} {enrollment.memberLastName}
        </p>
        {(enrollment.teacherFirstName || enrollment.teacherLastName) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Teacher: {enrollment.teacherFirstName} {enrollment.teacherLastName}
          </p>
        )}
        {enrollment.mentorFirstName && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mentor: {enrollment.mentorFirstName} {enrollment.mentorLastName}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
        </p>
      </Link>
    </div>
  );
}

function StageColumn({
  stage,
  enrollments,
  canDrag,
  isDropTarget,
  canBulkAdvance,
  selectMode,
  selectedIds,
  isAdvancing,
  onEnterSelectMode,
  onCancelSelectMode,
  onToggle,
  onAdvanceSelected,
}: {
  stage: { value: NewBelieverStageValue; label: string; topic?: string };
  enrollments: EnrollmentCard[];
  canDrag: boolean;
  isDropTarget: boolean;
  canBulkAdvance: boolean;
  selectMode: boolean;
  selectedIds: Set<string>;
  isAdvancing: boolean;
  onEnterSelectMode: () => void;
  onCancelSelectMode: () => void;
  onToggle: (id: string) => void;
  onAdvanceSelected: () => void;
}) {
  const colorClass = STAGE_COLORS[stage.value];
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });
  const nextStage = STAGES[STAGES.findIndex((s) => s.value === stage.value) + 1];
  const selectedCount = selectedIds.size;

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
          {canBulkAdvance && !selectMode && enrollments.length > 0 && (
            <button
              onClick={onEnterSelectMode}
              title={`Select up to ${MAX_SELECT} members to advance together`}
              className="ml-2 rounded px-2 py-0.5 text-xs font-medium bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
            >
              Bulk ▸
            </button>
          )}
        </div>
        {stage.topic && (
          <p className="mt-0.5 text-xs opacity-70">{stage.topic}</p>
        )}
      </div>

      {/* Bulk-select action bar */}
      {selectMode && (
        <div className="flex items-center justify-between rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-950/40">
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
            {selectedCount}/{MAX_SELECT}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={onCancelSelectMode}
              className="rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/40"
            >
              Cancel
            </button>
            {nextStage && (
              <button
                disabled={selectedCount === 0 || isAdvancing}
                onClick={onAdvanceSelected}
                className="rounded bg-purple-700 px-2 py-1 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-40"
              >
                {isAdvancing
                  ? 'Moving…'
                  : `Advance ${selectedCount > 0 ? selectedCount : ''} → ${nextStage.label}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[80px] flex-col gap-2 rounded-lg transition-colors ${
          isOver && isDropTarget
            ? 'bg-purple-50 ring-2 ring-purple-400 dark:bg-purple-950/30 dark:ring-purple-600'
            : ''
        }`}
      >
        {enrollments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No enrollments
          </p>
        ) : (
          enrollments.map((e) => (
            <DraggableCard
              key={e.id}
              enrollment={e}
              stageValue={stage.value}
              isDraggable={canDrag && !selectMode}
              selectMode={selectMode}
              isSelected={selectedIds.has(e.id)}
              onToggle={() => onToggle(e.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MyEnrollmentView({ enrollment }: { enrollment: EnrollmentCard }) {
  const currentIdx = STAGES.findIndex((s) => s.value === enrollment.stage);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${
          STAGE_COLORS[enrollment.stage as NewBelieverStageValue] ?? 'bg-gray-100 text-gray-700'
        }`}>
          {STAGES.find((s) => s.value === enrollment.stage)?.label ?? enrollment.stage}
        </span>
        <span className="text-sm text-muted-foreground">
          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex gap-1">
          {STAGES.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-colors ${
                idx <= currentIdx ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Enrolled</span>
          <span>Joined a Department</span>
        </div>
      </div>

      {/* Journey checklist */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Your Journey</h3>
          <ol className="space-y-2">
            {STAGES.map((s, idx) => {
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <li key={s.value} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-purple-700 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <div>
                    <p className={`text-sm ${
                      isCurrent
                        ? 'font-semibold text-purple-700 dark:text-purple-400'
                        : isDone
                        ? 'text-muted-foreground line-through'
                        : 'text-muted-foreground'
                    }`}>
                      {s.label}
                    </p>
                    {s.topic && (
                      <p className="text-xs text-muted-foreground">{s.topic}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Support team */}
      {(enrollment.teacherFirstName || enrollment.mentorFirstName) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Your Support Team</h3>
            <dl className="space-y-2 text-sm">
              {enrollment.teacherFirstName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Teacher</dt>
                  <dd className="font-medium">{enrollment.teacherFirstName} {enrollment.teacherLastName}</dd>
                </div>
              )}
              {enrollment.mentorFirstName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Mentor</dt>
                  <dd className="font-medium">{enrollment.mentorFirstName} {enrollment.mentorLastName}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NewBelieversContent() {
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const canEdit = isAdminOrPastor || activeRole === 'leader';
  const isMember = activeRole === 'member';
  const queryClient = useQueryClient();

  // Bulk-advance select mode
  const [selectStage, setSelectStage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Ref for dismissing pending undo toasts before a new drag starts
  const undoToastRef = useRef<string | number | null>(null);

  // Board-level session feedback modal (required before advancing a session card)
  const [showBoardFeedbackModal, setShowBoardFeedbackModal] = useState(false);
  const [boardFeedback, setBoardFeedback] = useState('');
  // Board-level dept picker modal (required before advancing to integrated)
  const [showBoardDeptModal, setShowBoardDeptModal] = useState(false);
  const [boardDeptId, setBoardDeptId] = useState('');
  // Pending advance waiting for a modal confirmation
  type PendingAdvance =
    | { type: 'drag'; enrollmentId: string; fromStage: string; toStage: string; memberName: string }
    | { type: 'bulk'; ids: string[]; fromStage: string; toStage: string };
  const [pendingAdvance, setPendingAdvance] = useState<PendingAdvance | null>(null);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: deptData } = useQuery({
    queryKey: ['departments', user?.homeBranchId],
    queryFn: async () => {
      const res = await api.departments.list({ branchId: user!.homeBranchId! });
      return (res.data as { data?: { id: string; departmentName: string }[] })?.data ?? [];
    },
    enabled: !!user?.homeBranchId,
  });
  const boardDepartments: { id: string; departmentName: string }[] = deptData ?? [];

  function enterSelectMode(stageValue: string) {
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
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= MAX_SELECT) {
        toast.warning(`You can select up to ${MAX_SELECT} members at a time`);
        return prev;
      }
      next.add(id);
      return next;
    });
  }
  async function handleAdvanceSelected(stageValue: string) {
    const fromIdx = STAGES.findIndex((s) => s.value === stageValue);
    const nextStage = STAGES[fromIdx + 1];
    if (!nextStage || selectedIds.size === 0) return;

    // If advancing from a session stage → require feedback first
    if (SESSION_STAGE_VALUES.has(stageValue)) {
      setPendingAdvance({ type: 'bulk', ids: [...selectedIds], fromStage: stageValue, toStage: nextStage.value });
      setBoardFeedback('');
      setShowBoardFeedbackModal(true);
      return;
    }

    // If advancing to 'integrated' → require dept selection first
    if (nextStage.value === 'integrated') {
      setPendingAdvance({ type: 'bulk', ids: [...selectedIds], fromStage: stageValue, toStage: nextStage.value });
      setBoardDeptId('');
      setShowBoardDeptModal(true);
      return;
    }

    // Regular bulk advance (not a session stage, not going to integrated)
    setIsAdvancing(true);
    let ok = 0, failed = 0;
    for (const eid of selectedIds) {
      try {
        await updateEnrollment.mutateAsync({ id: eid, data: { stage: nextStage.value } });
        ok++;
      } catch { failed++; }
    }
    setIsAdvancing(false);
    cancelSelectMode();
    if (failed === 0) toast.success(`${ok} member${ok !== 1 ? 's' : ''} advanced to ${nextStage.label}`);
    else toast.warning(`${ok} advanced, ${failed} failed`);
  }

  async function doAdvanceDrag(
    enrollmentId: string,
    fromStage: string,
    toStage: string,
    memberName: string,
    feedback: string | undefined,
    deptId: string | undefined,
  ) {
    const sessionCompletedAt = SESSION_STAGE_VALUES.has(fromStage)
      ? { [fromStage]: new Date().toISOString() }
      : undefined;
    const sessionFeedback = feedback ? { [fromStage]: feedback } : undefined;

    try {
      await updateEnrollment.mutateAsync({
        id: enrollmentId,
        data: {
          stage: toStage as NewBelieverStageValue,
          ...(sessionCompletedAt ? { sessionCompletedAt } : {}),
          ...(sessionFeedback ? { sessionFeedback } : {}),
          ...(deptId ? { joinedDepartmentId: deptId } : {}),
        },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance');
      return false;
    }

    const nextLabel = STAGES.find((s) => s.value === toStage)?.label ?? toStage;
    let undone = false;
    const toastId = toast(`${memberName} → ${nextLabel}`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          undone = true;
          toast.dismiss(toastId);
          undoToastRef.current = null;
          const delays = [0, 500, 1500];
          let reversed = false;
          for (const delay of delays) {
            if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
            try {
              await updateEnrollment.mutateAsync({
                id: move.enrollmentId,
                data: { stage: move.fromStage },
              });
              reversed = true;
              break;
            } catch { /* retry */ }
          }
          if (reversed) toast.success('Move undone');
          else {
            toast.error('Could not undo — please refresh the page');
            void queryClient.invalidateQueries();
          }
        },
      },
    });
    undoToastRef.current = toastId;
    setTimeout(() => { if (!undone) undoToastRef.current = null; }, 5500);
  }

  async function handleConfirmStageMove() {
    if (!pendingStageMove || !stageMoveFeedback.trim()) return;
    const moved = await commitStageMove(pendingStageMove, stageMoveFeedback);
    if (moved) resetPendingStageMove();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragEnrollmentId(event.active.id as string);
  }

  function handleDragCancel() {
    setActiveDragEnrollmentId(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragEnrollmentId(null);
    if (!over) return;

    const fromStage = (active.data.current as { stage: NewBelieverStageValue }).stage;
    const toStage = over.id as NewBelieverStageValue;
    const fromIdx = STAGES.findIndex((s) => s.value === fromStage);
    const toIdx = STAGES.findIndex((s) => s.value === toStage);
    if (toIdx !== fromIdx + 1) return;

    const enrollmentId = active.id as string;
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    const memberName = enrollment
      ? `${enrollment.memberFirstName} ${enrollment.memberLastName}`
      : 'Member';

    const move: PendingStageMove = {
      enrollmentId,
      fromStage,
      toStage,
      memberName,
    };

    if (SESSION_STAGE_VALUES.has(fromStage)) {
      const completedMap = (enrollment?.sessionCompletedAt ?? {}) as Record<string, string>;
      const feedbackMap = (enrollment?.sessionFeedback ?? {}) as Record<string, string>;
      const existingFeedback = feedbackMap[fromStage]?.trim() ?? '';
      if (!completedMap[fromStage] || !existingFeedback) {
        if (undoToastRef.current !== null) {
          toast.dismiss(undoToastRef.current);
          undoToastRef.current = null;
        }
        setPendingStageMove(move);
        setStageMoveFeedback(existingFeedback);
        return;
      }
    }

    // If moving TO 'integrated' → require dept selection first
    if (nextStage.value === 'integrated') {
      setPendingAdvance({ type: 'drag', enrollmentId, fromStage, toStage: nextStage.value, memberName });
      setBoardDeptId('');
      setShowBoardDeptModal(true);
      return;
    }

    await doAdvanceDrag(enrollmentId, fromStage, nextStage.value, memberName, undefined, undefined);
  }

  const { data: memberData } = useMembers(
    user?.homeBranchId
      ? { branchId: user.homeBranchId, limit: 500 }
      : undefined,
  );
  const branchMembers = (memberData?.data ?? []).filter(
    (m) => m.systemRole !== 'admin' && m.systemRole !== 'pastor',
  );

  const enrollments = result?.data ?? [];
  const alerts = alertsResult?.data ?? [];
  const myEnrollment = isMember
    ? (enrollments as EnrollmentCard[]).find((e) => e.memberId === user?.id)
    : null;

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
              {isMember
                ? 'Your journey through the New Believers programme'
                : 'Journey tracking from enrolment to joining a department'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isMember && (
              <Link
                href="/new-believers/sessions"
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
              >
                Sessions
              </Link>
            )}
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

        {/* Stats row — hidden for members */}
        {!isMember && (
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
        )}
      </div>

      {isMember ? (
        /* ── Member personal view ── */
        isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading your progress…</p>
          </div>
        ) : myEnrollment ? (
          <MyEnrollmentView enrollment={myEnrollment as EnrollmentCard} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              You are not currently enrolled in the New Believers programme.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Speak to your pastor or branch leader to get started.
            </p>
          </div>
        )
      ) : (
        <>
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
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4" style={{ minWidth: STAGES.length * 240 + 'px' }}>
                  {STAGES.map((s) => (
                    <StageColumn
                      key={s.value}
                      stage={s}
                      enrollments={byStage[s.value] ?? []}
                      canDrag={canEdit && s.value !== 'integrated' && selectStage !== s.value}
                      isDropTarget={canEdit && s.value !== 'enrolled'}
                      canBulkAdvance={canEdit && s.value !== 'integrated'}
                      selectMode={selectStage === s.value}
                      selectedIds={selectStage === s.value ? selectedIds : new Set<string>()}
                      isAdvancing={isAdvancing && selectStage === s.value}
                      onEnterSelectMode={() => enterSelectMode(s.value)}
                      onCancelSelectMode={cancelSelectMode}
                      onToggle={toggleSelected}
                      onAdvanceSelected={() => handleAdvanceSelected(s.value)}
                    />
                  ))}
                </div>
              </div>
            </DndContext>
          )}
        </>
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
                  Assign Mentor
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
                {enrollForm.mentorId && !branchMembers.find((m) => m.id === enrollForm.mentorId)?.email && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    ⚠ This member has no email address on file — they won&apos;t receive an assignment notification.
                  </p>
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
                disabled={!enrollForm.memberId || !enrollForm.teacherId || !enrollForm.mentorId || createEnrollment.isPending}
                onClick={handleEnroll}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:opacity-50"
              >
                {createEnrollment.isPending ? 'Enrolling\u2026' : 'Enrol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board — Session Feedback Modal */}
      {showBoardFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-1 text-lg font-semibold">Session Feedback</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Add optional feedback before advancing{' '}
              {pendingAdvance?.type === 'bulk' ? 'these members' : 'this member'} past{' '}
              {STAGES.find((s) => s.value === pendingAdvance?.fromStage)?.label ?? pendingAdvance?.fromStage}.
            </p>
            <textarea
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              rows={3}
              placeholder="How did the session go? (optional)"
              value={boardFeedback}
              onChange={(e) => setBoardFeedback(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowBoardFeedbackModal(false); setPendingAdvance(null); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={!boardFeedback.trim()}
                onClick={handleConfirmBoardFeedback}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
              >
                Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board — Dept Picker Modal (→ Integrated) */}
      {showBoardDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-1 text-lg font-semibold">Assign to Department</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Select the department{' '}
              {pendingAdvance?.type === 'bulk' ? 'these members are' : 'this member is'} joining.
            </p>
            <label className="mb-1 block text-sm font-medium">
              Department <span className="text-destructive">*</span>
            </label>
            {!deptData ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Loading departments…</p>
            ) : boardDepartments.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No departments configured for this branch yet.
              </p>
            ) : (
              <select
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                value={boardDeptId}
                onChange={(e) => setBoardDeptId(e.target.value)}
              >
                <option value="">Select department…</option>
                {boardDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.departmentName}</option>
                ))}
              </select>
            )}
            {boardDeptId && (
              <p className="mt-3 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                ✓ Assigning{' '}
                {pendingAdvance?.type === 'bulk'
                  ? `${pendingAdvance.ids.length} member(s)`
                  : pendingAdvance?.type === 'drag'
                  ? pendingAdvance.memberName
                  : 'member(s)'}{' '}
                to{' '}
                <span className="font-semibold">
                  {boardDepartments.find((d) => d.id === boardDeptId)?.departmentName}
                </span>.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowBoardDeptModal(false); setPendingAdvance(null); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={!boardDeptId}
                onClick={handleConfirmBoardDept}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
              >
                Confirm &amp; Advance
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
