'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import {
  useMyDepartmentJoinRequests,
  useRespondToDepartmentOffer,
  useWithdrawDepartmentJoinRequest,
} from '@/hooks/use-departments';

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied — awaiting review',
  interview_scheduled: 'Interview scheduled',
  interviewed: 'Interview completed',
  offered: 'Offer extended',
  probation: 'On probation',
};

function formatDateTime(value: string | Date | null) {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MyRequestsPanel() {
  const { data: requests, isLoading } = useMyDepartmentJoinRequests();
  const respond = useRespondToDepartmentOffer();
  const withdraw = useWithdrawDepartmentJoinRequest();

  const grouped = useMemo(() => {
    const list = requests ?? [];
    return {
      offers: list.filter((r) => r.status === 'offered'),
      pending: list.filter(
        (r) => r.status === 'applied' || r.status === 'interview_scheduled' || r.status === 'interviewed',
      ),
      probation: list.filter((r) => r.status === 'probation'),
    };
  }, [requests]);

  if (isLoading) return null;
  if (!requests || requests.length === 0) return null;

  const handleAccept = (branchDeptId: string, requestId: string) => {
    respond.mutate(
      { branchDeptId, requestId, data: { offerResponse: 'accepted' } },
      {
        onSuccess: () => toast.success('Offer accepted — welcome to the team!'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to accept offer.'),
      },
    );
  };

  const handleDecline = (branchDeptId: string, requestId: string) => {
    if (!confirm('Decline this offer?')) return;
    respond.mutate(
      { branchDeptId, requestId, data: { offerResponse: 'declined' } },
      {
        onSuccess: () => toast.success('Offer declined.'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to decline offer.'),
      },
    );
  };

  const handleWithdraw = (branchDeptId: string, requestId: string) => {
    if (!confirm('Withdraw your application?')) return;
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
    <div className="space-y-4">
      {/* Offers — highest priority */}
      {grouped.offers.length > 0 && (
        <div className="space-y-3">
          {grouped.offers.map((req) => {
            const expires = formatDateTime(req.offerExpiresAt);
            return (
              <Card
                key={req.id}
                className="border-[#f8b537]/50 bg-gradient-to-br from-[#f8b537]/10 to-[#f8b537]/5"
              >
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      You&rsquo;ve been offered a spot in {req.departmentName}
                    </CardTitle>
                    <CardDescription>
                      {req.branchName}
                      {req.probationDays
                        ? ` · ${req.probationDays}-day probation`
                        : ''}
                      {expires ? ` · expires ${expires}` : ''}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {req.offerMessage && (
                    <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {req.offerMessage}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.branchDepartmentId, req.id)}
                      disabled={respond.isPending}
                    >
                      Accept offer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(req.branchDepartmentId, req.id)}
                      disabled={respond.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending applications + probation */}
      {(grouped.pending.length > 0 || grouped.probation.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My applications</CardTitle>
            <CardDescription>
              In-progress join requests across departments.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border/40">
              {[...grouped.pending, ...grouped.probation].map((req) => {
                const interviewAt =
                  req.status === 'interview_scheduled'
                    ? formatDateTime(req.interviewScheduledAt)
                    : null;
                return (
                  <li
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/departments/${req.branchDepartmentId}`}
                        className="font-medium hover:underline"
                      >
                        {req.departmentName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {req.branchName} ·{' '}
                        {STATUS_LABELS[req.status] ?? req.status}
                        {interviewAt ? ` · ${interviewAt}` : ''}
                        {req.status === 'probation' && req.probationEndDate
                          ? ` · ends ${new Date(req.probationEndDate).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    {req.status !== 'probation' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWithdraw(req.branchDepartmentId, req.id)}
                        disabled={withdraw.isPending}
                      >
                        Withdraw
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
