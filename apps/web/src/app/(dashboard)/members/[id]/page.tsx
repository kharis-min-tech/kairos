'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMember, useMemberRoles, useRemoveRole, useDeactivateMember, useApproveMember, useReactivateMember, useAssignRole, useAllRoles } from '@/hooks/use-members';
import { useFellowships, useAddFellowshipMember } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { MemberAvatar } from '@/components/member-avatar';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: member, isLoading, error } = useMember(id);
  const { data: roles } = useMemberRoles(id);
  const removeRole = useRemoveRole();
  const deactivate = useDeactivateMember();
  const reactivate = useReactivateMember();
  const approve = useApproveMember();
  const assignRole = useAssignRole();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin';
  const isPastor = activeRole === 'pastor';
  const canManage = isAdmin || isPastor;

  const [selectedFellowshipId, setSelectedFellowshipId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const { data: allRoles } = useAllRoles();
  const { data: branchesData } = useBranches();
  const { data: currentFellowshipsData, isLoading: currentFellowshipsLoading } = useFellowships(
    member ? { branchId: member.homeBranchId, memberId: member.id, limit: 20 } : undefined
  );
  const { data: fellowshipsData } = useFellowships(
    member ? { branchId: member.homeBranchId, limit: 100 } : undefined
  );
  const addToFellowship = useAddFellowshipMember();
  const currentFellowships = currentFellowshipsData?.data ?? [];
  const alreadyInFellowship = currentFellowships.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading member...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="rounded-lg bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Member not found or access denied.</p>
      </div>
    );
  }

  const statusCls =
    member.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : member.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700'
    : 'bg-rose-100 text-rose-700';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div className="flex-1">
          <Link href="/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Members
          </Link>
          <div className="mt-2 flex items-center gap-4">
            <MemberAvatar
              photoUrl={member.photoUrl}
              firstName={member.firstName}
              lastName={member.lastName}
              size="lg"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {member.firstName} {member.lastName}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
                  {member.approvalStatus}
                </span>
                <span className="text-sm capitalize text-muted-foreground">{member.systemRole}</span>
              </div>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
              {member.approvalStatus === 'pending' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    if (confirm(`Approve ${member.firstName} ${member.lastName}?`)) {
                      approve.mutate(
                        { id, data: { approved: true } },
                        {
                          onSuccess: () => toast.success('Member approved.'),
                          onError: () => toast.error('Failed to approve. Please try again.'),
                        },
                      );
                    }
                  }}
                >
                  Approve
                </Button>
              )}
              {member.isActive !== false && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Deactivate ${member.firstName} ${member.lastName}?`)) {
                      deactivate.mutate(member.id, {
                        onSuccess: () => router.push('/members'),
                        onError: () => toast.error('Failed to deactivate member. Please try again.'),
                      });
                    }
                  }}
                >
                  Deactivate
                </Button>
              )}
              {member.isActive === false && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    if (confirm(`Reactivate ${member.firstName} ${member.lastName}?`)) {
                      reactivate.mutate(member.id, {
                        onSuccess: () => toast.success('Member reactivated.'),
                        onError: () => toast.error('Failed to reactivate. Please try again.'),
                      });
                    }
                  }}
                >
                  Reactivate
                </Button>
              )}
            </div>
          )}
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
            <InfoRow label="Relationship" value={member.emergencyContactRelationship} />
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
                <div key={role.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
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
                          removeRole.mutate(
                            { memberId: id, roleAssignmentId: role.id },
                            {
                              onSuccess: () => toast.success('Role removed.'),
                              onError: () => toast.error('Failed to remove role. Please try again.'),
                            },
                          );
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
          {isAdmin && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-sm font-medium">Assign Role</p>
              {assignRole.error && (
                <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                  {assignRole.error instanceof Error ? assignRole.error.message : 'Failed to assign role.'}
                </div>
              )}
              <div className="flex gap-2">
                <CustomSelect
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                  placeholder="Select role…"
                  options={(allRoles ?? []).map((r) => ({ value: r.id, label: r.roleName }))}
                />
                <CustomSelect
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                  placeholder="Select branch…"
                  options={(branchesData ?? []).map((b) => ({ value: b.id, label: b.branchName }))}
                />
                <button
                  disabled={!selectedRoleId || !selectedBranchId || assignRole.isPending}
                  onClick={() => {
                    assignRole.mutate(
                      { memberId: id, data: { roleId: selectedRoleId, branchId: selectedBranchId } },
                      { onSuccess: () => { setSelectedRoleId(''); setSelectedBranchId(''); } }
                    );
                  }}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {assignRole.isPending ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {(canManage || user?.id === id) && (
        <Card>
          <CardHeader>
            <CardTitle>Fellowships</CardTitle>
            <CardDescription>
              {alreadyInFellowship
                ? 'This member\'s fellowship membership'
                : 'Assign this member to a fellowship in their branch'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentFellowshipsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : alreadyInFellowship ? (
              <div className="space-y-2">
                {currentFellowships.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                    <div>
                      <p className="font-medium">{f.fellowshipName}</p>
                      <p className="text-sm text-muted-foreground">{f.fellowshipType}</p>
                    </div>
                    <a
                      href={`/fellowships/${f.id}`}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      View Fellowship →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {addToFellowship.isSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    Member added to fellowship successfully.
                  </div>
                )}
                {addToFellowship.error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {addToFellowship.error instanceof Error
                      ? addToFellowship.error.message
                      : 'Could not add member to fellowship.'}
                  </div>
                )}
                <div className="flex gap-2">
                  <CustomSelect
                    value={selectedFellowshipId}
                    onValueChange={setSelectedFellowshipId}
                    placeholder="Select a fellowship…"
                    options={(fellowshipsData?.data ?? []).filter((f) => f.isActive).map((f) => ({ value: f.id, label: f.fellowshipName }))}
                  />
                  <button
                    disabled={!selectedFellowshipId || addToFellowship.isPending}
                    onClick={() => {
                      if (!selectedFellowshipId) return;
                      addToFellowship.mutate(
                        { fellowshipId: selectedFellowshipId, data: { memberId: member.id } },
                        { onSuccess: () => setSelectedFellowshipId('') }
                      );
                    }}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {addToFellowship.isPending ? 'Adding…' : 'Assign'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  To view or remove fellowship memberships, open the fellowship&apos;s Members tab.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
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
