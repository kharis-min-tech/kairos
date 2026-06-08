'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Button, Card, CardContent } from '@kairos/ui';
import { useWithdrawDepartmentJoinRequest } from '@/hooks/use-departments';
import type { MyDepartmentJoinRequest } from '@kairos/types';
import { useConfirm } from '@/components/confirm-dialog';

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied · awaiting review',
  interview_scheduled: 'Interview scheduled',
  interviewed: 'Interview completed',
};

interface Props {
  items: MyDepartmentJoinRequest[];
}

function formatDateTime(value: string | Date | null) {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MyApplicationsList({ items }: Props) {
  const withdraw = useWithdrawDepartmentJoinRequest();
  const { confirm, dialog: confirmDialog } = useConfirm();

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-1 py-10 text-center">
          <p className="text-sm font-medium">No applications in progress.</p>
          <p className="text-xs text-muted-foreground">
            Request to join a department from the list below.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleWithdraw = async (branchDeptId: string, requestId: string, departmentName: string) => {
    const ok = await confirm({
      title: `Withdraw your application to ${departmentName}?`,
      description: 'Your application will be cancelled. You can apply again later.',
      confirmLabel: 'Withdraw',
      variant: 'destructive',
    });
    if (!ok) return;
    withdraw.mutate(
      { branchDeptId, requestId },
      {
        onSuccess: () => toast.success('Application withdrawn.'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to withdraw.'),
      },
    );
  };

  return (
    <Card>
      {confirmDialog}
      <CardContent className="p-0">
        <ul className="divide-y divide-border/40">
          {items.map((req) => {
            const interviewAt =
              req.status === 'interview_scheduled'
                ? formatDateTime(req.interviewScheduledAt)
                : null;
            return (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <Link
                    href={`/departments/${req.branchDepartmentId}`}
                    className="font-medium hover:underline"
                  >
                    {req.departmentName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {req.branchName} · {STATUS_LABELS[req.status] ?? req.status}
                    {interviewAt ? ` · ${interviewAt}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWithdraw(req.branchDepartmentId, req.id, req.departmentName)}
                  disabled={withdraw.isPending}
                >
                  Withdraw
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
