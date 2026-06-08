'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@kairos/ui';
import {
  useEnrollments,
  useEnrollmentAlerts,
  useUpdateEnrollment,
  useBulkAdvanceEnrollments,
} from '@/hooks/use-new-believers';
import { useAuthStore } from '@/lib/auth-store';
import { useMembers } from '@/hooks/use-members';
import type { NewBelieverStageValue, EnrollmentListParams, UpdateEnrollmentRequest } from '@kairos/types';

import { STAGES, SESSION_STAGE_VALUES, MAX_BULK_SELECT } from './_components/stage-config';
import type { EnrollmentCardData } from './_components/types';
import { PipelineToolbar, type EnrollmentSortOption } from './_components/pipeline-toolbar';
import { BulkActionBar } from './_components/bulk-action-bar';
import { StageColumn } from './_components/stage-column';
import { EnrollmentCardDragPreview } from './_components/enrollment-card';
import { EnrollDialog } from './_components/enroll-dialog';
import { EnrollmentDetailDrawer } from './_components/enrollment-detail-drawer';
import { MemberJourneyView } from './_components/member-journey-view';

type PendingStageMove = {
  enrollmentId: string;
  fromStage: NewBelieverStageValue;
  toStage: NewBelieverStageValue;
  memberName: string;
};

