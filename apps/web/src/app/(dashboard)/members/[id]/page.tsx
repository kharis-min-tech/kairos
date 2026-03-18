'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMember, useMemberRoles, useRemoveRole } from '@/hooks/use-members';
import { Button } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: member, isLoading, error } = useMember(id);
  const { data: roles } = useMemberRoles(id);
  const removeRole = useRemoveRole();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading member...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Member not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/members" className="text-sm text-muted-foreground hover:underline">
            &larr; Back to Members
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-muted-foreground">
            <span className={
              member.approvalStatus === 'approved' ? 'text-emerald-600' :
              member.approvalStatus === 'pending' ? 'text-amber-600' :
              'text-rose-600'
            }>
              {member.approvalStatus}
            </span>
            {' \u00b7 '}
            <span className="capitalize">{member.systemRole}</span>
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Email" value={member.email} />
            <InfoRow label="Phone" value={member.phone} />
            <InfoRow label="Gender" value={member.gender} />
            <InfoRow label="Date of Birth" value={member.dateOfBirth} />
            <InfoRow label="Membership Date" value={member.membershipDate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Address" value={member.address} />
            <InfoRow label="City" value={member.city} />
            <InfoRow label="Postal Code" value={member.postalCode} />
            <InfoRow label="Emergency Contact" value={member.emergencyContactName} />
            <InfoRow label="Emergency Phone" value={member.emergencyContactPhone} />
          </CardContent>
        </Card>
      </div>

      {/* Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Current role assignments for this member</CardDescription>
        </CardHeader>
        <CardContent>
          {!roles || roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned.</p>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{role.roleName}</p>
                    <p className="text-sm text-muted-foreground">
                      {role.branchName} &middot; Since {role.assignedDate}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove role "${role.roleName}"?`)) {
                          removeRole.mutate({ memberId: id, roleAssignmentId: role.id });
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value ?? '\u2014'}</span>
    </div>
  );
}
