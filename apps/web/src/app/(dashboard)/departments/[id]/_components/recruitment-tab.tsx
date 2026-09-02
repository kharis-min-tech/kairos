'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  CustomSelect,
  Textarea,
  Input,
  Label,
  NumberStepper,
  TimeSelect,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { MemberAvatar } from '@/components/member-avatar';
import {
  useScheduleDepartmentInterview,
  useRecordDepartmentInterview,
  useExtendDepartmentOffer,
  useRejectDepartmentJoinRequest,
  useEvaluateDepartmentProbation,
} from '@/hooks/use-departments';
import type {
  DepartmentJoinRequestWithMember,
  MemberWithBranch,
} from '@kairos/types';
import {
  canDragRecruitmentRequest,
  getRecruitmentDropRule,
  type RecruitmentDragAction,
  type RecruitmentDragRequest,
} from './recruitment-drag-rules';

const OPEN_STATUSES = [
  'applied',
  'interview_scheduled',
  'interviewed',
  'offered',
  'probation',
] as const;

type OpenStatus = (typeof OPEN_STATUSES)[number];

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  interview_scheduled: 'Interview Scheduled',
  interviewed: 'Interviewed',
  offered: 'Offer Extended',
  probation: 'On Probation',
  active: 'Active Member',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  probation_failed: 'Probation Failed',
};

// Stage accent colours used for the dot beside the candidate name
const STAGE_DOT: Record<OpenStatus, string> = {
  applied: 'bg-slate-400',
  interview_scheduled: 'bg-sky-500',
  interviewed: 'bg-amber-500',
  offered: 'bg-[#f8b537]',
  probation: 'bg-emerald-500',
};

type SortKey = 'date_added' | 'name' | 'last_activity';

function lastActivityAt(r: DepartmentJoinRequestWithMember): number {
  const candidates = [
    r.reviewedAt,
    r.interviewScheduledAt,
    r.offeredAt,
    r.offerRespondedAt,
    r.updatedAt,
    r.createdAt,
  ];
  for (const c of candidates) {
    if (c) return new Date(c).getTime();
  }
  return 0;
}

