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
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Member not found or access denied.</p>
      </div>
    );
  }

  const initials = ((member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')).toUpperCase() || '?';
  const statusCls =
    member.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : member.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700'
    : 'bg-rose-100 text-rose-700';

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <Link href="/members" className="inline-flex items-center gap-1 text-sm text-purple-200 hover:text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Members
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {member.firstName} {member.lastName}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                {member.approvalStatus}
              </span>
              <span className="text-sm capitalize text-purple-200">{member.systemRole}</span>
            </div>
          </div>
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
