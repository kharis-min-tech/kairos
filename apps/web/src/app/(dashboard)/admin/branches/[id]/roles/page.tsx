'use client';

export const runtime = 'edge';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useBranch, useBranchRoles, useAssignBranchRole, useRevokeBranchRole } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@/components/confirm-dialog';
import { MemberAvatar } from '@/components/member-avatar';
import { formatShortDate } from '@kairos/core';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CustomSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@kairos/ui';

export default function BranchRolesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const branchSystemAdminBranchIds = useAuthStore((s) => s.branchSystemAdminBranchIds);
  const branchDataAdminBranchIds = useAuthStore((s) => s.branchDataAdminBranchIds);

  const isSystemAdmin = activeRole === 'admin';
  const isBSA = branchSystemAdminBranchIds.includes(id);
  const isBDA = branchDataAdminBranchIds.includes(id);
  const canManage = isSystemAdmin || isBSA;
  const canView = canManage || isBDA;

  // Second-level route guard: only system admins + branch admins of THIS branch.
  // Anyone else (regular pastor, leader, member, BSA of a different branch) is
  // bounced to /. We wait until activeRole loads before deciding.
  useEffect(() => {
    if (activeRole === null) return;
    if (!canView) router.replace('/');
  }, [activeRole, canView, router]);

  const { data: branch, isLoading: branchLoading } = useBranch(id);
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useBranchRoles(canView ? id : '');

  // Member picker — scoped to this branch only. We pull up to 100; if a branch
  // ever exceeds that we'll need search/pagination on this dialog.
  const [showAssign, setShowAssign] = useState(false);
  const [assignMemberId, setAssignMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const { data: membersData, isLoading: membersLoading } = useMembers(
    canManage && showAssign ? { branchId: id, limit: 100, search: memberSearch || undefined } : undefined,
  );

  const assignBranchRole = useAssignBranchRole();
  const revokeBranchRole = useRevokeBranchRole();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Filter out members who are already assigned so they don't show up in the picker.
  const assignedMemberIds = useMemo(
    () => new Set((roles ?? []).filter((r) => r.isActive).map((r) => r.memberId)),
    [roles],
  );
  const assignableMembers = useMemo(
    () => (membersData?.data ?? []).filter((m) => !assignedMemberIds.has(m.id)),
    [membersData, assignedMemberIds],
  );

  const activeRoles = useMemo(() => (roles ?? []).filter((r) => r.isActive), [roles]);
  const isLastBSA = activeRoles.length <= 1;

  if (activeRole === null || branchLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="mx-auto max-w-2xl space-y-6">
        <div className="h-9 w-72 animate-pulse rounded bg-muted/60" />
        <div className="h-56 animate-pulse rounded-lg bg-muted/60" />
        <span className="sr-only">Loading branch roles</span>
      </div>
    );
  }

  if (!canView) {
    // Guard effect will redirect; render nothing in the meantime.
    return null;
  }

  if (!branch) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">Branch not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            <Link href={`/admin/branches/${id}`} className="hover:underline">{branch.branchName}</Link>
            <span className="mx-1.5 text-muted-foreground/60">/</span>
            Roles
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Branch System Admins</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Branch System Admins can assign and revoke roles, manage access, and configure branch settings.
          </p>
        </div>
        {canManage && (
          <Button
            variant="success"
            onClick={() => setShowAssign(true)}
          >
            Assign Admin
          </Button>
        )}
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Branch System Admins</CardTitle>
          <CardDescription>
            {isBDA && !canManage
              ? 'You can view who holds this role, but assigning or revoking requires Branch System Admin authority.'
              : 'These members have full administrative control over this branch.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div aria-busy="true" className="space-y-3">
              <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
            </div>
          ) : rolesError ? (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {(rolesError as Error).message || 'Failed to load Branch System Admins.'}
            </div>
          ) : activeRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Branch System Admins assigned yet. {canManage ? 'Add one to get started.' : ''}
            </p>
          ) : (
            <ul className="space-y-3">
              {activeRoles.map((assignment) => {
                const fullName = `${assignment.member.firstName} ${assignment.member.lastName}`.trim();
                const cannotRevoke = canManage && isLastBSA;
                return (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <MemberAvatar
                        firstName={assignment.member.firstName}
                        lastName={assignment.member.lastName}
                        size="md"
                        variant="light"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{fullName}</p>
                        <p className="truncate text-sm text-muted-foreground">{assignment.member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned {formatShortDate(assignment.assignedDate)}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={cannotRevoke || revokeBranchRole.isPending}
                        title={cannotRevoke ? 'Cannot revoke the last active Branch System Admin' : undefined}
                        aria-label={`Revoke Branch System Admin from ${fullName}`}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Revoke Branch System Admin from ${fullName}?`,
                            description:
                              'They will lose access to admin-level branch tools. You can reassign them later.',
                            confirmLabel: 'Revoke',
                            variant: 'destructive',
                          });
                          if (!ok) return;
                          revokeBranchRole.mutate({ branchId: id, assignmentId: assignment.id });
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {revokeBranchRole.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {(revokeBranchRole.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assign dialog */}
      <Dialog
        open={showAssign}
        onOpenChange={(open) => {
          setShowAssign(open);
          if (!open) {
            setAssignMemberId('');
            setMemberSearch('');
            assignBranchRole.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Branch System Admin</DialogTitle>
            <DialogDescription>
              Select a member of {branch.branchName} to grant Branch System Admin authority.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-search">Search members</Label>
              <Input
                id="member-search"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Name or email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-member">Member</Label>
              <CustomSelect
                id="assign-member"
                value={assignMemberId}
                onValueChange={setAssignMemberId}
                placeholder={
                  membersLoading
                    ? 'Loading members...'
                    : assignableMembers.length === 0
                      ? 'No assignable members found'
                      : 'Select a member'
                }
                options={assignableMembers.map((m) => ({
                  value: m.id,
                  label: `${m.firstName} ${m.lastName}${m.email ? ` — ${m.email}` : ''}`,
                }))}
              />
              {!membersLoading && assignableMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Everyone in this branch is already an admin, or no members match.
                </p>
              )}
            </div>
            {assignBranchRole.error && (
              <p role="alert" className="text-sm text-destructive">
                {(assignBranchRole.error as Error).message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={assignBranchRole.isPending}
              onClick={() => setShowAssign(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={!assignMemberId || assignBranchRole.isPending}
              onClick={() => {
                if (!assignMemberId) return;
                assignBranchRole.mutate(
                  { branchId: id, data: { memberId: assignMemberId } },
                  {
                    onSuccess: () => {
                      setShowAssign(false);
                      setAssignMemberId('');
                      setMemberSearch('');
                    },
                  },
                );
              }}
            >
              {assignBranchRole.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </div>
  );
}
