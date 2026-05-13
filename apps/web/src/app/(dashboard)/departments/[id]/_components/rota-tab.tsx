'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CustomSelect,
  Input,
  Label,
  NumberStepper,
  Textarea,
  TimeSelect,
  Badge,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { MemberAvatar } from '@/components/member-avatar';
import {
  useRotaTemplates,
  useCreateRotaTemplate,
  useDeactivateRotaTemplate,
  useRotaSlots,
  useCreateRotaSlot,
  useDeleteRotaSlot,
  useRotaPool,
  useAddRotaPoolMember,
  useRemoveRotaPoolMember,
  useGenerateRota,
  useRegenerateRotaInstance,
  useRotaInstances,
  useRotaInstance,
  useUpdateRotaInstanceStatus,
  useUpdateRotaAssignment,
  useCreateRotaSwapRequest,
  useRotaSwapRequests,
  useReviewRotaSwapRequest,
} from '@/hooks/use-departments';
import type {
  DepartmentMemberWithDetails,
  RotaInstanceWithSummary,
  RotaTemplateWithSummary,
} from '@kairos/types';

const WEEKDAYS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const STATUS_TONE: Record<string, string> = {
  Draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
  Published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Completed: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Assigned: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Declined: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Swapped: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Open: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatWeekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })
    .toUpperCase();
}

function formatMonthShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
    .toUpperCase();
}

function formatDayNumber(iso: string): string {
  const [, , d] = iso.split('-').map(Number) as [number, number, number];
  return String(d);
}

function formatTimeShort(time: string | null | undefined): string | null {
  if (!time) return null;
  const parts = time.split(':');
  const hStr = parts[0] ?? '';
  const mStr = parts[1] ?? '00';
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${displayH}:00 ${period}` : `${displayH}:${mStr.padStart(2, '0')} ${period}`;
}

function formatRelativeDate(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const target = new Date(y, m - 1, d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${-diffDays} days ago`;
  return formatDateLong(iso);
}

function nextOccurrenceOfWeekday(weekday: number): string {
  const today = new Date();
  const diff = (weekday - today.getDay() + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toISOString().slice(0, 10);
}

interface RotaTabProps {
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
  currentUserId?: string;
}

export function RotaTab({ branchDeptId, members, canManage, currentUserId }: RotaTabProps) {
  const [subTab, setSubTab] = useState<'templates' | 'schedule' | 'swaps'>('schedule');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border/60">
        {(
          [
            { key: 'schedule' as const, label: 'Schedule' },
            { key: 'templates' as const, label: 'Templates' },
            { key: 'swaps' as const, label: 'Swap Requests' },
          ]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              subTab === t.key
                ? 'border-[#5D3FD3] text-[#5D3FD3]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'schedule' && (
        <ScheduleSection
          branchDeptId={branchDeptId}
          members={members}
          canManage={canManage}
          currentUserId={currentUserId}
        />
      )}
      {subTab === 'templates' && (
        <TemplatesSection branchDeptId={branchDeptId} members={members} canManage={canManage} />
      )}
      {subTab === 'swaps' && (
        <SwapsSection branchDeptId={branchDeptId} canManage={canManage} />
      )}
    </div>
  );
}

// ── Schedule (instances + assignments) ────────────────────

