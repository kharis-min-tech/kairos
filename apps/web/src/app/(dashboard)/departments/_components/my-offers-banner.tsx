'use client';

import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kairos/ui';
import { useRespondToDepartmentOffer } from '@/hooks/use-departments';
import type { MyDepartmentJoinRequest } from '@kairos/types';
import { useConfirm } from '@/components/confirm-dialog';

interface Props {
  offers: MyDepartmentJoinRequest[];
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

export function MyOffersBanner({ offers }: Props) {
  const respond = useRespondToDepartmentOffer();
  const { confirm, dialog: confirmDialog } = useConfirm();

  if (offers.length === 0) return null;

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

  const handleDecline = async (branchDeptId: string, requestId: string, departmentName: string) => {
    const ok = await confirm({
      title: `Decline the offer from ${departmentName}?`,
      description: 'You won’t be added to this department. You can apply again later if you change your mind.',
      confirmLabel: 'Decline',
      variant: 'destructive',
    });
    if (!ok) return;
    respond.mutate(
      { branchDeptId, requestId, data: { offerResponse: 'declined' } },
      {
        onSuccess: () => toast.success('Offer declined.'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to decline offer.'),
      },
    );
  };

  return (
    <div className="space-y-3">
      {confirmDialog}
      {offers.map((req) => {
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
                  {req.probationDays ? ` · ${req.probationDays}-day probation` : ''}
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
                  onClick={() => handleDecline(req.branchDepartmentId, req.id, req.departmentName)}
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
  );
}
