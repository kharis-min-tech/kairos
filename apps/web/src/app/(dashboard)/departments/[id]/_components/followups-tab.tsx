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
  Textarea,
  Badge,
  NumberStepper,
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
import type { DepartmentMemberWithDetails } from '@kairos/types';
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
              <Label htmlFor="fu-member">Member *</Label>
              <CustomSelect
                id="fu-member"
                value={memberId}
                onValueChange={setMemberId}
                placeholder="Pick a member"
                options={memberOptions}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-method">Contact Method *</Label>
              <CustomSelect
                id="fu-method"
                value={contactMethod}
                onValueChange={setContactMethod}
                options={CONTACT_METHODS.map((m) => ({ value: m, label: m }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-status">Outcome *</Label>
              <CustomSelect
                id="fu-status"
                value={contactStatus}
                onValueChange={setContactStatus}
                options={CONTACT_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-duration">Duration (min)</Label>
              <NumberStepper
                value={Number(durationMinutes) || 0}
                onValueChange={(v) => setDurationMinutes(v ? String(v) : '')}
                min={0}
                max={600}
                step={5}
                suffix="m"
                ariaLabel="Duration in minutes"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-next">Next Followup</Label>
              <DateSelect
                id="fu-next"
                value={nextFollowUpDate}
                onChange={setNextFollowUpDate}
                minDate={todayIso()}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fu-assigned">Assign to (optional)</Label>
              <CustomSelect
                id="fu-assigned"
                value={assignedToId}
                onValueChange={setAssignedToId}
                placeholder="Unassigned"
                options={memberOptions}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fu-notes">Notes</Label>
            <Textarea
              id="fu-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