function ScheduleSection({
  branchDeptId,
  members,
  canManage,
  currentUserId,
}: {
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
  currentUserId?: string;
}) {
  const [showGenerate, setShowGenerate] = useState(false);
  const [expandedInstanceId, setExpandedInstanceId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Draft' | 'Published' | 'Completed'>('all');

  const today = todayIso();
  const ninetyDaysOut = new Date();
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
  const toIso = ninetyDaysOut.toISOString().slice(0, 10);

  const { data: instances, isLoading } = useRotaInstances(branchDeptId, {
    from: today,
    to: toIso,
  });
  const { data: templates } = useRotaTemplates(branchDeptId);
  const activeTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.isActive),
    [templates],
  );

  const list = useMemo(() => {
    const sorted = [...(instances ?? [])].sort((a, b) =>
      a.serviceDate.localeCompare(b.serviceDate),
    );
    return sorted.filter((inst) => {
      if (!showCancelled && inst.status === 'Cancelled') return false;
      if (statusFilter !== 'all' && inst.status !== statusFilter) return false;
      return true;
    });
  }, [instances, showCancelled, statusFilter]);

  const cancelledCount = (instances ?? []).filter((i) => i.status === 'Cancelled').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Upcoming services</h3>
          <p className="text-xs text-muted-foreground">
            Next 90 days. Drafts can be edited or regenerated; publish to notify members. Click any service to manage assignments.
          </p>
        </div>
        {canManage && activeTemplates.length > 0 && (
          <Button onClick={() => setShowGenerate((v) => !v)} variant="default">
            {showGenerate ? 'Cancel' : 'Generate Schedule'}
          </Button>
        )}
      </div>

      {showGenerate && (
        <GenerateForm
          branchDeptId={branchDeptId}
          templates={activeTemplates}
          onDone={() => setShowGenerate(false)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Status:</span>
        {(
          [
            { v: 'all' as const, l: 'All' },
            { v: 'Draft' as const, l: 'Draft' },
            { v: 'Published' as const, l: 'Published' },
            { v: 'Completed' as const, l: 'Completed' },
          ]
        ).map((opt) => (
          <button
            key={opt.v}
            onClick={() => setStatusFilter(opt.v)}
            className={`rounded-full px-3 py-1 transition-colors ${
              statusFilter === opt.v
                ? 'bg-[#5D3FD3] text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {opt.l}
          </button>
        ))}
        {cancelledCount > 0 && (
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            {showCancelled ? 'Hide cancelled' : `Show cancelled (${cancelledCount})`}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading schedule...</p>
      ) : list.length === 0 ? (
        <Card className="rounded">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeTemplates.length === 0
                ? 'No templates yet. Create a template first, then generate a schedule.'
                : (instances ?? []).length === 0
                  ? 'No upcoming rota instances. Click Generate Schedule to create them.'
                  : 'No services match the current filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((inst) => (
            <ScheduleRow
              key={inst.id}
              instance={inst}
              today={today}
              expanded={expandedInstanceId === inst.id}
              onToggle={() =>
                setExpandedInstanceId(expandedInstanceId === inst.id ? null : inst.id)
              }
              branchDeptId={branchDeptId}
              members={members}
              canManage={canManage}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({
  instance,
  today,
  expanded,
  onToggle,
  branchDeptId,
  members,
  canManage,
  currentUserId,
}: {
  instance: RotaInstanceWithSummary;
  today: string;
  expanded: boolean;
  onToggle: () => void;
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
  currentUserId?: string;
}) {
  const isToday = instance.serviceDate === today && instance.status !== 'Cancelled';
  const time = formatTimeShort(instance.templateStartTime);
  const total = instance.totalSlots;
  const filled = instance.filledSlots;
  const open = instance.openSlots;
  const fullyStaffed = total > 0 && open === 0;
  const understaffed = total > 0 && filled < Math.ceil(total * 0.6);

  return (
    <Card
      className={`rounded transition-shadow hover:shadow-sm ${
        isToday ? 'border-[#f8b537]/50 bg-[#f8b537]/5' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-3 text-left sm:p-4"
      >
        {/* Date block */}
        <div
          className={`flex flex-shrink-0 flex-col items-center justify-center rounded px-3 py-2 leading-tight ${
            isToday
              ? 'bg-[#f8b537] text-white'
              : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
          }`}
          style={{ minWidth: '60px' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {formatMonthShort(instance.serviceDate)}
          </span>
          <span className="text-xl font-bold">{formatDayNumber(instance.serviceDate)}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80">
            {formatWeekdayShort(instance.serviceDate)}
          </span>
        </div>

        {/* Title + stats */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {instance.templateName ?? 'Service'}
            </p>
            {time && (
              <span className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {time}
              </span>
            )}
            {isToday && (
              <span className="rounded bg-[#f8b537] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Today
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">{formatRelativeDate(instance.serviceDate)}</span>
            {total > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span
                  className={
                    fullyStaffed
                      ? 'font-medium text-emerald-600 dark:text-emerald-400'
                      : understaffed
                        ? 'font-medium text-rose-600 dark:text-rose-400'
                        : 'font-medium text-zinc-700 dark:text-zinc-300'
                  }
                >
                  {filled}/{total} filled
                </span>
                {open > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      {open} open
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Avatar stack */}
        {instance.assignedMembers.length > 0 && (
          <div className="hidden flex-shrink-0 items-center sm:flex">
            <div className="flex -space-x-2">
              {instance.assignedMembers.slice(0, 3).map((m) => (
                <div key={m.memberId} className="rounded-full ring-2 ring-background">
                  <MemberAvatar
                    firstName={m.firstName}
                    lastName={m.lastName}
                    photoUrl={m.photoUrl}
                    size="xs"
                  />
                </div>
              ))}
              {instance.filledSlots > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 ring-2 ring-background dark:bg-zinc-700 dark:text-zinc-200">
                  +{instance.filledSlots - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <Badge className={`${STATUS_TONE[instance.status] ?? ''} flex-shrink-0 rounded-sm`}>
          {instance.status}
        </Badge>
      </button>
      {expanded && (
        <CardContent className="border-t pt-4">
          <InstanceDetail
            branchDeptId={branchDeptId}
            instanceId={instance.id}
            members={members}
            canManage={canManage}
            currentUserId={currentUserId}
          />
        </CardContent>
      )}
    </Card>
  );
}

function GenerateForm({
  branchDeptId,
  templates,
  onDone,
}: {
  branchDeptId: string;
  templates: RotaTemplateWithSummary[];
  onDone: () => void;
}) {
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? '');
  const [weeks, setWeeks] = useState(4);
  const selected = templates.find((t) => t.id === templateId);
  const [startDate, setStartDate] = useState<string>(
    selected ? nextOccurrenceOfWeekday(selected.weekday) : todayIso(),
  );
  const generate = useGenerateRota();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) {
      toast.error('Pick a template');
      return;
    }
    generate.mutate(
      { branchDeptId, templateId, data: { weeks, startDate } },
      {
        onSuccess: (res) => {
          toast.success(
            `Generated ${res.instanceCount} services, ${res.assignmentCount} assignments (${res.openSlotCount} open)`,
          );
          onDone();
        },
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : 'Failed to generate'),
      },
    );
  };

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle className="text-sm">Generate Schedule</CardTitle>
        <CardDescription className="text-xs">
          Generate a number of weeks of service rota from a template. Open slots will be filled by
          rotation pool members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Template</Label>
            <CustomSelect
              value={templateId}
              onValueChange={(v) => {
                setTemplateId(v);
                const t = templates.find((tpl) => tpl.id === v);
                if (t) setStartDate(nextOccurrenceOfWeekday(t.weekday));
              }}
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select template"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Weeks</Label>
            <NumberStepper
              value={weeks}
              onValueChange={setWeeks}
              min={1}
              max={52}
              suffix="w"
              ariaLabel="Number of weeks"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start date</Label>
            <DateSelect value={startDate} onChange={setStartDate} minDate={todayIso()} />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={generate.isPending}>
              {generate.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function InstanceDetail({
  branchDeptId,
  instanceId,
  members,
  canManage,
  currentUserId,
}: {
  branchDeptId: string;
  instanceId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
  currentUserId?: string;
}) {
  const { data, isLoading } = useRotaInstance(branchDeptId, instanceId);
  const updateAssignment = useUpdateRotaAssignment();
  const updateStatus = useUpdateRotaInstanceStatus();
  const createSwap = useCreateRotaSwapRequest();
  const regenerate = useRegenerateRotaInstance();

  const memberOptions = useMemo(
    () => [
      { value: '', label: '— Open —' },
      ...members.map((m) => ({
        value: m.memberId,
        label: `${m.memberFirstName} ${m.memberLastName}`,
      })),
    ],
    [members],
  );

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading assignments...</p>;
  }

  const sortedAssignments = [...data.assignments].sort((a, b) => {
    const ao = a.sortOrder ?? 999;
    const bo = b.sortOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return (a.roleName ?? '').localeCompare(b.roleName ?? '');
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <CustomSelect
            value={data.status}
            onValueChange={(v) =>
              updateStatus.mutate({
                branchDeptId,
                instanceId,
                data: { status: v as 'Draft' | 'Published' | 'Cancelled' },
              })
            }
            options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Published', label: 'Published' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
          {data.status === 'Draft' && (
            <Button
              variant="outline"
              disabled={regenerate.isPending}
              onClick={() => {
                if (!confirm('Re-pick all assignments for this service? Existing picks will be replaced.')) return;
                regenerate.mutate(
                  { branchDeptId, instanceId },
                  {
                    onSuccess: (res) =>
                      toast.success(
                        `Regenerated — ${res.assignmentCount} assigned, ${res.openSlotCount} open`,
                      ),
                    onError: (e: unknown) =>
                      toast.error(e instanceof Error ? e.message : 'Failed to regenerate'),
                  },
                );
              }}
            >
              Regenerate
            </Button>
          )}
          {data.status !== 'Draft' && (
            <span className="text-xs text-muted-foreground">
              Set status back to Draft to regenerate this service.
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {sortedAssignments.map((a) => {
          const isMine = a.memberId && a.memberId === currentUserId;
          return (
            <div
              key={a.id}
              className="flex flex-col gap-2 bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {a.memberId ? (
                  <MemberAvatar
                    firstName={a.memberFirstName ?? ''}
                    lastName={a.memberLastName ?? ''}
                    photoUrl={a.memberPhotoUrl ?? null}
                    size="md"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    ?
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{a.roleName ?? 'Unassigned slot'}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.memberId
                      ? `${a.memberFirstName ?? ''} ${a.memberLastName ?? ''}`.trim()
                      : 'Open slot'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${STATUS_TONE[a.status] ?? ''} rounded-sm`}>{a.status}</Badge>
                {canManage && (
                  <CustomSelect
                    value={a.memberId ?? ''}
                    onValueChange={(v) =>
                      updateAssignment.mutate({
                        branchDeptId,
                        instanceId,
                        assignmentId: a.id,
                        data: { memberId: v || null, status: v ? 'Assigned' : 'Open' },
                      })
                    }
                    options={memberOptions}
                  />
                )}
                {!canManage && isMine && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Reason for swap (optional)') ?? '';
                      createSwap.mutate(
                        {
                          branchDeptId,
                          instanceId,
                          assignmentId: a.id,
                          data: { reason },
                        },
                        {
                          onSuccess: () => toast.success('Swap request submitted'),
                          onError: (e: unknown) =>
                            toast.error(e instanceof Error ? e.message : 'Failed'),
                        },
                      );
                    }}
                  >
                    Request swap
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Templates ──────────────────────────────────────────────

function TemplatesSection({
  branchDeptId,
  members,
  canManage,
}: {
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
}) {
  const { data: allTemplates, isLoading } = useRotaTemplates(branchDeptId, {
    includeArchived: true,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(
    () => (allTemplates ?? []).filter((t) => t.isActive),
    [allTemplates],
  );
  const archived = useMemo(
    () => (allTemplates ?? []).filter((t) => !t.isActive),
    [allTemplates],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Service templates</h3>
          <p className="text-xs text-muted-foreground">
            Templates are the recurring blueprint of a service — the day, default time, and the roles you need filled.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : 'New Template'}
          </Button>
        )}
      </div>

      {showCreate && (
        <CreateTemplateForm branchDeptId={branchDeptId} onDone={() => setShowCreate(false)} />
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading templates...</p>
      ) : active.length === 0 && archived.length === 0 ? (
        <Card className="rounded">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length === 0 ? (
            <Card className="rounded">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No active templates.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {active.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  branchDeptId={branchDeptId}
                  members={members}
                  canManage={canManage}
                  expanded={expandedId === tpl.id}
                  onToggle={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                />
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="flex w-full items-center justify-between rounded border border-border/60 bg-zinc-50 px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <span>Archived templates ({archived.length})</span>
                <span className="text-muted-foreground">{showArchived ? '▴' : '▾'}</span>
              </button>
              {showArchived && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {archived.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
                      template={tpl}
                      branchDeptId={branchDeptId}
                      members={members}
                      canManage={canManage}
                      expanded={expandedId === tpl.id}
                      onToggle={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateTemplateForm({
  branchDeptId,
  onDone,
}: {
  branchDeptId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [weekday, setWeekday] = useState('0');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateRotaTemplate();

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle className="text-sm">New Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error('Name is required');
              return;
            }
            create.mutate(
              {
                branchDeptId,
                data: {
                  name: name.trim(),
                  weekday: Number(weekday),
                  defaultStartTime: startTime || null,
                  notes: notes.trim() || null,
                },
              },
              {
                onSuccess: () => {
                  toast.success('Template created');
                  onDone();
                },
                onError: (err: unknown) =>
                  toast.error(err instanceof Error ? err.message : 'Failed to create'),
              },
            );
          }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunday Service" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Weekday</Label>
            <CustomSelect value={weekday} onValueChange={setWeekday} options={WEEKDAYS} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default start time (optional)</Label>
            <TimeSelect value={startTime} onValueChange={setStartTime} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  template,
  branchDeptId,
  members,
  canManage,
  expanded,
  onToggle,
}: {
  template: RotaTemplateWithSummary;
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const deactivate = useDeactivateRotaTemplate();
  const weekdayLabel = WEEKDAYS.find((w) => w.value === String(template.weekday))?.label ?? '';
  const time = formatTimeShort(template.defaultStartTime);
  const isDraft = template.lastGeneratedAt === null;
  const lastGen = template.lastGeneratedAt
    ? formatDateLong(template.lastGeneratedAt)
    : null;

  return (
    <Card className={`rounded ${!template.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
              {template.isActive ? (
                isDraft ? (
                  <span className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    Draft
                  </span>
                ) : (
                  <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Active
                  </span>
                )
              ) : (
                <span className="rounded-sm bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                  Archived
                </span>
              )}
            </div>
            <CardDescription className="mt-1 text-xs">
              {weekdayLabel}
              {time ? ` • ${time}` : ''}
            </CardDescription>
            {template.notes && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{template.notes}</p>
            )}
          </button>
          {canManage && template.isActive && (
            <Button
              variant="ghost"
              size="sm"
              title="Archive template"
              onClick={(e) => {
                e.stopPropagation();
                if (!confirm(`Archive template "${template.name}"?`)) return;
                deactivate.mutate(
                  { branchDeptId, templateId: template.id },
                  {
                    onSuccess: () => toast.success('Template archived'),
                    onError: (err: unknown) =>
                      toast.error(err instanceof Error ? err.message : 'Failed'),
                  },
                );
              }}
            >
              Archive
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{template.slotCount}</strong>{' '}
            {template.slotCount === 1 ? 'role' : 'roles'}
          </span>
          <span>•</span>
          <span>
            <strong className="text-foreground">{template.positionCount}</strong>{' '}
            {template.positionCount === 1 ? 'position' : 'positions'}
          </span>
          <span>•</span>
          <span>
            <strong className="text-foreground">{template.poolCount}</strong> in pool
          </span>
          <span className="ml-auto">
            {lastGen ? `Last generated ${lastGen}` : 'Never generated'}
          </span>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-6 border-t pt-4">
          <SlotsManager branchDeptId={branchDeptId} templateId={template.id} canManage={canManage} />
          <PoolManager
            branchDeptId={branchDeptId}
            templateId={template.id}
            members={members}
            canManage={canManage}
          />
        </CardContent>
      )}
    </Card>
  );
}

function SlotsManager({
  branchDeptId,
  templateId,
  canManage,
}: {
  branchDeptId: string;
  templateId: string;
  canManage: boolean;
}) {
  const { data: slots } = useRotaSlots(branchDeptId, templateId);
  const create = useCreateRotaSlot();
  const remove = useDeleteRotaSlot();
  const [roleName, setRoleName] = useState('');
  const [positions, setPositions] = useState(1);

  const sorted = useMemo(
    () =>
      [...(slots ?? [])].sort((a, b) => {
        const ao = a.sortOrder ?? 999;
        const bo = b.sortOrder ?? 999;
        if (ao !== bo) return ao - bo;
        return a.roleName.localeCompare(b.roleName);
      }),
    [slots],
  );

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Slots
      </h4>
      <p className="text-xs text-muted-foreground">
        Roles you need filled each service (e.g. Lead Vocal x1, Soprano x2). Positions = how many people for that role.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No slots defined.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-surface-container-lowest px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{s.roleName}</p>
                <p className="text-xs text-muted-foreground">
                  {s.positionsRequired} {s.positionsRequired === 1 ? 'position' : 'positions'}
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete slot "${s.roleName}"?`)) return;
                    remove.mutate({ branchDeptId, templateId, slotId: s.id });
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!roleName.trim()) {
              toast.error('Role name required');
              return;
            }
            create.mutate(
              {
                branchDeptId,
                templateId,
                data: { roleName: roleName.trim(), positionsRequired: positions },
              },
              {
                onSuccess: () => {
                  toast.success('Slot added');
                  setRoleName('');
                  setPositions(1);
                },
                onError: (err: unknown) =>
                  toast.error(err instanceof Error ? err.message : 'Failed'),
              },
            );
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Role name</Label>
            <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Lead Vocalist" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Positions</Label>
            <NumberStepper
              value={positions}
              onValueChange={setPositions}
              min={1}
              max={99}
              ariaLabel="Number of positions"
            />
          </div>
          <Button type="submit" disabled={create.isPending}>
            Add Slot
          </Button>
        </form>
      )}
    </div>
  );
}

function PoolManager({
  branchDeptId,
  templateId,
  members,
  canManage,
}: {
  branchDeptId: string;
  templateId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
}) {
  const { data: pool } = useRotaPool(branchDeptId, templateId);
  const add = useAddRotaPoolMember();
  const remove = useRemoveRotaPoolMember();
  const [memberId, setMemberId] = useState('');

  const inPool = useMemo(() => new Set((pool ?? []).map((p) => p.memberId)), [pool]);
  const availableOptions = useMemo(
    () =>
      members
        .filter((m) => !inPool.has(m.memberId))
        .map((m) => ({
          value: m.memberId,
          label: `${m.memberFirstName} ${m.memberLastName}`,
        })),
    [members, inPool],
  );

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Rotation Pool
      </h4>
      <p className="text-xs text-muted-foreground">
        Members eligible to be auto-scheduled. Assign a preferred role to give them priority for that slot. The algorithm picks least-recently-scheduled first, so frequency stays fair on its own.
      </p>
      {!pool || pool.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members in pool yet.</p>
      ) : (
        <div className="space-y-2">
          {pool.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-surface-container-lowest px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <MemberAvatar
                  firstName={p.memberFirstName}
                  lastName={p.memberLastName}
                  photoUrl={p.memberPhotoUrl ?? null}
                  size="xs"
                />
                <div>
                  <p className="text-sm font-medium">
                    {p.memberFirstName} {p.memberLastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.preferredRoleName ? `Prefers ${p.preferredRoleName}` : 'Any role'}
                    {p.lastScheduledAt ? ` • Last scheduled ${p.lastScheduledAt}` : ''}
                  </p>
                </div>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!confirm('Remove from pool?')) return;
                    remove.mutate({ branchDeptId, templateId, poolMemberId: p.id });
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && availableOptions.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!memberId) {
              toast.error('Pick a member');
              return;
            }
            add.mutate(
              { branchDeptId, templateId, data: { memberId } },
              {
                onSuccess: () => {
                  toast.success('Added to pool');
                  setMemberId('');
                },
                onError: (err: unknown) =>
                  toast.error(err instanceof Error ? err.message : 'Failed'),
              },
            );
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Member</Label>
            <CustomSelect
              value={memberId}
              onValueChange={setMemberId}
              options={availableOptions}
              placeholder="Select member"
            />
          </div>
          <Button type="submit" disabled={add.isPending}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}

// ── Swap Requests ──────────────────────────────────────────

function SwapsSection({
  branchDeptId,
  canManage,
}: {
  branchDeptId: string;
  canManage: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'cancelled'>(
    'pending',
  );
  const { data: requests, isLoading } = useRotaSwapRequests(branchDeptId, {
    status: statusFilter,
  });
  // Pull pending count separately so the tab badge always shows it, even when on a different tab.
  const { data: pendingForCount } = useRotaSwapRequests(branchDeptId, { status: 'pending' });
  const review = useReviewRotaSwapRequest();

  const pendingCount = pendingForCount?.length ?? 0;

  const tabs: { v: typeof statusFilter; l: string; count?: number }[] = [
    { v: 'pending', l: 'Pending', count: pendingCount },
    { v: 'approved', l: 'Approved' },
    { v: 'rejected', l: 'Rejected' },
    { v: 'cancelled', l: 'Cancelled' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Swap requests</h3>
          {pendingCount > 0 && (
            <span className="rounded-full bg-[#f8b537]/20 px-2.5 py-0.5 text-xs font-semibold text-[#a06b00] dark:text-[#f8b537]">
              {pendingCount} awaiting review
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Members request a swap on their assignment; you approve it here and the system reassigns automatically.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((tab) => (
          <button
            key={tab.v}
            onClick={() => setStatusFilter(tab.v)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.v
                ? 'border-[#5D3FD3] text-[#5D3FD3]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.l}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  statusFilter === tab.v
                    ? 'bg-[#5D3FD3] text-white'
                    : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
      ) : !requests || requests.length === 0 ? (
        <Card className="rounded">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No {statusFilter} swap requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const highlight = r.status === 'pending';
            return (
              <Card
                key={r.id}
                className={`rounded ${
                  highlight ? 'border-[#f8b537]/40 bg-[#f8b537]/5' : ''
                }`}
              >
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        firstName={r.requesterFirstName}
                        lastName={r.requesterLastName}
                        photoUrl={null}
                        size="md"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {r.requesterFirstName} {r.requesterLastName}
                          </p>
                          {r.roleName && (
                            <span className="rounded-sm bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                              {r.roleName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateLong(r.serviceDate)} • Service
                        </p>
                        {r.proposedFirstName && (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Proposed cover:</span>{' '}
                            <span className="font-medium">
                              {r.proposedFirstName} {r.proposedLastName}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={`${
                        STATUS_TONE[
                          r.status === 'pending'
                            ? 'Draft'
                            : r.status === 'approved'
                              ? 'Confirmed'
                              : 'Declined'
                        ] ?? ''
                      } rounded-sm capitalize`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  {r.reason && (
                    <blockquote className="border-l-2 border-zinc-300 bg-zinc-50 px-3 py-2 text-xs italic text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
                      “{r.reason}”
                    </blockquote>
                  )}
                  {canManage && r.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          review.mutate(
                            {
                              branchDeptId,
                              requestId: r.id,
                              data: { decision: 'rejected' },
                            },
                            {
                              onSuccess: () => toast.success('Rejected'),
                              onError: (err: unknown) =>
                                toast.error(err instanceof Error ? err.message : 'Failed'),
                            },
                          )
                        }
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() =>
                          review.mutate(
                            {
                              branchDeptId,
                              requestId: r.id,
                              data: { decision: 'approved' },
                            },
                            {
                              onSuccess: () => toast.success('Approved'),
                              onError: (err: unknown) =>
                                toast.error(err instanceof Error ? err.message : 'Failed'),
                            },
                          )
                        }
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
