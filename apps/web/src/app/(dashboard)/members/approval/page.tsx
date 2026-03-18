'use client';

import { useMembers, useApproveMember } from '@/hooks/use-members';
import { Button } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import Link from 'next/link';

export default function MemberApprovalPage() {
  const { data: result, isLoading } = useMembers({ approvalStatus: 'pending' });
  const approveMember = useApproveMember();

  const members = result?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/members" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Members
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground">Review and approve pending member registrations</p>
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
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  <Link href={`/members/${member.id}`} className="hover:underline">
                    {member.firstName} {member.lastName}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{member.email}</p>
                    {member.phone && <p>{member.phone}</p>}
                    <p>Branch: {member.branchName}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      disabled={approveMember.isPending}
                      onClick={() => {
                        if (confirm(`Reject ${member.firstName} ${member.lastName}?`)) {
                          approveMember.mutate({ id: member.id, data: { approved: false } });
                        }
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={approveMember.isPending}
                      onClick={() => {
                        approveMember.mutate({ id: member.id, data: { approved: true } });
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
