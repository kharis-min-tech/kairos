'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMembers, useApproveMember } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import { Button } from '@kairos/ui';
import { Card, CardContent } from '@kairos/ui';
import Link from 'next/link';

export default function MemberApprovalPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'admin';

  useEffect(() => {
    if (user !== null && !isAdmin) router.replace('/members');
  }, [user, isAdmin, router]);

  const { data: result, isLoading, error } = useMembers({ approvalStatus: 'pending' }, isAdmin);
  const approveMember = useApproveMember();
  const { confirm, dialog: confirmDialog } = useConfirm();

  if (user !== null && !isAdmin) return null;

  const members = result?.data ?? [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <Link href="/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Members
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Approval Queue</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review and approve pending member registrations</p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-6" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-11 w-11 animate-pulse rounded-full bg-muted/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted/40" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 animate-pulse rounded bg-muted/40" />
                  <div className="h-8 w-20 animate-pulse rounded bg-muted/40" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load pending registrations.'}
          </p>
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No pending members to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => {
            const initials = ((member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')).toUpperCase() || '?';
            return (
              <Card key={member.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#f8b537]/15 text-sm font-bold text-[#9a6b04] dark:text-[#f8b537]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/members/${member.id}`} className="font-medium hover:underline">
                      {member.firstName} {member.lastName}
                    </Link>
                    <div className="mt-0.5 space-y-0.5 text-sm text-muted-foreground">
                      <p className="truncate">{member.email}</p>
                      {member.phone && <p>{member.phone}</p>}
                      <p>{member.branchName}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={approveMember.isPending}
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Reject ${member.firstName} ${member.lastName}?`,
                          description: 'Their registration request will be marked as rejected.',
                          confirmLabel: 'Reject',
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        approveMember.mutate(
                          { id: member.id, data: { approved: false } },
                          {
                            onSuccess: () => toast.success('Registration rejected.'),
                            onError: () => toast.error('Failed to reject registration. Please try again.'),
                          },
                        );
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={approveMember.isPending}
                      onClick={() => {
                        approveMember.mutate(
                          { id: member.id, data: { approved: true } },
                          {
                            onSuccess: () => toast.success('Member approved.'),
                            onError: () => toast.error('Failed to approve member. Please try again.'),
                          },
                        );
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
