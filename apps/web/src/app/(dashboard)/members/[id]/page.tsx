'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMember, useMemberRoles, useRemoveRole, useDeactivateMember, useApproveMember, useReactivateMember, useAssignRole, useAllRoles, useSetMembershipClass } from '@/hooks/use-members';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useFellowships, useAddFellowshipMember } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { Button, CustomSelect } from '@kairos/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { DateSelect } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { MemberAvatar } from '@/components/member-avatar';
import { Lock, BadgeCheck } from 'lucide-react';
import { SafeguardingSection } from './_components/safeguarding-section';
import { useConfirm } from '@kairos/ui';

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
  const setMembershipClass = useSetMembershipClass();
  const [classDateDraft, setClassDateDraft] = useState('');
  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
  const isAdmin = user?.systemRole === 'admin';
  const isPastor = caps.has('branch:write');
  const canManage = isAdmin || isPastor;
  const isSelf = user?.id === id;
  const { confirm, dialog: confirmDialog } = useConfirm();

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
    return <MemberDetailSkeleton />;
  }

  if (error || !member) {
    const message = error instanceof Error ? error.message : 'Member not found or access denied.';
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  const statusCls =
    member.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : member.approvalStatus === 'pending' ? 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]'
    : 'bg-rose-100 text-rose-700';

  // When the member is a minor and the viewer lacks safeguarding access, the API
  // returns the sensitive fields as null. Show a locked notice rather than blanks.
  const hidden = member.isMinor && member.redacted;

  return (
    <div className="space-y-6">
      {confirmDialog}
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
                {member.isMinor && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f8b537]/15 px-2.5 py-0.5 text-xs font-medium text-[#5D3FD3]">
                    <Lock className="h-3 w-3" strokeWidth={2} />
                    Minor — protected
                  </span>
                )}
                <span className="text-sm capitalize text-muted-foreground">{member.systemRole}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isSelf && (
            <Link href="/profile">
              <Button size="sm" variant="outline">Edit my profile</Button>
            </Link>
          )}
          {canManage && (
            <>
              {member.approvalStatus === 'pending' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Approve ${member.firstName} ${member.lastName}?`,
                      description: 'They will be able to sign in once approved.',
                      confirmLabel: 'Approve',
                    });
                    if (!ok) return;
                    approve.mutate(
                      { id, data: { approved: true } },
                      {
                        onSuccess: () => toast.success('Member approved.'),
                        onError: () => toast.error('Failed to approve. Please try again.'),
                      },
                    );
                  }}
                >
                  Approve
                </Button>
              )}
              {member.isActive !== false && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Deactivate ${member.firstName} ${member.lastName}?`,
                      description: 'They will be removed from the active directory. You can reactivate them later.',
                      confirmLabel: 'Deactivate',
                      variant: 'destructive',
                    });
                    if (!ok) return;
                    deactivate.mutate(member.id, {
                      onSuccess: () => router.push('/members'),
                      onError: () => toast.error('Failed to deactivate member. Please try again.'),
                    });
                  }}
                >
                  Deactivate
                </Button>
              )}
              {member.isActive === false && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Reactivate ${member.firstName} ${member.lastName}?`,
                      description: 'They will appear back in the active directory.',
                      confirmLabel: 'Reactivate',
                    });
                    if (!ok) return;
                    reactivate.mutate(member.id, {
                      onSuccess: () => toast.success('Member reactivated.'),
                      onError: () => toast.error('Failed to reactivate. Please try again.'),
                    });
                  }}
                >
                  Reactivate
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Email" value={member.email} redacted={hidden} />
            <InfoRow label="Phone" value={member.phone} redacted={hidden} />
            <InfoRow label="Gender" value={member.gender} />
            <InfoRow label="Date of Birth" value={member.dateOfBirth} redacted={hidden} />
            <InfoRow label="Membership Date" value={member.membershipDate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Address" value={member.address} redacted={hidden} />
            <InfoRow label="City" value={member.city} redacted={hidden} />
            <InfoRow label="Postal Code" value={member.postalCode} redacted={hidden} />
            <InfoRow label="Emergency Contact" value={member.emergencyContactName} redacted={hidden} />
            <InfoRow label="Relationship" value={member.emergencyContactRelationship} redacted={hidden} />
            <InfoRow label="Emergency Phone" value={member.emergencyContactPhone} redacted={hidden} />
          </CardContent>
        </Card>
      </div>

      {/* Membership status — the real "confirmed Member" signal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck
              className={`h-5 w-5 ${member.membershipClassCompletedAt ? 'text-emerald-600' : 'text-muted-foreground'}`}
              strokeWidth={2}
            />
            Membership Class
          </CardTitle>
          <CardDescription>
            Membership in this church is conferred by completing the 4-week class. This is the
            formal status &mdash; separate from joining a fellowship or department.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {member.membershipClassCompletedAt ? (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Confirmed Member
                </p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                  Completed the class on{' '}
                  {new Date(member.membershipClassCompletedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setMembershipClass.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Clear membership certification?',
                      description: `${member.firstName} ${member.lastName} will revert to "not yet a confirmed Member."`,
                      confirmLabel: 'Clear',
                      variant: 'destructive',
                    });
                    if (!ok) return;
                    setMembershipClass.mutate(
                      { id, completedAt: null },
                      {
                        onSuccess: () => toast.success('Membership cleared.'),
                        onError: () =>
                          toast.error('Failed to clear membership. Please try again.'),
                      },
                    );
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Not yet a confirmed Member. Once they complete the 4-week class, mark the completion
              date here.
            </div>
          )}

          {canManage && !member.membershipClassCompletedAt && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date completed
                </label>
                <DateSelect value={classDateDraft} onChange={setClassDateDraft} />
              </div>
              <Button
                disabled={!classDateDraft || setMembershipClass.isPending}
                onClick={async () => {
                  if (!classDateDraft) return;
                  const ok = await confirm({
                    title: 'Mark membership class as completed?',
                    description: `${member.firstName} ${member.lastName} will be recorded as a confirmed Member as of ${classDateDraft}.`,
                    confirmLabel: 'Confirm',
                  });
                  if (!ok) return;
                  setMembershipClass.mutate(
                    { id, completedAt: new Date(`${classDateDraft}T00:00:00.000Z`).toISOString() },
                    {
                      onSuccess: () => {
                        toast.success('Membership certified.');
                        setClassDateDraft('');
                      },
                      onError: () =>
                        toast.error('Failed to mark membership. Please try again.'),
                    },
                  );
                }}
              >
                {setMembershipClass.isPending ? 'Saving…' : 'Mark Membership Class Complete'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safeguarding & Health — minors only */}
      {member.isMinor && (
        <SafeguardingSection
          memberId={member.id}
          redacted={member.redacted}
          canEdit={canManage}
        />
      )}

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
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Remove "${role.roleName}"?`,
                          description: `This will revoke the ${role.roleName} role from ${member.firstName} ${member.lastName} at ${role.branchName}.`,
                          confirmLabel: 'Remove role',
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        removeRole.mutate(
                          { memberId: id, roleAssignmentId: role.id },
                          {
                            onSuccess: () => toast.success('Role removed.'),
                            onError: () => toast.error('Failed to remove role. Please try again.'),
                          },
                        );
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
      {(canManage || isSelf) && (
        <Card>
          <CardHeader>
            <CardTitle>Fellowships</CardTitle>
            <CardDescription>
              {alreadyInFellowship
                ? (isSelf ? 'Your fellowship membership' : 'This member\'s fellowship membership')
                : canManage
                  ? 'Assign this member to a fellowship in their branch'
                  : 'You haven\'t joined a fellowship yet'}
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
            ) : canManage ? (
              <>
                {addToFellowship.isSuccess && (
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                    Member added to fellowship successfully.
                  </div>
                )}
                {addToFellowship.error && (
                  <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
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
                  <Button
                    variant="success"
                    disabled={!selectedFellowshipId || addToFellowship.isPending}
                    onClick={() => {
                      if (!selectedFellowshipId) return;
                      addToFellowship.mutate(
                        { fellowshipId: selectedFellowshipId, data: { memberId: member.id } },
                        { onSuccess: () => setSelectedFellowshipId('') }
                      );
                    }}
                  >
                    {addToFellowship.isPending ? 'Adding…' : 'Assign'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  To view or remove fellowship memberships, open the fellowship&apos;s Members tab.
                </p>
              </>
            ) : (
              <div className="space-y-3 rounded-lg bg-[#5D3FD3]/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Browse the fellowships at your branch and send a join request to one that fits your schedule.
                </p>
                <Link href="/fellowships">
                  <Button size="sm" variant="outline">Browse fellowships</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemberDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4 pb-6">
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-1/3 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="h-5 w-1/3 animate-pulse rounded bg-muted/60" />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="h-4 w-full animate-pulse rounded bg-muted/40" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, redacted }: { label: string; value: string | null | undefined; redacted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      {redacted ? (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-[#5D3FD3]" strokeWidth={1.5} />
          {'Hidden \u2014 safeguarding protected'}
        </span>
      ) : (
        <span>{value ?? '\u2014'}</span>
      )}
    </div>
  );
}
