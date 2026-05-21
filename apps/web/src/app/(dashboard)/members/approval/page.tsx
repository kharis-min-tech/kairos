'use client';

import { useMembers, useApproveMember } from '@/hooks/use-members';
import { toast } from 'sonner';
import { Button } from '@kairos/ui';
import { Card, CardContent } from '@kairos/ui';
import Link from 'next/link';

export default function MemberApprovalPage() {
  const { data: result, isLoading } = useMembers({ approvalStatus: 'pending' });
  const approveMember = useApproveMember();

  const members = result?.data ?? [];

  return (
    <div className="space-y-6">
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
        <p className="text-muted-foreground">Loading...</p>
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
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#f8b537]/15 text-sm font-bold text-amber-700">
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
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                      disabled={approveMember.isPending}
                      onClick={() => {
                        if (confirm(`Reject ${member.firstName} ${member.lastName}?`)) {
                          approveMember.mutate(
                            { id: member.id, data: { approved: false } },
                            {
                              onSuccess: () => toast.success('Registration rejected.'),
                              onError: () => toast.error('Failed to reject registration. Please try again.'),
                            },
                          );
                        }
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
                            onSuccess: () => toast.success('Member approved and notified.'),
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