function NewBelieversContent() {
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const canEdit = isAdminOrPastor || activeRole === 'leader';
  const isMember = activeRole === 'member';
  const queryClient = useQueryClient();

  // Selection state for bulk advance (souls-pattern)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<NewBelieverStageValue | ''>('');

  // Filters
  const [filterStage, setFilterStage] = useState<NewBelieverStageValue | ''>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<EnrollmentSortOption>('date-added');

  // Modals & drawer
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [drawerEnrollmentId, setDrawerEnrollmentId] = useState<string | null>(null);
  const [pendingStageMove, setPendingStageMove] = useState<PendingStageMove | null>(null);
  const [stageMoveFeedback, setStageMoveFeedback] = useState('');
  const [activeDragEnrollmentId, setActiveDragEnrollmentId] = useState<string | null>(null);

  // Track the undo toast so a fresh drop dismisses the stale one
  const undoToastRef = useRef<string | number | null>(null);

  const fetchParams: EnrollmentListParams = {
    page: 1,
    limit: 200,
    branchId: activeRole === 'admin' ? undefined : user?.homeBranchId,
    stage: filterStage || undefined,
    sortBy,
  };

  const { data: result, isLoading } = useEnrollments(fetchParams);
  const { data: alertsResult } = useEnrollmentAlerts();
  const updateEnrollment = useUpdateEnrollment();
  const bulkAdvance = useBulkAdvanceEnrollments();

  const { data: memberData } = useMembers(
    user?.homeBranchId ? { branchId: user.homeBranchId, limit: 500 } : undefined,
  );
  const branchMembers = useMemo(() => memberData?.data ?? [], [memberData?.data]);

  const enrollments = useMemo(
    () => (result?.data ?? []) as EnrollmentCardData[],
    [result?.data],
  );
  const alerts = alertsResult?.data ?? [];
  const myEnrollment = isMember
    ? enrollments.find((e) => e.memberId === user?.id)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Filter on the client by the search box (server already filters by stage / branch)
  const displayedEnrollments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e) => {
      const memberName = `${e.memberFirstName} ${e.memberLastName}`.toLowerCase();
      const teacherName = `${e.teacherFirstName ?? ''} ${e.teacherLastName ?? ''}`.toLowerCase();
      return memberName.includes(q) || teacherName.includes(q);
    });
  }, [enrollments, search]);

  const countsByStage = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const s of STAGES) acc[s.value] = 0;
    for (const e of displayedEnrollments) acc[e.stage] = (acc[e.stage] ?? 0) + 1;
    return acc;
  }, [displayedEnrollments]);

  const byStage = useMemo(() => {
    return STAGES.reduce<Record<string, EnrollmentCardData[]>>((acc, s) => {
      acc[s.value] = displayedEnrollments.filter((e) => e.stage === s.value);
      return acc;
    }, {});
  }, [displayedEnrollments]);
  const selectedEnrollments = useMemo(
    () => displayedEnrollments.filter((enrollment) => selectedIds.has(enrollment.id)),
    [displayedEnrollments, selectedIds],
  );
  const selectedRequiresIndividualFeedback = useMemo(
    () => selectedEnrollments.some((enrollment) => SESSION_STAGE_VALUES.has(enrollment.stage)),
    [selectedEnrollments],
  );
  const activeDragEnrollment = useMemo(
    () => enrollments.find((enrollment) => enrollment.id === activeDragEnrollmentId) ?? null,
    [activeDragEnrollmentId, enrollments],
  );

  // Pools for the enroll dialog (members not currently student / teacher / mentor)
  const activeStudentIds = useMemo(() => new Set(enrollments.map((e) => e.memberId)), [enrollments]);
  const activeTeacherIds = useMemo(
    () => new Set(enrollments.filter((e) => e.teacherId).map((e) => e.teacherId!)),
    [enrollments],
  );
  const activeMentorIds = useMemo(
    () => new Set(enrollments.filter((e) => e.mentorId).map((e) => e.mentorId!)),
    [enrollments],
  );

  const memberPool = useMemo(
    () =>
      branchMembers.filter(
        (m) => !activeStudentIds.has(m.id) && !activeTeacherIds.has(m.id) && !activeMentorIds.has(m.id),
      ),
    [branchMembers, activeStudentIds, activeTeacherIds, activeMentorIds],
  );
  const teacherPool = useMemo(
    () => branchMembers.filter((m) => !activeStudentIds.has(m.id)),
    [branchMembers, activeStudentIds],
  );
  const mentorPool = useMemo(
    () => branchMembers.filter((m) => !activeStudentIds.has(m.id)),
    [branchMembers, activeStudentIds],
  );

  // ── Selection handlers ──────────────────────────────────
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_BULK_SELECT) {
        toast.warning(`You can select up to ${MAX_BULK_SELECT} members at a time`);
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkTargetStage('');
  }

  function selectAllVisible() {
    const next = new Set<string>();
    for (const e of displayedEnrollments) {
      if (next.size >= MAX_BULK_SELECT) break;
      next.add(e.id);
    }
    setSelectedIds(next);
    if (next.size > 0 && displayedEnrollments.length > MAX_BULK_SELECT) {
      toast.warning(`Selected first ${MAX_BULK_SELECT} (cap)`);
    }
  }

  async function handleBulkAdvance() {
    if (selectedIds.size === 0 || !bulkTargetStage) return;
    if (selectedRequiresIndividualFeedback) {
      toast.warning('Session moves need individual feedback. Move one member at a time.');
      return;
    }
    try {
      const result = await bulkAdvance.mutateAsync({
        enrollmentIds: Array.from(selectedIds),
        targetStage: bulkTargetStage,
      });
      if (result.failed === 0) {
        toast.success(`${result.advanced} member${result.advanced !== 1 ? 's' : ''} advanced`);
      } else {
        toast.warning(`${result.advanced} advanced, ${result.failed} failed`);
      }
      clearSelection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bulk advance failed');
    }
  }

  // ── Drag and drop ──────────────────────────────────────
  function resetPendingStageMove() {
    setPendingStageMove(null);
    setStageMoveFeedback('');
  }

  async function commitStageMove(move: PendingStageMove, feedback?: string) {
    const nextStage = STAGES.find((s) => s.value === move.toStage);
    if (!nextStage) return false;

    if (undoToastRef.current !== null) {
      toast.dismiss(undoToastRef.current);
      undoToastRef.current = null;
    }

    const feedbackText = feedback?.trim();
    const data: UpdateEnrollmentRequest = { stage: move.toStage };
    if (SESSION_STAGE_VALUES.has(move.fromStage) && feedbackText) {
      data.sessionCompletedAt = { [move.fromStage]: new Date().toISOString() };
      data.sessionFeedback = { [move.fromStage]: feedbackText };
    }

    try {
      await updateEnrollment.mutateAsync({
        id: move.enrollmentId,
        data,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance');
      return false;
    }

    let undone = false;
    const toastId = toast(`${move.memberName} → ${nextStage.label}`, {
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
            } catch {
              /* retry */
            }
          }
          if (reversed) {
            toast.success('Move undone');
          } else {
            toast.error('Could not undo — please refresh the page');
            void queryClient.invalidateQueries();
          }
        },
      },
    });
    undoToastRef.current = toastId;
    setTimeout(() => {
      if (!undone) undoToastRef.current = null;
    }, 5500);
    return true;
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

    await commitStageMove(move);
  }

  // ── Render branches ────────────────────────────────────
  const pendingMoveFromStage = pendingStageMove
    ? STAGES.find((s) => s.value === pendingStageMove.fromStage)
    : undefined;
  const pendingMoveToStage = pendingStageMove
    ? STAGES.find((s) => s.value === pendingStageMove.toStage)
    : undefined;

  if (isMember) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">New Believers</h1>
          <p className="text-muted-foreground">
            Your journey through the New Believers programme
          </p>
        </header>

        {isLoading ? (
          <div aria-busy="true" aria-live="polite" className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
            <span className="sr-only">Loading your progress</span>
          </div>
        ) : myEnrollment ? (
          <MemberJourneyView enrollment={myEnrollment} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              You are not currently enrolled in the New Believers programme.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Speak to your pastor or branch leader to get started.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">New Believers</h1>
          <p className="text-muted-foreground">
            Journey tracking from enrolment to joining a department
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/new-believers/sessions"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/5 transition-colors"
          >
            Sessions
          </Link>
          {isAdminOrPastor && (
            <Button
              onClick={() => setShowEnrollDialog(true)}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Enrol Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border bg-card px-4 py-2.5">
          <p className="text-2xl font-bold">{result?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2.5">
          <p className="text-2xl font-bold text-[#f8b537]">{alerts.length}</p>
          <p className="text-xs text-muted-foreground">No progress in 7+ days</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2.5">
          <p className="text-2xl font-bold text-[#f8b537]">{byStage['integrated']?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Joined a Department</p>
        </div>
      </div>

      <PipelineToolbar
        search={search}
        onSearchChange={setSearch}
        filterStage={filterStage}
        onFilterStageChange={setFilterStage}
        sortBy={sortBy}
        onSortChange={setSortBy}
        countsByStage={countsByStage}
        totalCount={displayedEnrollments.length}
        canBulkSelect={canEdit}
        hasSelection={selectedIds.size > 0}
        onSelectAllVisible={selectAllVisible}
        onDeselectAll={clearSelection}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        targetStage={bulkTargetStage}
        onTargetStageChange={setBulkTargetStage}
        onAdvance={handleBulkAdvance}
        onClear={clearSelection}
        isAdvancing={bulkAdvance.isPending}
        requiresIndividualFeedback={selectedRequiresIndividualFeedback}
      />

      {/* Stale alert banner */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-[#f8b537]/40 bg-[#f8b537]/10 px-4 py-3">
          <p className="text-sm font-medium text-[#f8b537]">
            {alerts.length} enrolment{alerts.length !== 1 ? 's have' : ' has'} had no progress in over 7 days.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {alerts.slice(0, 5).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setDrawerEnrollmentId(e.id)}
                className="rounded bg-[#f8b537]/20 px-2 py-0.5 text-xs font-medium text-[#f8b537] hover:bg-[#f8b537]/30"
              >
                {e.memberFirstName} {e.memberLastName}
              </button>
            ))}
            {alerts.length > 5 && (
              <span className="text-xs font-medium text-[#f8b537]">
                +{alerts.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div aria-busy="true" aria-live="polite" className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-2 rounded-lg border bg-card p-3">
              <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
              <div className="h-20 animate-pulse rounded bg-muted/60" />
              <div className="h-20 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
          <span className="sr-only">Loading pipeline</span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {STAGES.map((s) => (
              <StageColumn
                key={s.value}
                stage={s}
                enrollments={byStage[s.value] ?? []}
                canDrag={canEdit && s.value !== 'integrated' && selectedIds.size === 0}
                canSelect={canEdit && s.value !== 'integrated'}
                selectedIds={selectedIds}
                selectionAtCap={selectedIds.size >= MAX_BULK_SELECT}
                onToggleSelect={toggleSelected}
                onOpenDrawer={setDrawerEnrollmentId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragEnrollment ? (
              <EnrollmentCardDragPreview enrollment={activeDragEnrollment} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog
        open={!!pendingStageMove}
        onOpenChange={(open) => {
          if (!open) resetPendingStageMove();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Session Feedback Required</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Record feedback for {pendingStageMove?.memberName ?? 'this member'} before moving
              from {pendingMoveFromStage?.label ?? 'this session'} to{' '}
              {pendingMoveToStage?.label ?? 'the next stage'}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Session Feedback <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={4}
              placeholder="How did the session go? Any observations about the student's progress?"
              value={stageMoveFeedback}
              onChange={(e) => setStageMoveFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetPendingStageMove}>
              Cancel
            </Button>
            <Button
              disabled={!stageMoveFeedback.trim() || updateEnrollment.isPending}
              onClick={handleConfirmStageMove}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              {updateEnrollment.isPending ? 'Saving...' : 'Confirm Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdminOrPastor && user?.homeBranchId && (
        <EnrollDialog
          open={showEnrollDialog}
          onOpenChange={setShowEnrollDialog}
          branchId={user.homeBranchId}
          memberPool={memberPool}
          teacherPool={teacherPool}
          mentorPool={mentorPool}
          allBranchMembers={branchMembers}
        />
      )}

      <EnrollmentDetailDrawer
        enrollmentId={drawerEnrollmentId}
        onClose={() => setDrawerEnrollmentId(null)}
        branchMembers={branchMembers}
      />
    </div>
  );
}

export default function NewBelieversPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <NewBelieversContent />
    </Suspense>
  );
}
