'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CustomSelect,
  Label,
  NumberStepper,
  Textarea,
} from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { MemberAvatar } from '@/components/member-avatar';
import { formatDate, formatShortDateTime } from '@kairos/core';
import {
  useCreateFellowshipFollowup,
  useDeleteFellowshipFollowup,
  useFellowshipFollowups,
  useOverdueFellowshipFollowups,
} from '@/hooks/use-fellowships';
import { ContactMethod, ContactStatus } from '@kairos/types';
import type { FellowshipMemberWithDetails } from '@kairos/types';
import { useConfirm } from '@/components/confirm-dialog';

const CONTACT_METHODS = Object.values(ContactMethod);
const CONTACT_STATUSES = Object.values(ContactStatus);

function todayIso(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

const STATUS_TONE: Record<string, string> = {
  Successful: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  Interested: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'No Answer': 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]',
  'Call Back Later': 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]',
  'Wrong Number': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'Not Interested': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
};

interface FellowshipFollowupsTabProps {
  fellowshipId: string;
  members: FellowshipMemberWithDetails[];
  canManage: boolean;
}

export function FellowshipFollowupsTab({
  fellowshipId,
  members,
  canManage,
}: FellowshipFollowupsTabProps) {
  const [overdueBucket, setOverdueBucket] = useState<'never' | '7' | '14' | null>(null);
  const [memberFilter, setMemberFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: followups, isLoading } = useFellowshipFollowups(
    fellowshipId,
    memberFilter ? { memberId: memberFilter } : undefined,
  );
  const { data: overdue } = useOverdueFellowshipFollowups(fellowshipId, 1);
  const createFollowup = useCreateFellowshipFollowup();
  const deleteFollowup = useDeleteFellowshipFollowup();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.memberId,
        label: `${member.memberFirstName} ${member.memberLastName}`,
      })),
    [members],
  );

  const buckets = useMemo(() => {
    const list = overdue ?? [];
    return {
      never: list.filter((row) => row.daysSinceFollowup === null),
      d7: list.filter(
        (row) => row.daysSinceFollowup !== null && row.daysSinceFollowup >= 7,
      ),
      d14: list.filter(
        (row) => row.daysSinceFollowup !== null && row.daysSinceFollowup >= 14,
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

  if (!canManage) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="font-medium">Followups are restricted</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Only fellowship leaders, pastors, and admins can view or log fellowship followups.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
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
              onClick={() => setOverdueBucket((bucket) => (bucket === 'never' ? null : 'never'))}
            />
            <BucketFilter
              label="7+ days"
              count={buckets.d7.length}
              active={overdueBucket === '7'}
              onClick={() => setOverdueBucket((bucket) => (bucket === '7' ? null : '7'))}
            />
            <BucketFilter
              label="14+ days"
              count={buckets.d14.length}
              active={overdueBucket === '14'}
              onClick={() => setOverdueBucket((bucket) => (bucket === '14' ? null : '14'))}
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
                    <div className="flex min-w-0 items-center gap-3">
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

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="fellowshipMemberFilter" className="text-xs text-muted-foreground">
              Filter by member
            </Label>
            <CustomSelect
              id="fellowshipMemberFilter"
              size="sm"
              value={memberFilter}
              onValueChange={(value) => setMemberFilter(value)}
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
        <Button size="sm" onClick={() => setShowForm((value) => !value)}>
          {showForm ? 'Cancel' : '+ Log Followup'}
        </Button>
      </div>

      {showForm && (
        <FollowupForm
          memberOptions={memberOptions}
          defaultMemberId={memberFilter}
          isPending={createFollowup.isPending}
          onSubmit={(memberId, data) =>
            createFollowup.mutate(
              { fellowshipId, memberId, data },
              {
                onSuccess: () => {
                  toast.success('Followup logged.');
                  setShowForm(false);
                },
                onError: (error) => {
                  toast.error(error instanceof Error ? error.message : 'Failed to log followup.');
                },
              },
            )
          }
        />
      )}

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
            <p className="text-xs text-muted-foreground">
              Click <span className="font-medium">Log Followup</span> to record one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {followups.map((followup) => (
            <Card key={followup.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      firstName={followup.memberFirstName}
                      lastName={followup.memberLastName}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {followup.memberFirstName} {followup.memberLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By {followup.recordedByFirstName} {followup.recordedByLastName} &middot;{' '}
                        {formatShortDateTime(followup.contactedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant="outline">{followup.contactMethod}</Badge>
                    <span
                      className={
                        (STATUS_TONE[followup.contactStatus] ?? 'bg-muted text-foreground') +
                        ' rounded-full px-2.5 py-0.5 text-[11px] font-medium'
                      }
                    >
                      {followup.contactStatus}
                    </span>
                  </div>
                </div>
                {followup.notes && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {followup.notes}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-3">
                    {followup.durationMinutes !== null && followup.durationMinutes !== undefined && (
                      <span>{followup.durationMinutes} min</span>
                    )}
                    {followup.nextFollowUpDate && (
                      <span>
                        Next:{' '}
                        {formatDate(followup.nextFollowUpDate, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {followup.assignedToFirstName && (
                      <span>
                        Assigned to {followup.assignedToFirstName} {followup.assignedToLastName}
                      </span>
                    )}
                  </div>
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
                        { fellowshipId, followupId: followup.id },
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
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
          (active ? 'bg-[#f8b537]/30 text-[#f8b537]' : 'bg-white/10 text-muted-foreground')
        }
      >
        {count}
      </span>
    </button>
  );
}

interface FollowupFormProps {
  memberOptions: { value: string; label: string }[];
  defaultMemberId?: string;
  isPending: boolean;
  onSubmit: (
    memberId: string,
    data: {
      contactedAt?: string;
      contactMethod: string;
      contactStatus: string;
      durationMinutes?: number | null;
      notes?: string | null;
      nextFollowUpDate?: string | null;
      assignedToId?: string | null;
    },
  ) => void;
}

function FollowupForm({
  memberOptions,
  defaultMemberId,
  isPending,
  onSubmit,
}: FollowupFormProps) {
  const [memberId, setMemberId] = useState(defaultMemberId ?? '');
  const [contactMethod, setContactMethod] = useState<string>(ContactMethod.PhoneCall);
  const [contactStatus, setContactStatus] = useState<string>(ContactStatus.Successful);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!memberId) {
      toast.error('Pick a member.');
      return;
    }
    onSubmit(memberId, {
      contactMethod,
      contactStatus,
      contactedAt: new Date().toISOString(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      notes: notes.trim() || undefined,
      nextFollowUpDate: nextFollowUpDate || undefined,
      assignedToId: assignedToId || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Followup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fellowship-fu-member">Member *</Label>
              <CustomSelect
                id="fellowship-fu-member"
                value={memberId}
                onValueChange={setMemberId}
                placeholder="Pick a member"
                options={memberOptions}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fellowship-fu-method">Contact Method *</Label>
              <CustomSelect
                id="fellowship-fu-method"
                value={contactMethod}
                onValueChange={setContactMethod}
                options={CONTACT_METHODS.map((method) => ({ value: method, label: method }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fellowship-fu-status">Outcome *</Label>
              <CustomSelect
                id="fellowship-fu-status"
                value={contactStatus}
                onValueChange={setContactStatus}
                options={CONTACT_STATUSES.map((status) => ({ value: status, label: status }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fellowship-fu-duration">Duration (min)</Label>
              <NumberStepper
                value={Number(durationMinutes) || 0}
                onValueChange={(value) => setDurationMinutes(value ? String(value) : '')}
                min={0}
                max={600}
                step={5}
                suffix="m"
                ariaLabel="Duration in minutes"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fellowship-fu-next">Next Followup</Label>
              <DateSelect
                id="fellowship-fu-next"
                value={nextFollowUpDate}
                onChange={setNextFollowUpDate}
                minDate={todayIso()}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fellowship-fu-assigned">Assign to (optional)</Label>
              <CustomSelect
                id="fellowship-fu-assigned"
                value={assignedToId}
                onValueChange={setAssignedToId}
                placeholder="Unassigned"
                options={memberOptions}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fellowship-fu-notes">Notes</Label>
            <Textarea
              id="fellowship-fu-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What was discussed..."
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Log Followup'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