function daysAgo(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatStageDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function formatStageDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function interviewerName(r: DepartmentJoinRequestWithMember): string | null {
  if (r.interviewerOneFirstName) {
    const last = r.interviewerOneLastName ? ` ${r.interviewerOneLastName.charAt(0)}.` : '';
    return `${r.interviewerOneFirstName}${last}`;
  }
  return null;
}

interface Props {
  branchDeptId: string;
  defaultProbationDays: number;
  branchMembers: MemberWithBranch[];
  joinRequests: DepartmentJoinRequestWithMember[];
  canManage: boolean;
}

type DialogMode =
  | { kind: 'schedule'; request: DepartmentJoinRequestWithMember }
  | { kind: 'record'; request: DepartmentJoinRequestWithMember }
  | { kind: 'offer'; request: DepartmentJoinRequestWithMember }
  | { kind: 'reject'; request: DepartmentJoinRequestWithMember }
  | { kind: 'probation'; request: DepartmentJoinRequestWithMember }
  | { kind: 'detail'; request: DepartmentJoinRequestWithMember }
  | null;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RecruitmentTab({
  branchDeptId,
  defaultProbationDays,
  branchMembers,
  joinRequests,
  canManage,
}: Props) {
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date_added');
  const [activeDragRequest, setActiveDragRequest] =
    useState<DepartmentJoinRequestWithMember | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const schedule = useScheduleDepartmentInterview();
  const record = useRecordDepartmentInterview();
  const extendOffer = useExtendDepartmentOffer();
  const reject = useRejectDepartmentJoinRequest();
  const evaluateProbation = useEvaluateDepartmentProbation();

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return joinRequests;
    return joinRequests.filter((r) => {
      const name = `${r.memberFirstName} ${r.memberLastName}`.toLowerCase();
      const phone = (r.memberPhone ?? '').toLowerCase();
      return name.includes(needle) || phone.includes(needle);
    });
  }, [joinRequests, search]);

  const sortedOpen = useMemo(() => {
    const open = filtered.filter((r) =>
      (OPEN_STATUSES as readonly string[]).includes(r.status),
    );
    const sorted = [...open];
    if (sort === 'name') {
      sorted.sort((a, b) =>
        `${a.memberFirstName} ${a.memberLastName}`.localeCompare(
          `${b.memberFirstName} ${b.memberLastName}`,
        ),
      );
    } else if (sort === 'last_activity') {
      sorted.sort((a, b) => lastActivityAt(b) - lastActivityAt(a));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return sorted;
  }, [filtered, sort]);

  const columns = useMemo(() => {
    const grouped: Record<OpenStatus, DepartmentJoinRequestWithMember[]> = {
      applied: [],
      interview_scheduled: [],
      interviewed: [],
      offered: [],
      probation: [],
    };
    for (const r of sortedOpen) {
      grouped[r.status as OpenStatus].push(r);
    }
    return grouped;
  }, [sortedOpen]);

  const terminal = useMemo(
    () =>
      filtered.filter(
        (r) => !(OPEN_STATUSES as readonly string[]).includes(r.status),
      ),
    [filtered],
  );

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Only the department lead, deputy, branch pastor, or admin can manage recruitment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalOpen = sortedOpen.length;

  function openRecruitmentAction(
    action: RecruitmentDragAction,
    request: DepartmentJoinRequestWithMember,
  ) {
    if (action === 'schedule') setDialog({ kind: 'schedule', request });
    if (action === 'record') setDialog({ kind: 'record', request });
    if (action === 'offer') setDialog({ kind: 'offer', request });
  }

  function handleDragStart(event: DragStartEvent) {
    const request = sortedOpen.find((r) => r.id === event.active.id);
    if (request) setActiveDragRequest(request);
  }

  function handleDragCancel() {
    setActiveDragRequest(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragRequest(null);
    if (!over) return;

    const request = sortedOpen.find((r) => r.id === active.id);
    if (!request) return;

    const dropRule = getRecruitmentDropRule(request, over.id as string);
    if (!dropRule.allowed || !dropRule.action) {
      if (dropRule.reason) toast.error(dropRule.reason);
      return;
    }
    openRecruitmentAction(dropRule.action, request);
  }

  return (
    <div className="space-y-4">
      {/* Search + Sort toolbar — matches Souls Pipeline layout */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name or phone…"
            className="pl-10"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sort
          </span>
          <div className="flex rounded-xl bg-[#f0f0f3] p-1 dark:bg-white/[0.06]">
            <SortTab active={sort === 'date_added'} onClick={() => setSort('date_added')}>
              Date Added
            </SortTab>
            <SortTab active={sort === 'name'} onClick={() => setSort('name')}>
              Name
            </SortTab>
            <SortTab active={sort === 'last_activity'} onClick={() => setSort('last_activity')}>
              Last Activity
            </SortTab>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {totalOpen} open candidate{totalOpen === 1 ? '' : 's'}
        {search.trim() ? ` matching "${search.trim()}"` : ''}
      </p>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Kanban columns — horizontal scroll like Souls Pipeline */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          <RecruitmentColumn
            title="Applied"
            status="applied"
            requests={columns.applied}
            onAction={(req) => setDialog({ kind: 'schedule', request: req })}
            actionLabel="Schedule Interview"
            onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
            secondaryLabel="Reject"
            onOpenDetail={(req) => setDialog({ kind: 'detail', request: req })}
          />
          <RecruitmentColumn
            title="Interview Scheduled"
            status="interview_scheduled"
            requests={columns.interview_scheduled}
            onAction={(req) => setDialog({ kind: 'record', request: req })}
            actionLabel="Record Interview"
            onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
            secondaryLabel="Reject"
            onOpenDetail={(req) => setDialog({ kind: 'detail', request: req })}
          />
          <RecruitmentColumn
            title="Interviewed"
            status="interviewed"
            requests={columns.interviewed}
            onAction={(req) => setDialog({ kind: 'offer', request: req })}
            actionLabel="Extend Offer"
            actionDisabled={(req) => req.interviewOutcome !== 'pass'}
            onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
            secondaryLabel="Reject"
            onOpenDetail={(req) => setDialog({ kind: 'detail', request: req })}
          />
          <RecruitmentColumn
            title="Offer Extended"
            status="offered"
            requests={columns.offered}
            actionLabel={null}
            onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
            secondaryLabel="Withdraw Offer"
            onOpenDetail={(req) => setDialog({ kind: 'detail', request: req })}
          />
          <RecruitmentColumn
            title="On Probation"
            status="probation"
            requests={columns.probation}
            onAction={(req) => setDialog({ kind: 'probation', request: req })}
            actionLabel="Evaluate"
            onOpenDetail={(req) => setDialog({ kind: 'detail', request: req })}
          />
        </div>
        <DragOverlay>
          {activeDragRequest ? (
            <CandidateCard
              request={activeDragRequest}
              status={activeDragRequest.status as OpenStatus}
              variant="preview"
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {terminal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {terminal.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md p-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    photoUrl={r.memberPhotoUrl}
                    firstName={r.memberFirstName}
                    lastName={r.memberLastName}
                    size="xs"
                  />
                  <span>
                    {r.memberFirstName} {r.memberLastName}
                  </span>
                </div>
                <span className="rounded-full bg-[#f0f0f3] px-2 py-0.5 text-xs text-muted-foreground dark:bg-white/[0.06]">
                  {STAGE_LABELS[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dialog?.kind === 'schedule' && (
        <ScheduleInterviewDialog
          branchDeptId={branchDeptId}
          request={dialog.request}
          branchMembers={branchMembers}
          onClose={() => setDialog(null)}
          mutation={schedule}
        />
      )}
      {dialog?.kind === 'record' && (
        <RecordInterviewDialog
          branchDeptId={branchDeptId}
          request={dialog.request}
          onClose={() => setDialog(null)}
          mutation={record}
        />
      )}
      {dialog?.kind === 'offer' && (
        <ExtendOfferDialog
          branchDeptId={branchDeptId}
          request={dialog.request}
          defaultProbationDays={defaultProbationDays}
          onClose={() => setDialog(null)}
          mutation={extendOffer}
        />
      )}
      {dialog?.kind === 'reject' && (
        <RejectDialog
          branchDeptId={branchDeptId}
          request={dialog.request}
          onClose={() => setDialog(null)}
          mutation={reject}
        />
      )}
      {dialog?.kind === 'probation' && (
        <EvaluateProbationDialog
          branchDeptId={branchDeptId}
          request={dialog.request}
          onClose={() => setDialog(null)}
          mutation={evaluateProbation}
        />
      )}
      {dialog?.kind === 'detail' && (
        <CandidateDetailDialog
          request={dialog.request}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────

interface ColumnProps {
  title: string;
  status: OpenStatus;
  requests: DepartmentJoinRequestWithMember[];
  actionLabel?: string | null;
  onAction?: (req: DepartmentJoinRequestWithMember) => void;
  actionDisabled?: (req: DepartmentJoinRequestWithMember) => boolean;
  secondaryLabel?: string;
  onSecondary?: (req: DepartmentJoinRequestWithMember) => void;
  onOpenDetail?: (req: DepartmentJoinRequestWithMember) => void;
}

function RecruitmentColumn({
  title,
  status,
  requests,
  actionLabel,
  onAction,
  actionDisabled,
  secondaryLabel,
  onSecondary,
  onOpenDetail,
}: ColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id: status });
  const activeRequest = active?.data.current as RecruitmentDragRequest | undefined;
  const dropRule = getRecruitmentDropRule(activeRequest, status);
  const isValidDropTarget = isOver && dropRule.allowed;
  const isInvalidDropTarget =
    isOver && !!activeRequest && !dropRule.allowed && activeRequest.status !== status;

  return (
    <div className="flex-1 min-w-[280px]">
      <Card className="bg-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {title}
            </CardTitle>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded text-xs font-semibold bg-foreground/10 text-foreground/60">
              {requests.length}
            </span>
          </div>
        </CardHeader>
        <CardContent
          ref={setNodeRef}
          className={`space-y-2 px-2 pb-2 pt-0 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin rounded-md transition-colors ${
            isValidDropTarget
              ? 'bg-primary/5 ring-2 ring-[#5D3FD3]/35 shadow-inner'
              : isInvalidDropTarget
                ? 'bg-muted/70 ring-1 ring-foreground/10'
                : ''
          }`}
        >
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No candidates in this stage
            </p>
          ) : (
            requests.map((r) => (
              <DraggableCandidateCard
                key={r.id}
                request={r}
                status={status}
                actionLabel={actionLabel}
                onAction={onAction}
                actionDisabled={actionDisabled}
                secondaryLabel={secondaryLabel}
                onSecondary={onSecondary}
                onOpenDetail={onOpenDetail}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraggableCandidateCard(props: CandidateCardProps) {
  const canDrag = canDragRecruitmentRequest(props.request);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.request.id,
    data: {
      status: props.request.status,
      interviewOutcome: props.request.interviewOutcome,
    },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      <CandidateCard {...props} isDragging={isDragging} />
    </div>
  );
}

interface CandidateCardProps {
  request: DepartmentJoinRequestWithMember;
  status: OpenStatus;
  actionLabel?: string | null;
  onAction?: (req: DepartmentJoinRequestWithMember) => void;
  actionDisabled?: (req: DepartmentJoinRequestWithMember) => boolean;
  secondaryLabel?: string;
  onSecondary?: (req: DepartmentJoinRequestWithMember) => void;
  onOpenDetail?: (req: DepartmentJoinRequestWithMember) => void;
  isDragging?: boolean;
  variant?: 'default' | 'preview';
}

function CandidateCard({
  request: r,
  status,
  actionLabel,
  onAction,
  actionDisabled,
  secondaryLabel,
  onSecondary,
  onOpenDetail,
  isDragging = false,
  variant = 'default',
}: CandidateCardProps) {
  const interviewer = interviewerName(r);

  let footer: { label: string; tone?: 'default' | 'warn' | 'good' | 'bad' } | null = null;
  if (status === 'applied') {
    const d = daysAgo(r.createdAt);
    footer = {
      label: d === null ? 'Recently applied' : d === 0 ? 'Applied today' : `Applied ${d}d ago`,
    };
  } else if (status === 'interview_scheduled' && r.interviewScheduledAt) {
    footer = { label: `Interview ${formatStageDateTime(r.interviewScheduledAt)}` };
  } else if (status === 'interviewed' && r.interviewOutcome) {
    if (r.interviewOutcome === 'pass') footer = { label: 'Interview passed', tone: 'good' };
    else if (r.interviewOutcome === 'fail') footer = { label: 'Interview failed', tone: 'bad' };
    else footer = { label: 'Outcome pending', tone: 'warn' };
  } else if (status === 'offered') {
    if (r.offerExpiresAt) {
      const days = daysAgo(r.offerExpiresAt);
      const label =
        days !== null && days >= 0
          ? `Offer expired ${days}d ago`
          : `Offer expires ${formatStageDate(r.offerExpiresAt)}`;
      footer = { label, tone: days !== null && days >= 0 ? 'bad' : 'warn' };
    } else {
      footer = { label: 'Awaiting response', tone: 'warn' };
    }
  } else if (status === 'probation' && r.probationEndDate) {
    const days = daysAgo(r.probationEndDate);
    if (days !== null && days >= 0) {
      footer = { label: `Probation ended ${days}d ago`, tone: 'warn' };
    } else {
      const remaining = days === null ? '' : Math.abs(days);
      footer = { label: `Probation ends in ${remaining}d` };
    }
  }

  const footerToneClass =
    footer?.tone === 'good'
      ? 'text-emerald-600'
      : footer?.tone === 'bad'
      ? 'text-destructive'
      : footer?.tone === 'warn'
      ? 'text-[#9a6b04] dark:text-[#f8b537]'
      : 'text-muted-foreground';

  const interviewerInitials = interviewer
    ? interviewer
        .split(' ')
        .map((s) => s.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  const handleCardClick = (e: React.MouseEvent) => {
    if (!onOpenDetail) return;
    // Ignore clicks that originated inside an interactive child (action buttons, links, inputs).
    // Walk up from the click target but stop at the card itself so we don't treat the card's own
    // role="button" as an interactive child.
    const card = e.currentTarget as HTMLElement;
    let node: HTMLElement | null = e.target as HTMLElement;
    while (node && node !== card) {
      if (node.matches('button, a, input, select, textarea, [role="button"]')) return;
      node = node.parentElement;
    }
    onOpenDetail(r);
  };

  return (
    <Card
      className={
        variant === 'preview'
          ? 'pointer-events-none w-[280px] rotate-[1deg] border-[#5D3FD3]/15 bg-background/80 opacity-80 shadow-[0_16px_34px_rgba(15,23,42,0.14)] ring-1 ring-[#5D3FD3]/10 backdrop-blur-sm'
          : 'bg-card transition-shadow select-none ' +
            (isDragging ? 'opacity-50 ' : '') +
            (onOpenDetail ? 'cursor-pointer hover:shadow-md' : 'hover:shadow-sm')
      }
      onClick={handleCardClick}
      role={onOpenDetail && variant !== 'preview' ? 'button' : undefined}
      tabIndex={onOpenDetail && variant !== 'preview' ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onOpenDetail) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(r);
        }
      }}
      aria-label={onOpenDetail ? `View details for ${r.memberFirstName} ${r.memberLastName}` : undefined}
    >
      <CardContent className="p-3">
        {/* Zone 1 — identity + stage dot */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={'inline-block h-2 w-2 rounded-full flex-shrink-0 ' + STAGE_DOT[status]} />
              <p className="font-semibold leading-tight">
                {r.memberFirstName} {r.memberLastName}
              </p>
            </div>
            {r.memberPhone && (
              <p className="text-xs text-muted-foreground">{r.memberPhone}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="my-2.5 border-foreground/10" />

        {/* Zone 2 — interviewer + stage footer */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            {interviewer ? (
              <>
                <span className="h-6 w-6 rounded bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {interviewerInitials}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/60">
                    Interviewer:
                  </span>{' '}
                  {interviewer}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">No interviewer assigned</span>
            )}
          </div>
          {footer && (
            <p className={'text-xs ' + footerToneClass}>{footer.label}</p>
          )}
        </div>

        {(actionLabel || secondaryLabel) && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {actionLabel && onAction && (
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={actionDisabled?.(r) ?? false}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAction(r)}
              >
                {actionLabel}
              </Button>
            )}
            {secondaryLabel && onSecondary && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSecondary(r)}
              >
                {secondaryLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Toolbar bits ───────────────────────────────────────────

function SortTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
        active
          ? 'bg-white text-foreground shadow-sm dark:bg-[#5D3FD3] dark:text-white'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// ── Dialogs ────────────────────────────────────────────────

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function DetailSection({
  title,
  dot,
  children,
}: {
  title: string;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {dot && <span className={'inline-block h-2 w-2 rounded-full ' + dot} />}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-1.5 rounded-md border border-foreground/10 bg-muted/40 p-3">
        {children}
      </div>
    </div>
  );
}

function CandidateDetailDialog({
  request: r,
  onClose,
}: {
  request: DepartmentJoinRequestWithMember;
  onClose: () => void;
}) {
  const fullName = `${r.memberFirstName} ${r.memberLastName}`;
  const status = r.status as OpenStatus;
  const dot = STAGE_DOT[status];
  const interviewer1 = r.interviewerOneFirstName
    ? `${r.interviewerOneFirstName} ${r.interviewerOneLastName ?? ''}`.trim()
    : null;
  const interviewer2 = r.interviewerTwoFirstName
    ? `${r.interviewerTwoFirstName} ${r.interviewerTwoLastName ?? ''}`.trim()
    : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {dot && <span className={'inline-block h-2.5 w-2.5 rounded-full ' + dot} />}
            {fullName}
            <span className="ml-2 rounded-full bg-[#f0f0f3] px-2 py-0.5 text-xs font-medium text-muted-foreground dark:bg-white/[0.06]">
              {STAGE_LABELS[r.status] ?? r.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate */}
          <DetailSection title="Candidate">
            <DetailRow label="Phone" value={r.memberPhone || '—'} />
            <DetailRow label="Email" value={r.memberEmail || '—'} />
            <DetailRow label="Applied" value={fmtDateTime(r.createdAt)} />
            {r.notes && <DetailRow label="Application notes" value={r.notes} />}
          </DetailSection>

          {/* Review */}
          {(r.reviewedAt || r.reviewNotes) && (
            <DetailSection title="Review">
              <DetailRow label="Reviewed" value={fmtDateTime(r.reviewedAt)} />
              {r.reviewNotes && <DetailRow label="Notes" value={r.reviewNotes} />}
            </DetailSection>
          )}

          {/* Interview */}
          {(r.interviewScheduledAt || r.interviewOutcome || interviewer1) && (
            <DetailSection title="Interview">
              <DetailRow label="Scheduled" value={fmtDateTime(r.interviewScheduledAt)} />
              <DetailRow
                label="Format"
                value={
                  r.interviewFormat === 'in_person'
                    ? 'In Person'
                    : r.interviewFormat === 'virtual'
                    ? 'Virtual'
                    : '—'
                }
              />
              {r.interviewLocation && (
                <DetailRow label="Location" value={r.interviewLocation} />
              )}
              <DetailRow label="Interviewer 1" value={interviewer1 ?? '—'} />
              {interviewer2 && <DetailRow label="Interviewer 2" value={interviewer2} />}
              <DetailRow
                label="Outcome"
                value={
                  r.interviewOutcome ? (
                    <span
                      className={
                        r.interviewOutcome === 'pass'
                          ? 'text-emerald-600 font-medium'
                          : r.interviewOutcome === 'fail'
                          ? 'text-destructive font-medium'
                          : 'text-[#9a6b04] dark:text-[#f8b537] font-medium'
                      }
                    >
                      {r.interviewOutcome === 'pass'
                        ? 'Passed'
                        : r.interviewOutcome === 'fail'
                        ? 'Failed'
                        : 'Pending'}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              {r.interviewNotes && <DetailRow label="Notes" value={r.interviewNotes} />}
            </DetailSection>
          )}

          {/* Offer */}
          {(r.offeredAt || r.offerExpiresAt || r.offerResponse) && (
            <DetailSection title="Offer">
              <DetailRow label="Offered" value={fmtDateTime(r.offeredAt)} />
              <DetailRow label="Expires" value={fmtDate(r.offerExpiresAt)} />
              {r.offerMessage && <DetailRow label="Message" value={r.offerMessage} />}
              <DetailRow
                label="Response"
                value={
                  r.offerResponse ? (
                    <span
                      className={
                        r.offerResponse === 'accepted'
                          ? 'text-emerald-600 font-medium'
                          : 'text-destructive font-medium'
                      }
                    >
                      {r.offerResponse === 'accepted' ? 'Accepted' : 'Declined'}
                    </span>
                  ) : (
                    <span className="text-[#9a6b04] dark:text-[#f8b537]">Awaiting</span>
                  )
                }
              />
              {r.offerRespondedAt && (
                <DetailRow label="Responded" value={fmtDateTime(r.offerRespondedAt)} />
              )}
            </DetailSection>
          )}

          {/* Probation */}
          {(r.probationStartDate || r.probationEndDate || r.probationOutcome) && (
            <DetailSection title="Probation">
              <DetailRow label="Started" value={fmtDate(r.probationStartDate)} />
              <DetailRow label="Ends" value={fmtDate(r.probationEndDate)} />
              {r.probationDays !== null && (
                <DetailRow label="Length" value={`${r.probationDays} days`} />
              )}
              <DetailRow
                label="Outcome"
                value={
                  r.probationOutcome ? (
                    <span
                      className={
                        r.probationOutcome === 'passed'
                          ? 'text-emerald-600 font-medium'
                          : r.probationOutcome === 'failed'
                          ? 'text-destructive font-medium'
                          : 'text-[#9a6b04] dark:text-[#f8b537] font-medium'
                      }
                    >
                      {r.probationOutcome === 'passed'
                        ? 'Passed'
                        : r.probationOutcome === 'failed'
                        ? 'Failed'
                        : 'Pending'}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              {r.probationNotes && <DetailRow label="Notes" value={r.probationNotes} />}
            </DetailSection>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleInterviewDialog({
  branchDeptId,
  request,
  branchMembers,
  onClose,
  mutation,
}: {
  branchDeptId: string;
  request: DepartmentJoinRequestWithMember;
  branchMembers: MemberWithBranch[];
  onClose: () => void;
  mutation: ReturnType<typeof useScheduleDepartmentInterview>;
}) {
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('18:00');
  const [format, setFormat] = useState<'in_person' | 'virtual'>('in_person');
  const [location, setLocation] = useState('');
  const [interviewerOneId, setInterviewerOneId] = useState('');
  const [interviewerTwoId, setInterviewerTwoId] = useState('');

  const memberOptions = branchMembers
    .filter((m) => m.id !== request.memberId)
    .map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }));

  const submit = () => {
    if (!interviewerOneId) {
      toast.error('Pick at least one interviewer.');
      return;
    }
    const iso = new Date(`${date}T${time}:00`).toISOString();
    mutation.mutate(
      {
        branchDeptId,
        requestId: request.id,
        data: {
          interviewScheduledAt: iso,
          interviewFormat: format,
          interviewLocation: location || undefined,
          interviewerOneId,
          interviewerTwoId: interviewerTwoId || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Interview scheduled.');
          onClose();
        },
        onError: () => toast.error('Failed to schedule interview.'),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Schedule interview: {request.memberFirstName} {request.memberLastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <DateSelect value={date} onChange={setDate} minDate={todayIso()} />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <TimeSelect value={time} onValueChange={setTime} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Format</Label>
            <CustomSelect
              value={format}
              onValueChange={(v) => setFormat(v as 'in_person' | 'virtual')}
              options={[
                { value: 'in_person', label: 'In Person' },
                { value: 'virtual', label: 'Virtual' },
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">Location / link</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Interviewer 1</Label>
            <CustomSelect
              value={interviewerOneId}
              onValueChange={setInterviewerOneId}
              placeholder="Pick interviewer..."
              options={memberOptions}
            />
          </div>
          <div>
            <Label className="text-xs">Interviewer 2 (optional)</Label>
            <CustomSelect
              value={interviewerTwoId}
              onValueChange={setInterviewerTwoId}
              placeholder="Pick interviewer..."
              options={memberOptions.filter((o) => o.value !== interviewerOneId)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordInterviewDialog({
  branchDeptId,
  request,
  onClose,
  mutation,
}: {
  branchDeptId: string;
  request: DepartmentJoinRequestWithMember;
  onClose: () => void;
  mutation: ReturnType<typeof useRecordDepartmentInterview>;
}) {
  const [outcome, setOutcome] = useState<'pass' | 'fail'>('pass');
  const [notes, setNotes] = useState('');

  const submit = () => {
    mutation.mutate(
      {
        branchDeptId,
        requestId: request.id,
        data: { interviewOutcome: outcome, interviewNotes: notes || undefined },
      },
      {
        onSuccess: () => {
          toast.success('Interview recorded.');
          onClose();
        },
        onError: () => toast.error('Failed to record interview.'),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Record interview: {request.memberFirstName} {request.memberLastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Outcome</Label>
            <CustomSelect
              value={outcome}
              onValueChange={(v) => setOutcome(v as 'pass' | 'fail')}
              options={[
                { value: 'pass', label: 'Pass' },
                { value: 'fail', label: 'Fail' },
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtendOfferDialog({
  branchDeptId,
  request,
  defaultProbationDays,
  onClose,
  mutation,
}: {
  branchDeptId: string;
  request: DepartmentJoinRequestWithMember;
  defaultProbationDays: number;
  onClose: () => void;
  mutation: ReturnType<typeof useExtendDepartmentOffer>;
}) {
  const [expiry, setExpiry] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(defaultProbationDays);

  const submit = () => {
    mutation.mutate(
      {
        branchDeptId,
        requestId: request.id,
        data: {
          offerExpiresAt: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : undefined,
          offerMessage: message || undefined,
          probationDays: days,
        },
      },
      {
        onSuccess: () => {
          toast.success('Offer extended.');
          onClose();
        },
        onError: () => toast.error('Failed to extend offer.'),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Extend offer: {request.memberFirstName} {request.memberLastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Offer expires (optional)</Label>
            <DateSelect value={expiry} onChange={setExpiry} minDate={todayIso()} />
          </div>
          <div>
            <Label className="text-xs">Probation length (days)</Label>
            <NumberStepper value={days} onValueChange={setDays} min={1} max={365} />
          </div>
          <div>
            <Label className="text-xs">Message (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  branchDeptId,
  request,
  onClose,
  mutation,
}: {
  branchDeptId: string;
  request: DepartmentJoinRequestWithMember;
  onClose: () => void;
  mutation: ReturnType<typeof useRejectDepartmentJoinRequest>;
}) {
  const [notes, setNotes] = useState('');

  const submit = () => {
    mutation.mutate(
      {
        branchDeptId,
        requestId: request.id,
        data: { reviewNotes: notes || undefined },
      },
      {
        onSuccess: () => {
          toast.success('Request rejected.');
          onClose();
        },
        onError: () => toast.error('Failed to reject.'),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reject: {request.memberFirstName} {request.memberLastName}
          </DialogTitle>
        </DialogHeader>
        <div>
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvaluateProbationDialog({
  branchDeptId,
  request,
  onClose,
  mutation,
}: {
  branchDeptId: string;
  request: DepartmentJoinRequestWithMember;
  onClose: () => void;
  mutation: ReturnType<typeof useEvaluateDepartmentProbation>;
}) {
  const [outcome, setOutcome] = useState<'passed' | 'failed'>('passed');
  const [notes, setNotes] = useState('');

  const submit = () => {
    mutation.mutate(
      {
        branchDeptId,
        requestId: request.id,
        data: { probationOutcome: outcome, probationNotes: notes || undefined },
      },
      {
        onSuccess: () => {
          toast.success('Probation evaluated.');
          onClose();
        },
        onError: () => toast.error('Failed to evaluate.'),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Evaluate probation: {request.memberFirstName} {request.memberLastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Outcome</Label>
            <CustomSelect
              value={outcome}
              onValueChange={(v) => setOutcome(v as 'passed' | 'failed')}
              options={[
                { value: 'passed', label: 'Passed, promote to full member' },
                { value: 'failed', label: 'Failed, remove from team' },
              ]}
            />
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
