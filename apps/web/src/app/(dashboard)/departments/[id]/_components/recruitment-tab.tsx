'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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

const OPEN_STATUSES = [
  'applied',
  'interview_scheduled',
  'interviewed',
  'offered',
  'probation',
] as const;

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

  const schedule = useScheduleDepartmentInterview();
  const record = useRecordDepartmentInterview();
  const extendOffer = useExtendDepartmentOffer();
  const reject = useRejectDepartmentJoinRequest();
  const evaluateProbation = useEvaluateDepartmentProbation();

  const columns = useMemo(() => {
    const grouped: Record<(typeof OPEN_STATUSES)[number], DepartmentJoinRequestWithMember[]> = {
      applied: [],
      interview_scheduled: [],
      interviewed: [],
      offered: [],
      probation: [],
    };
    for (const r of joinRequests) {
      if ((OPEN_STATUSES as readonly string[]).includes(r.status)) {
        grouped[r.status as (typeof OPEN_STATUSES)[number]].push(r);
      }
    }
    return grouped;
  }, [joinRequests]);

  const terminal = useMemo(
    () =>
      joinRequests.filter(
        (r) => !(OPEN_STATUSES as readonly string[]).includes(r.status),
      ),
    [joinRequests],
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2">
        <RecruitmentColumn
          title="Applied"
          status="applied"
          requests={columns.applied}
          onAction={(req) => setDialog({ kind: 'schedule', request: req })}
          actionLabel="Schedule Interview"
          onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
          secondaryLabel="Reject"
        />
        <RecruitmentColumn
          title="Interview Scheduled"
          status="interview_scheduled"
          requests={columns.interview_scheduled}
          onAction={(req) => setDialog({ kind: 'record', request: req })}
          actionLabel="Record Interview"
          onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
          secondaryLabel="Reject"
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
        />
        <RecruitmentColumn
          title="Offer Extended"
          status="offered"
          requests={columns.offered}
          actionLabel={null}
          onSecondary={(req) => setDialog({ kind: 'reject', request: req })}
          secondaryLabel="Withdraw Offer"
        />
        <RecruitmentColumn
          title="On Probation"
          status="probation"
          requests={columns.probation}
          onAction={(req) => setDialog({ kind: 'probation', request: req })}
          actionLabel="Evaluate"
        />
      </div>

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
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────

interface ColumnProps {
  title: string;
  status: (typeof OPEN_STATUSES)[number];
  requests: DepartmentJoinRequestWithMember[];
  actionLabel?: string | null;
  onAction?: (req: DepartmentJoinRequestWithMember) => void;
  actionDisabled?: (req: DepartmentJoinRequestWithMember) => boolean;
  secondaryLabel?: string;
  onSecondary?: (req: DepartmentJoinRequestWithMember) => void;
}

function RecruitmentColumn({
  title,
  requests,
  actionLabel,
  onAction,
  actionDisabled,
  secondaryLabel,
  onSecondary,
}: ColumnProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {title}
          <span className="ml-2 rounded-full bg-[#f0f0f3] px-2 py-0.5 text-xs text-muted-foreground dark:bg-white/[0.06]">
            {requests.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-3">
        {requests.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Empty</p>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-border/40 bg-background p-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <MemberAvatar
                  photoUrl={r.memberPhotoUrl}
                  firstName={r.memberFirstName}
                  lastName={r.memberLastName}
                  size="xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.memberFirstName} {r.memberLastName}
                  </p>
                  {r.interviewScheduledAt && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      Interview: {new Date(r.interviewScheduledAt).toLocaleString()}
                    </p>
                  )}
                  {r.offerExpiresAt && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      Offer expires: {new Date(r.offerExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                  {r.probationEndDate && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      Probation ends: {r.probationEndDate}
                    </p>
                  )}
                  {r.interviewOutcome && r.interviewOutcome !== 'pending' && (
                    <p
                      className={
                        'mt-0.5 text-[10px] font-medium ' +
                        (r.interviewOutcome === 'pass'
                          ? 'text-emerald-600'
                          : 'text-rose-600')
                      }
                    >
                      Interview: {r.interviewOutcome}
                    </p>
                  )}
                </div>
              </div>
              {(actionLabel || secondaryLabel) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {actionLabel && onAction && (
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={actionDisabled?.(r) ?? false}
                      onClick={() => onAction(r)}
                    >
                      {actionLabel}
                    </Button>
                  )}
                  {secondaryLabel && onSecondary && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => onSecondary(r)}
                    >
                      {secondaryLabel}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ── Dialogs ────────────────────────────────────────────────

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
            Schedule interview — {request.memberFirstName} {request.memberLastName}
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
            Record interview — {request.memberFirstName} {request.memberLastName}
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
            Extend offer — {request.memberFirstName} {request.memberLastName}
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
            Reject — {request.memberFirstName} {request.memberLastName}
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
            Evaluate probation — {request.memberFirstName} {request.memberLastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Outcome</Label>
            <CustomSelect
              value={outcome}
              onValueChange={(v) => setOutcome(v as 'passed' | 'failed')}
              options={[
                { value: 'passed', label: 'Passed — promote to full member' },
                { value: 'failed', label: 'Failed — remove from team' },
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
