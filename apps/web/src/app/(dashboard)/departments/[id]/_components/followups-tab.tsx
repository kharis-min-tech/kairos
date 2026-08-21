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
  Label,
  Badge,
  TimeSelect,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { MemberAvatar } from '@/components/member-avatar';
import { formatDate, formatShortDateTime } from '@kairos/core';
import {
  useDepartmentFollowups,
  useOverdueFollowups,
  useCreateDepartmentFollowup,
  useDeleteDepartmentFollowup,
} from '@/hooks/use-departments';
import { ContactMethod, ContactStatus } from '@kairos/types';
import type {
  CreateFellowshipFollowupRequest,
  DepartmentMemberWithDetails,
  FollowupMethod,
} from '@kairos/types';
import { useConfirm } from '@/components/confirm-dialog';
import { X } from 'lucide-react';

function todayIso(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

const STATUS_TONE: Record<string, string> = {
  Successful: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Interested: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'No Answer': 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]',
  'Call Back Later': 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]',
  'Wrong Number': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'Not Interested': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
};

interface FollowupsTabProps {
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  canManage: boolean;
}

export function FollowupsTab({ branchDeptId, members, canManage }: FollowupsTabProps) {
  const [overdueBucket, setOverdueBucket] = useState<'never' | '7' | '14' | null>(null);
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

  const { data: followups, isLoading } = useDepartmentFollowups(
    branchDeptId,
    memberFilter ? { memberId: memberFilter } : undefined,
  );
  // Fetch with threshold of 1 day so we get everyone overdue; bucket client-side.
  const { data: overdue } = useOverdueFollowups(branchDeptId, 1);
  const createFollowup = useCreateDepartmentFollowup();
  const deleteFollowup = useDeleteDepartmentFollowup();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.memberId,
        label: `${m.memberFirstName} ${m.memberLastName}`,
      })),
    [members],
  );

  const buckets = useMemo(() => {
    const list = overdue ?? [];
    return {
      never: list.filter((r) => r.daysSinceFollowup === null),
      d7: list.filter(
        (r) => r.daysSinceFollowup !== null && r.daysSinceFollowup >= 7,
      ),
      d14: list.filter(
        (r) => r.daysSinceFollowup !== null && r.daysSinceFollowup >= 14,
      ),
    };
  }, [overdue]);

  const visibleOverdue =
    overdueBucket === 'never'
      ? buckets.never
      : overdueBucket === '7'
        ? buckets.d7
        : overdueBucket === '14'
          ? buckets.d14
          : [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Overdue panel */}
      {canManage && (
        <Card className="border-[#f8b537]/40 bg-[#f8b537]/5">
          <CardHeader className="space-y-3 pb-3">
            <div>
              <CardTitle className="text-base">Overdue Followups</CardTitle>
              <CardDescription>
                Filter members by how long since their last contact.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <BucketFilter
                label="Never contacted"
                count={buckets.never.length}
                active={overdueBucket === 'never'}
                onClick={() =>
                  setOverdueBucket((b) => (b === 'never' ? null : 'never'))
                }
              />
              <BucketFilter
                label="7+ days"
                count={buckets.d7.length}
                active={overdueBucket === '7'}
                onClick={() => setOverdueBucket((b) => (b === '7' ? null : '7'))}
              />
              <BucketFilter
                label="14+ days"
                count={buckets.d14.length}
                active={overdueBucket === '14'}
                onClick={() => setOverdueBucket((b) => (b === '14' ? null : '14'))}
              />
            </div>
          </CardHeader>
          {overdueBucket && (
            <CardContent className="pt-0">
              {visibleOverdue.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  No members in this bucket.
                </p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-white/5 p-1.5 backdrop-blur-md">
                  {visibleOverdue.map((row) => (
                    <button
                      key={row.memberId}
                      type="button"
                      onClick={() => setMemberFilter(row.memberId)}
                      className="flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left text-sm transition-colors hover:bg-[#f8b537]/10"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MemberAvatar
                          firstName={row.firstName}
                          lastName={row.lastName}
                          size="sm"
                        />
                        <span className="truncate font-medium">
                          {row.firstName} {row.lastName}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {row.daysSinceFollowup === null
                          ? 'Never contacted'
                          : `${row.daysSinceFollowup} days ago`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Filter + log button */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="memberFilter" className="text-xs text-muted-foreground">
              Filter by member
            </Label>
            <CustomSelect
              id="memberFilter"
              size="sm"
              value={memberFilter}
              onValueChange={(v) => setMemberFilter(v)}
              placeholder="All members"
              options={memberOptions}
            />
          </div>
          {memberFilter && (
            <Button variant="outline" size="sm" onClick={() => setMemberFilter('')}>
              Clear
            </Button>
          )}
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ Log Followup'}
          </Button>
        )}
      </div>

      {/* Log form */}
      {showForm && canManage && (
        <FollowupForm
          branchDeptId={branchDeptId}
          members={members}
          memberOptions={memberOptions}
          defaultMemberId={memberFilter}
          isPending={createFollowup.isPending}
          onSubmit={(memberId, data) =>
            createFollowup.mutate(
              { branchDeptId, memberId, data },
              {
                onSuccess: () => {
                  toast.success('Followup logged.');
                  setShowForm(false);
                },
                onError: (err) => {
                  toast.error(
                    err instanceof Error ? err.message : 'Failed to log followup.',
                  );
                },
              },
            )
          }
        />
      )}

      {/* List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Loading followups...</p>
          </CardContent>
        </Card>
      ) : !followups || followups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10">
            <p className="text-sm text-muted-foreground">No followups logged yet.</p>
            {canManage && (
              <p className="text-xs text-muted-foreground">
                Click <span className="font-medium">Log Followup</span> to record one.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {followups.map((f) => (
            <Card key={f.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      firstName={f.memberFirstName}
                      lastName={f.memberLastName}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {f.memberFirstName} {f.memberLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By {f.recordedByFirstName} {f.recordedByLastName} &middot;{' '}
                        {formatShortDateTime(f.contactedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant="outline">{f.contactMethod}</Badge>
                    <span
                      className={
                        (STATUS_TONE[f.contactStatus] ??
                          'bg-muted text-foreground') +
                        ' rounded-full px-2.5 py-0.5 text-[11px] font-medium'
                      }
                    >
                      {f.contactStatus}
                    </span>
                  </div>
                </div>
                {f.notes && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {f.notes}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-3">
                    {f.durationMinutes !== null && f.durationMinutes !== undefined && (
                      <span>{f.durationMinutes} min</span>
                    )}
                    {f.nextFollowUpDate && (
                      <span>
                        Next:{' '}
                        {formatDate(f.nextFollowUpDate, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {f.assignedToFirstName && (
                      <span>
                        Assigned to {f.assignedToFirstName} {f.assignedToLastName}
                      </span>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete this followup?',
                          description: 'The contact record will be permanently removed.',
                          confirmLabel: 'Delete',
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        deleteFollowup.mutate(
                          { branchDeptId, followupId: f.id },
                          {
                            onSuccess: () => toast.success('Followup deleted.'),
                            onError: () => toast.error('Failed to delete.'),
                          },
                        );
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface FollowupFormProps {
  branchDeptId: string;
  members: DepartmentMemberWithDetails[];
  memberOptions: { value: string; label: string }[];
  defaultMemberId?: string;
  isPending: boolean;
  onSubmit: (memberId: string, data: CreateFellowshipFollowupRequest) => void;
}

// Visit-shape (0046) mirror of the mobile CreateSheet. Top-level Type picker
// (Contact | Visit) swaps the field set. Legacy contactMethod/contactStatus
// stay populated so old readers keep working.
type FollowupTypeChoice = 'contact' | 'visit';
type InterestChoice = 'interested' | 'not_interested' | 'undecided';
type VisitKindChoice = 'in_person' | 'virtual';
type VisitOutcomeChoice = 'present' | 'not_present' | 'rescheduled';

const CONTACT_METHOD_OPTIONS: { value: FollowupMethod; label: string }[] = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'text_message', label: 'Text' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

function methodToLegacyContactMethod(m: FollowupMethod): ContactMethod {
  switch (m) {
    case 'phone_call':
      return ContactMethod.PhoneCall;
    case 'text_message':
      return ContactMethod.TextMessage;
    case 'whatsapp':
      return ContactMethod.WhatsApp;
    case 'email':
      return ContactMethod.Email;
    case 'in_person':
      return ContactMethod.InPersonVisit;
    case 'virtual':
    case 'other':
    default:
      return ContactMethod.Other;
  }
}

function BucketFilter({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-xs font-medium shadow-sm backdrop-blur-md transition-colors ' +
        (active
          ? 'border-[#f8b537]/70 bg-[#f8b537]/15 text-foreground'
          : 'border-white/10 bg-white/5 text-foreground hover:border-[#f8b537]/40 hover:bg-[#f8b537]/10')
      }
    >
      <span>{label}</span>
      <span
        className={
          'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ' +
          (active
            ? 'bg-[#f8b537]/30 text-[#f8b537]'
            : 'bg-white/10 text-muted-foreground')
        }
      >
        {count}
      </span>
    </button>
  );
}

function FollowupForm({
  members,
  memberOptions,
  defaultMemberId,
  isPending,
  onSubmit,
}: FollowupFormProps) {
  const [memberId, setMemberId] = useState(defaultMemberId ?? '');
  const [contactedAt, setContactedAt] = useState(todayIso());
  const [type, setType] = useState<FollowupTypeChoice>('contact');

  // Contact state
  const [methods, setMethods] = useState<Set<FollowupMethod>>(new Set());
  const [contactReached, setContactReached] = useState<boolean | null>(null);
  const [interestLevel, setInterestLevel] = useState<InterestChoice | null>(null);

  // Visit state
  const [visitKind, setVisitKind] = useState<VisitKindChoice | null>(null);
  const [visitAnnounced, setVisitAnnounced] = useState<boolean | null>(null);
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [companions, setCompanions] = useState<string[]>([]);
  const [companionDraft, setCompanionDraft] = useState('');
  const [visitOutcome, setVisitOutcome] = useState<VisitOutcomeChoice | null>(null);
  const [welfareConcern, setWelfareConcern] = useState(false);
  const [safeguardingConcern, setSafeguardingConcern] = useState(false);

  // Shared
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companionOptions = useMemo(() => {
    const excluded = new Set<string>([memberId, ...companions]);
    return members
      .filter((m) => !excluded.has(m.memberId))
      .map((m) => ({
        value: m.memberId,
        label: `${m.memberFirstName} ${m.memberLastName}`,
      }));
  }, [members, memberId, companions]);

  const companionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.memberId, `${m.memberFirstName} ${m.memberLastName}`);
    }
    return map;
  }, [members]);

  function toggleMethod(m: FollowupMethod) {
    setMethods((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!memberId) next['member'] = 'Pick a member.';
    if (type === 'contact') {
      if (methods.size === 0) next['methods'] = 'Pick at least one method.';
      if (contactReached === null) next['reached'] = 'Did you reach them?';
    } else {
      if (!visitKind) next['visitKind'] = 'Pick a visit kind.';
      if (visitAnnounced === null) next['announced'] = 'Announced or unannounced?';
      if (!arrivalTime) next['arrival'] = 'Arrival time is required.';
      if (!visitOutcome) next['outcome'] = 'Pick an outcome.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateFellowshipFollowupRequest = {
      contactedAt: new Date(`${contactedAt}T12:00:00`).toISOString(),
      contactMethod: ContactMethod.Other,
      contactStatus: ContactStatus.Successful,
    };

    if (type === 'contact') {
      const methodList = Array.from(methods);
      const primary = methodList[0]!;
      payload.type = 'contact';
      payload.methods = methodList;
      payload.contactMethod = methodToLegacyContactMethod(primary);
      payload.contactReached = contactReached === true;
      if (contactReached === true && interestLevel) {
        payload.interestLevel = interestLevel;
      }
      if (contactReached === true && interestLevel === 'interested') {
        payload.contactStatus = ContactStatus.Interested;
      } else if (interestLevel === 'not_interested') {
        payload.contactStatus = ContactStatus.NotInterested;
      } else if (contactReached === false) {
        payload.contactStatus = ContactStatus.NoAnswer;
      } else {
        payload.contactStatus = ContactStatus.Successful;
      }
    } else {
      payload.type = 'visit';
      payload.methods = [visitKind === 'virtual' ? 'virtual' : 'in_person'];
      payload.contactMethod = ContactMethod.InPersonVisit;
      payload.visitKind = visitKind!;
      payload.visitAnnounced = visitAnnounced === true;
      payload.visitArrivalAt = new Date(
        `${contactedAt}T${arrivalTime}:00`,
      ).toISOString();
      if (departureTime) {
        payload.visitDepartureAt = new Date(
          `${contactedAt}T${departureTime}:00`,
        ).toISOString();
      }
      payload.visitOutcome = visitOutcome!;
      if (companions.length > 0) payload.companionMemberIds = companions;
      if (welfareConcern) payload.welfareConcern = true;
      if (safeguardingConcern) payload.safeguardingConcern = true;
      if (visitOutcome === 'present') {
        payload.contactStatus = ContactStatus.Successful;
      } else if (visitOutcome === 'not_present') {
        payload.contactStatus = ContactStatus.NoAnswer;
      } else {
        payload.contactStatus = ContactStatus.CallBackLater;
      }
    }

    if (notes.trim()) payload.notes = notes.trim();
    if (nextFollowUpDate) payload.nextFollowUpDate = nextFollowUpDate;

    onSubmit(memberId, payload);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Followup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="dept-fu-member">Member *</Label>
              <CustomSelect
                id="dept-fu-member"
                value={memberId}
                onValueChange={setMemberId}
                placeholder="Pick a member"
                options={memberOptions}
              />
              {errors['member'] && (
                <p className="text-xs text-destructive">{errors['member']}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dept-fu-contacted">Contacted on *</Label>
              <DateSelect
                id="dept-fu-contacted"
                value={contactedAt}
                onChange={setContactedAt}
              />
            </div>
          </div>

          <FieldGroup label="Type">
            <PillRow>
              {(
                [
                  { value: 'contact', label: 'Contact' },
                  { value: 'visit', label: 'Visit' },
                ] as { value: FollowupTypeChoice; label: string }[]
              ).map((opt) => (
                <Pill
                  key={opt.value}
                  active={type === opt.value}
                  onClick={() => {
                    setType(opt.value);
                    setErrors({});
                  }}
                >
                  {opt.label}
                </Pill>
              ))}
            </PillRow>
          </FieldGroup>

          {type === 'contact' ? (
            <>
              <FieldGroup
                label="Methods (pick one or more) *"
                error={errors['methods']}
              >
                <PillRow>
                  {CONTACT_METHOD_OPTIONS.map(({ value, label }) => (
                    <Pill
                      key={value}
                      active={methods.has(value)}
                      onClick={() => toggleMethod(value)}
                    >
                      {label}
                    </Pill>
                  ))}
                </PillRow>
              </FieldGroup>

              <FieldGroup label="Reached them? *" error={errors['reached']}>
                <PillRow>
                  {(
                    [
                      { value: true, label: 'Yes' },
                      { value: false, label: 'No' },
                    ] as { value: boolean; label: string }[]
                  ).map((opt) => (
                    <Pill
                      key={opt.label}
                      active={contactReached === opt.value}
                      onClick={() => {
                        setContactReached(opt.value);
                        if (opt.value === false) setInterestLevel(null);
                      }}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </PillRow>
              </FieldGroup>

              {contactReached === true && (
                <FieldGroup label="Interest">
                  <PillRow>
                    {(
                      [
                        { value: 'interested', label: 'Interested' },
                        { value: 'not_interested', label: 'Not interested' },
                        { value: 'undecided', label: 'Undecided' },
                      ] as { value: InterestChoice; label: string }[]
                    ).map((opt) => (
                      <Pill
                        key={opt.value}
                        active={interestLevel === opt.value}
                        onClick={() => setInterestLevel(opt.value)}
                      >
                        {opt.label}
                      </Pill>
                    ))}
                  </PillRow>
                </FieldGroup>
              )}
            </>
          ) : (
            <>
              <FieldGroup label="Kind *" error={errors['visitKind']}>
                <PillRow>
                  {(
                    [
                      { value: 'in_person', label: 'In-person' },
                      { value: 'virtual', label: 'Virtual' },
                    ] as { value: VisitKindChoice; label: string }[]
                  ).map((opt) => (
                    <Pill
                      key={opt.value}
                      active={visitKind === opt.value}
                      onClick={() => setVisitKind(opt.value)}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </PillRow>
              </FieldGroup>

              <FieldGroup label="Announced? *" error={errors['announced']}>
                <PillRow>
                  {(
                    [
                      { value: true, label: 'Announced' },
                      { value: false, label: 'Unannounced' },
                    ] as { value: boolean; label: string }[]
                  ).map((opt) => (
                    <Pill
                      key={opt.label}
                      active={visitAnnounced === opt.value}
                      onClick={() => setVisitAnnounced(opt.value)}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </PillRow>
              </FieldGroup>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="dept-fu-arrival">Arrival time *</Label>
                  <TimeSelect
                    value={arrivalTime}
                    onValueChange={setArrivalTime}
                  />
                  {errors['arrival'] && (
                    <p className="text-xs text-destructive">{errors['arrival']}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dept-fu-departure">
                    Departure time (optional)
                  </Label>
                  <TimeSelect
                    value={departureTime}
                    onValueChange={setDepartureTime}
                  />
                </div>
              </div>

              <FieldGroup label="Went with (optional)">
                <div className="flex flex-wrap items-center gap-2">
                  {companions.map((cid) => (
                    <CompanionChip
                      key={cid}
                      label={companionNameById.get(cid) ?? cid.slice(0, 8)}
                      onRemove={() =>
                        setCompanions((prev) => prev.filter((x) => x !== cid))
                      }
                    />
                  ))}
                  <div className="flex items-end gap-2">
                    <CustomSelect
                      size="sm"
                      value={companionDraft}
                      onValueChange={(v) => setCompanionDraft(v)}
                      placeholder="Pick a member"
                      options={companionOptions}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!companionDraft}
                      onClick={() => {
                        if (!companionDraft) return;
                        setCompanions((prev) =>
                          prev.includes(companionDraft) ? prev : [...prev, companionDraft],
                        );
                        setCompanionDraft('');
                      }}
                    >
                      + Add
                    </Button>
                  </div>
                </div>
              </FieldGroup>

              <FieldGroup label="Outcome *" error={errors['outcome']}>
                <PillRow>
                  {(
                    [
                      { value: 'present', label: 'Present' },
                      { value: 'not_present', label: 'Not present' },
                      { value: 'rescheduled', label: 'Rescheduled' },
                    ] as { value: VisitOutcomeChoice; label: string }[]
                  ).map((opt) => (
                    <Pill
                      key={opt.value}
                      active={visitOutcome === opt.value}
                      onClick={() => setVisitOutcome(opt.value)}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </PillRow>
              </FieldGroup>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="dept-fu-notes">Notes</Label>
            <AutoGrowTextarea
              id="dept-fu-notes"
              value={notes}
              onChange={setNotes}
              placeholder="What was discussed?"
            />
          </div>

          {type === 'visit' && (
            <div className="space-y-2">
              <CheckboxRow
                id="dept-fu-welfare"
                label="Welfare concern noted"
                checked={welfareConcern}
                onToggle={() => setWelfareConcern((v) => !v)}
              />
              <CheckboxRow
                id="dept-fu-safeguarding"
                label="Safeguarding matter"
                checked={safeguardingConcern}
                onToggle={() => setSafeguardingConcern((v) => !v)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="dept-fu-next">Next follow-up (optional)</Label>
            <DateSelect
              id="dept-fu-next"
              value={nextFollowUpDate}
              onChange={setNextFollowUpDate}
              minDate={todayIso()}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save follow-up'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Local presentational primitives ─────────────────────────

function FieldGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Pill({
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
      className={
        'inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ' +
        (active
          ? 'border-[#5D3FD3] bg-[#5D3FD3]/10 text-[#5D3FD3]'
          : 'border-border bg-transparent text-muted-foreground hover:border-[#5D3FD3]/40 hover:text-foreground')
      }
    >
      {children}
    </button>
  );
}

function CheckboxRow({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm transition-colors hover:border-[#5D3FD3]/40"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 accent-[#5D3FD3]"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function CompanionChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function AutoGrowTextarea({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{ fieldSizing: 'content' } as React.CSSProperties}
      className="flex min-h-[76px] max-h-[280px] w-full resize-y overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f8b537] disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
