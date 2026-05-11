'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  useDepartment,
  useDepartmentMembers,
  useDepartmentJoinRequests,
  useAddDepartmentMember,
  useRemoveDepartmentMember,
  useCreateDepartmentJoinRequest,
  useReviewDepartmentJoinRequest,
} from '@/hooks/use-departments';
import { useMembers } from '@/hooks/use-members';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  CustomSelect,
} from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { MemberAvatar } from '@/components/member-avatar';
import { FollowupsTab } from './_components/followups-tab';
import { UniformTab } from './_components/uniform-tab';
import { RotaTab } from './_components/rota-tab';

type Tab = 'overview' | 'members' | 'followups' | 'uniform' | 'rota' | 'join-requests';

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<string>('');

  const { data: dept, isLoading, error } = useDepartment(id);
  const { data: members } = useDepartmentMembers(id);
  const { data: joinRequests } = useDepartmentJoinRequests(id);
  const addMember = useAddDepartmentMember();
  const removeMember = useRemoveDepartmentMember();
  const createJoinRequest = useCreateDepartmentJoinRequest();
  const reviewJoinRequest = useReviewDepartmentJoinRequest();

  const { data: branchMembersData } = useMembers(
    dept?.branchId ? { branchId: dept.branchId, limit: 200 } : undefined,
  );
  const branchMembers = branchMembersData?.data ?? [];

  const isMemberOfDept = members?.some((m) => m.memberId === user?.id);
  const hasPendingRequest = joinRequests?.some(
    (r) => r.memberId === user?.id && r.status === 'pending',
  );
  const showRequestToJoin = !isAdminOrPastor && !isMemberOfDept && !hasPendingRequest;
  const isRestrictedView = !isAdminOrPastor && !isMemberOfDept;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading department...</p>
      </div>
    );
  }

  if (error || !dept) {
    return (
      <div className="space-y-4">
        <Link
          href="/departments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Departments
        </Link>
        <div className="rounded-lg bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Department not found.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    ...(!isRestrictedView
      ? ([
          { key: 'members' as const, label: `Members${members ? ` (${members.length})` : ''}` },
          { key: 'followups' as const, label: 'Followups' },
          { key: 'uniform' as const, label: 'Uniform' },
          { key: 'rota' as const, label: 'Rota' },
        ] as const)
      : []),
    ...(isAdminOrPastor
      ? [
          {
            key: 'join-requests' as const,
            label: `Requests${
              joinRequests
                ? ` (${joinRequests.filter((r) => r.status === 'pending').length})`
                : ''
            }`,
          },
        ]
      : []),
  ];

  const pendingRequests = joinRequests?.filter((r) => r.status === 'pending') ?? [];
  const otherRequests = joinRequests?.filter((r) => r.status !== 'pending') ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div className="min-w-0 flex-1">
          <Link
            href="/departments"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Departments
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{dept.departmentName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {dept.branchName} &middot; Lead: {dept.leadFirstName} {dept.leadLastName}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {showRequestToJoin && (
            <Button
              size="sm"
              onClick={() =>
                createJoinRequest.mutate(
                  { branchDeptId: id, data: {} },
                  {
                    onSuccess: () => toast.success('Join request submitted.'),
                    onError: () => toast.error('Failed to submit request.'),
                  },
                )
              }
              disabled={createJoinRequest.isPending}
            >
              {createJoinRequest.isPending ? 'Requesting...' : 'Request to Join'}
            </Button>
          )}
          {hasPendingRequest && (
            <span className="inline-flex items-center rounded-full bg-[#f8b537]/20 px-3 py-1 text-xs font-medium text-[#7a5a00] dark:text-[#f8b537]">
              Request pending review
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/40">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              (activeTab === tab.key
                ? 'border-[#5D3FD3] text-[#5D3FD3]'
                : 'border-transparent text-muted-foreground hover:text-foreground') +
              ' -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leadership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  photoUrl={dept.leadPhotoUrl}
                  firstName={dept.leadFirstName}
                  lastName={dept.leadLastName}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium">
                    {dept.leadFirstName} {dept.leadLastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Lead</p>
                </div>
              </div>
              {dept.deputyMemberId && dept.deputyFirstName && (
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    photoUrl={dept.deputyPhotoUrl}
                    firstName={dept.deputyFirstName}
                    lastName={dept.deputyLastName}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {dept.deputyFirstName} {dept.deputyLastName}
                    </p>
                    <p className="text-xs text-muted-foreground">Deputy</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {dept.description ?? 'No description provided.'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Members</p>
                  <p>{dept.memberCount ?? 0}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Started</p>
                  <p>{dept.startDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          {isAdminOrPastor && (
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => setShowAddMember((v) => !v)}>
                {showAddMember ? 'Cancel' : '+ Add Member'}
              </Button>
              {showAddMember && (
                <div className="flex flex-1 items-center gap-2">
                  <CustomSelect
                    size="sm"
                    value={memberToAdd}
                    onValueChange={(v) => setMemberToAdd(v)}
                    placeholder="Pick a member..."
                    options={branchMembers
                      .filter((bm) => !members?.some((m) => m.memberId === bm.id))
                      .map((m) => ({
                        value: m.id,
                        label: `${m.firstName} ${m.lastName}`,
                      }))}
                  />
                  <Button
                    size="sm"
                    disabled={!memberToAdd || addMember.isPending}
                    onClick={() =>
                      addMember.mutate(
                        { branchDeptId: id, data: { memberId: memberToAdd } },
                        {
                          onSuccess: () => {
                            toast.success('Member added.');
                            setMemberToAdd('');
                            setShowAddMember(false);
                          },
                          onError: () => toast.error('Failed to add member.'),
                        },
                      )
                    }
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
          {!members || members.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No members yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul>
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          photoUrl={m.memberPhotoUrl}
                          firstName={m.memberFirstName}
                          lastName={m.memberLastName}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {m.memberFirstName} {m.memberLastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {m.joinDate}
                          </p>
                        </div>
                      </div>
                      {isAdminOrPastor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `Remove ${m.memberFirstName} ${m.memberLastName} from ${dept.departmentName}?`,
                              )
                            ) {
                              removeMember.mutate(
                                { branchDeptId: id, memberId: m.memberId },
                                {
                                  onSuccess: () => toast.success('Member removed.'),
                                  onError: () => toast.error('Failed to remove member.'),
                                },
                              );
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <FollowupsTab
          branchDeptId={dept.id}
          members={members ?? []}
          canManage={
            isAdminOrPastor ||
            dept.leadMemberId === user?.id ||
            dept.deputyMemberId === user?.id
          }
        />
      )}

      {activeTab === 'uniform' && (
        <UniformTab
          branchDeptId={dept.id}
          canManage={
            isAdminOrPastor ||
            dept.leadMemberId === user?.id ||
            dept.deputyMemberId === user?.id
          }
        />
      )}

      {activeTab === 'rota' && (
        <RotaTab
          branchDeptId={dept.id}
          members={members ?? []}
          canManage={
            isAdminOrPastor ||
            dept.leadMemberId === user?.id ||
            dept.deputyMemberId === user?.id
          }
          currentUserId={user?.id}
        />
      )}

      {activeTab === 'join-requests' && isAdminOrPastor && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  No pending join requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        photoUrl={r.memberPhotoUrl}
                        firstName={r.memberFirstName}
                        lastName={r.memberLastName}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {r.memberFirstName} {r.memberLastName}
                        </p>
                        {r.notes && (
                          <p className="text-xs text-muted-foreground">{r.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewJoinRequest.mutate(
                            {
                              branchDeptId: id,
                              requestId: r.id,
                              data: { decision: 'approved' },
                            },
                            {
                              onSuccess: () => toast.success('Request approved.'),
                              onError: () => toast.error('Failed to approve.'),
                            },
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          reviewJoinRequest.mutate(
                            {
                              branchDeptId: id,
                              requestId: r.id,
                              data: { decision: 'rejected' },
                            },
                            {
                              onSuccess: () => toast.success('Request rejected.'),
                              onError: () => toast.error('Failed to reject.'),
                            },
                          )
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {otherRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {otherRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-md p-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        photoUrl={r.memberPhotoUrl}
                        firstName={r.memberFirstName}
                        lastName={r.memberLastName}
                        size="xs"
                      />
                      <span>
                        {r.memberFirstName} {r.memberLastName}
                      </span>
                    </div>
                    <span
                      className={
                        r.status === 'approved'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
