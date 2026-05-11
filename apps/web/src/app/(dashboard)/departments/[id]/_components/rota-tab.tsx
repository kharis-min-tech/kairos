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
  useRotaInstances,
  useRotaInstance,
  useUpdateRotaInstanceStatus,
  useUpdateRotaAssignment,
  useCreateRotaSwapRequest,
  useRotaSwapRequests,
  useReviewRotaSwapRequest,
} from '@/hooks/use-departments';
import type { DepartmentMemberWithDetails, RotaTemplate } from '@kairos/types';

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

  const list = useMemo(
    () =>
      [...(instances ?? [])].sort((a, b) =>
        a.serviceDate.localeCompare(b.serviceDate),
      ),
    [instances],
  );

  return (
    <div className="space-y-6">
      {canManage && activeTemplates.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Upcoming services (next 90 days)</h3>
          <Button onClick={() => setShowGenerate((v) => !v)} variant="default">
            {showGenerate ? 'Cancel' : 'Generate Schedule'}
          </Button>
        </div>
      )}

      {showGenerate && (
        <GenerateForm
          branchDeptId={branchDeptId}
          templates={activeTemplates}
          onDone={() => setShowGenerate(false)}
        />
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading schedule...</p>
      ) : list.length === 0 ? (
        <Card className="rounded">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeTemplates.length === 0
                ? 'No templates yet. Create a template first, then generate a schedule.'
                : 'No upcoming rota instances. Click Generate Schedule to create them.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((inst) => {
            const isToday = inst.serviceDate === today;
            const isExpanded = expandedInstanceId === inst.id;
            const tplName =
              activeTemplates.find((t) => t.id === inst.templateId)?.name ??
              templates?.find((t) => t.id === inst.templateId)?.name ??
              'Template';
            return (
              <Card
                key={inst.id}
                className={`rounded ${
                  isToday ? 'border-[#f8b537]/40 bg-[#f8b537]/5' : ''
                }`}
              >
                <CardHeader
                  className="flex cursor-pointer flex-row items-center justify-between space-y-0 pb-3"
                  onClick={() => setExpandedInstanceId(isExpanded ? null : inst.id)}
                >
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold">
                      {formatDateLong(inst.serviceDate)}
                      {isToday && (
                        <span className="ml-2 rounded bg-[#f8b537] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          Today
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">{tplName}</CardDescription>
                  </div>
                  <Badge className={`${STATUS_TONE[inst.status] ?? ''} rounded-sm`}>
                    {inst.status}
                  </Badge>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <InstanceDetail
                      branchDeptId={branchDeptId}
                      instanceId={inst.id}
                      members={members}
                      canManage={canManage}
                      currentUserId={currentUserId}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GenerateForm({
  branchDeptId,
  templates,
  onDone,
}: {
  branchDeptId: string;
  templates: RotaTemplate[];
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
    const ao = a.slotSortOrder ?? 999;
    const bo = b.slotSortOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return (a.slotRoleName ?? '').localeCompare(b.slotRoleName ?? '');
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center gap-2">
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
                  <p className="text-sm font-medium">{a.slotRoleName ?? 'Unassigned slot'}</p>
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
  const { data: templates, isLoading } = useRotaTemplates(branchDeptId);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : 'New Template'}
          </Button>
        </div>
      )}

      {showCreate && (
        <CreateTemplateForm branchDeptId={branchDeptId} onDone={() => setShowCreate(false)} />
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading templates...</p>
      ) : !templates || templates.length === 0 ? (
        <Card className="rounded">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
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
  template: RotaTemplate;
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const deactivate = useDeactivateRotaTemplate();
  const weekdayLabel = WEEKDAYS.find((w) => w.value === String(template.weekday))?.label ?? '';

  return (
    <Card className="rounded">
      <CardHeader
        className="flex cursor-pointer flex-row items-center justify-between space-y-0 pb-3"
        onClick={onToggle}
      >
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
          <CardDescription className="text-xs">
            {weekdayLabel}
            {template.defaultStartTime ? ` • ${template.defaultStartTime.slice(0, 5)}` : ''}
          </CardDescription>
        </div>
        {canManage && template.isActive && (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (!confirm(`Deactivate template "${template.name}"?`)) return;
              deactivate.mutate(
                { branchDeptId, templateId: template.id },
                {
                  onSuccess: () => toast.success('Template deactivated'),
                  onError: (err: unknown) =>
                    toast.error(err instanceof Error ? err.message : 'Failed'),
                },
              );
            }}
          >
            Archive
          </Button>
        )}
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-6">
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
  const [weight, setWeight] = useState(1);

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
                    Weight {p.weight}
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
              { branchDeptId, templateId, data: { memberId, weight } },
              {
                onSuccess: () => {
                  toast.success('Added to pool');
                  setMemberId('');
                  setWeight(1);
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
          <div className="space-y-1">
            <Label className="text-xs">Weight</Label>
            <NumberStepper
              value={weight}
              onValueChange={setWeight}
              min={1}
              max={10}
              ariaLabel="Assignment weight"
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
  const review = useReviewRotaSwapRequest();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Filter:</Label>
        <CustomSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {r.requesterFirstName} {r.requesterLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateLong(r.serviceDate)} • {r.slotRoleName ?? 'Slot'}
                      </p>
                    </div>
                    <Badge className="rounded-sm capitalize">{r.status}</Badge>
                  </div>
                  {r.proposedFirstName && (
                    <p className="text-xs">
                      Proposed: {r.proposedFirstName} {r.proposedLastName}
                    </p>
                  )}
                  {r.reason && <p className="text-xs italic text-muted-foreground">“{r.reason}”</p>}
                  {canManage && r.status === 'pending' && (
                    <div className="flex gap-2">
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
