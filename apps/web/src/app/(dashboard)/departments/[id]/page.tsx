'use client';

export const runtime = 'edge';

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
  useRespondToDepartmentOffer,
  useWithdrawDepartmentJoinRequest,
} from '@/hooks/use-departments';
import { useMembers } from '@/hooks/use-members';
import { useCapabilities } from '@/hooks/use-capabilities';
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
import { RecruitmentTab } from './_components/recruitment-tab';
import { MyRotaTab } from './_components/my-rota-tab';
import { DepartmentAttendanceTab } from './_components/attendance-tab';
import { useConfirm } from '@/components/confirm-dialog';
import { NbStageChip } from '@/components/nb-stage-chip';

type Tab = 'overview' | 'my-rota' | 'members' | 'attendance' | 'followups' | 'uniform' | 'rota' | 'recruitment';

const OPEN_STATUSES = [
  'applied',
  'interview_scheduled',
  'interviewed',
  'offered',
  'probation',
] as const;

const STAGE_LABELS: Record<string, string> = {
  applied: 'Application received',
  interview_scheduled: 'Interview scheduled',
  interviewed: 'Interview complete',
  offered: 'Offer pending your response',
  probation: 'On probation',
};

function DepartmentDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <div className="mb-2 h-4 w-32 animate-pulse rounded bg-muted/40" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted/60" />
        <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-muted/40" />
      </div>
      <div className="flex gap-2 border-b border-border/40 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-20 animate-pulse rounded bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
            <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RestrictedNotice({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="mb-3 h-10 w-10 text-muted-foreground/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <p className="font-medium">{message}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Join this department to view this information.
        </p>
      </CardContent>
    </Card>
  );
}

export default function DepartmentDetailPage() {
  const caps = useCapabilities();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdminOrPastor = caps.has('branch:write');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<string>('');

  const { data: dept, isLoading, error } = useDepartment(id);
  const { data: members } = useDepartmentMembers(id);
  const { data: joinRequests } = useDepartmentJoinRequests(id);
  const addMember = useAddDepartmentMember();
  const removeMember = useRemoveDepartmentMember();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const createJoinRequest = useCreateDepartmentJoinRequest();
  const respondOffer = useRespondToDepartmentOffer();
  const withdrawRequest = useWithdrawDepartmentJoinRequest();

  const { data: branchMembersData } = useMembers(
    dept?.branchId ? { branchId: dept.branchId, limit: 200 } : undefined,
  );
  const branchMembers = branchMembersData?.data ?? [];

  const isMemberOfDept = members?.some((m) => m.memberId === user?.id);
  const myOpenRequest = joinRequests?.find(
    (r) => r.memberId === user?.id && (OPEN_STATUSES as readonly string[]).includes(r.status),
  );
  const showRequestToJoin = !isAdminOrPastor && !isMemberOfDept && !myOpenRequest;
  const isRestrictedView = !isAdminOrPastor && !isMemberOfDept;

  if (isLoading) {
    return <DepartmentDetailSkeleton />;
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
        <div role="alert" className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Department not found.'}
          </p>
        </div>
      </div>
    );
  }

  const canSeeAttendanceTab =
    isAdminOrPastor || dept?.leadMemberId === user?.id || dept?.deputyMemberId === user?.id;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    ...(isMemberOfDept ? [{ key: 'my-rota' as const, label: 'My Rota' }] : []),
    ...(!isRestrictedView
      ? ([
          { key: 'members' as const, label: `Members${members ? ` (${members.length})` : ''}` },
          { key: 'followups' as const, label: 'Followups' },
          { key: 'uniform' as const, label: 'Uniform' },
          { key: 'rota' as const, label: 'Rota' },
        ] as const)
      : []),
    ...(canSeeAttendanceTab ? [{ key: 'attendance' as const, label: 'Attendance' }] : []),
    ...(isAdminOrPastor
      ? [
          {
            key: 'recruitment' as const,
            label: `Recruitment${
              joinRequests
                ? ` (${joinRequests.filter((r) => (OPEN_STATUSES as readonly string[]).includes(r.status)).length})`
                : ''
            }`,
          },
        ]
      : []),
  ];

  const canManageRecruitment =
    isAdminOrPastor ||
    dept?.leadMemberId === user?.id ||
    dept?.deputyMemberId === user?.id;

  return (
    <div className="space-y-6">
      {confirmDialog}
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
          {hasMyOpenRequestPill(myOpenRequest) && (
            <span className="inline-flex items-center rounded-full bg-[#f8b537]/20 px-3 py-1 text-xs font-medium text-[#7a5a00] dark:text-[#f8b537]">
              {STAGE_LABELS[myOpenRequest!.status] ?? myOpenRequest!.status}
            </span>
          )}
          {myOpenRequest?.status === 'offered' && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  respondOffer.mutate(
                    {
                      branchDeptId: id,
                      requestId: myOpenRequest.id,
                      data: { offerResponse: 'accepted' },
                    },
                    {
                      onSuccess: () => toast.success('Offer accepted. Probation started.'),
                      onError: (e: unknown) =>
                        toast.error(
                          e instanceof Error ? e.message : 'Failed to accept offer.',
                        ),
                    },
                  )
                }
                disabled={respondOffer.isPending}
              >
                Accept Offer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  respondOffer.mutate(
                    {
                      branchDeptId: id,
                      requestId: myOpenRequest.id,
                      data: { offerResponse: 'declined' },
                    },
                    {
                      onSuccess: () => toast.success('Offer declined.'),
                      onError: () => toast.error('Failed to decline offer.'),
                    },
                  )
                }
                disabled={respondOffer.isPending}
              >
                Decline
              </Button>
            </>
          )}
          {myOpenRequest &&
            ['applied', 'interview_scheduled', 'interviewed'].includes(myOpenRequest.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  withdrawRequest.mutate(
                    { branchDeptId: id, requestId: myOpenRequest.id },
                    {
                      onSuccess: () => toast.success('Request withdrawn.'),
                      onError: () => toast.error('Failed to withdraw.'),
                    },
                  )
                }
                disabled={withdrawRequest.isPending}
              >
                Withdraw
              </Button>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Department sections" className="flex flex-wrap gap-1 border-b border-border/40">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            id={`tab-${tab.key}`}
            aria-controls={`tabpanel-${tab.key}`}
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
        isRestrictedView ? (
          <RestrictedNotice message="Members list is private" />
        ) : (
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
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              Joined {m.joinDate}
                            </p>
                            {m.nbStage && <NbStageChip stage={m.nbStage} />}
                          </div>
                        </div>
                      </div>
                      {isAdminOrPastor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Remove ${m.memberFirstName} ${m.memberLastName}?`,
                              description: `They will no longer appear in ${dept.departmentName}. You can re-add them later.`,
                              confirmLabel: 'Remove',
                              variant: 'destructive',
                            });
                            if (!ok) return;
                            removeMember.mutate(
                              { branchDeptId: id, memberId: m.memberId },
                              {
                                onSuccess: () => toast.success('Member removed.'),
                                onError: () => toast.error('Failed to remove member.'),
                              },
                            );
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
        )
      )}

      {activeTab === 'followups' && (
        isRestrictedView ? (
          <RestrictedNotice message="Follow-up notes are private" />
        ) : (
          <FollowupsTab
            branchDeptId={dept.id}
            members={members ?? []}
            canManage={
              isAdminOrPastor ||
              dept.leadMemberId === user?.id ||
              dept.deputyMemberId === user?.id
            }
          />
        )
      )}

      {activeTab === 'uniform' && (
        isRestrictedView ? (
          <RestrictedNotice message="Uniform schedule is private" />
        ) : (
          <UniformTab
            branchDeptId={dept.id}
            canManage={
              isAdminOrPastor ||
              dept.leadMemberId === user?.id ||
              dept.deputyMemberId === user?.id
            }
          />
        )
      )}

      {activeTab === 'my-rota' && isMemberOfDept && (
        <MyRotaTab branchDepartmentId={dept.id} />
      )}

      {activeTab === 'attendance' && canSeeAttendanceTab && (
        <DepartmentAttendanceTab branchDepartmentId={dept.id} />
      )}

      {activeTab === 'rota' && (
        isRestrictedView ? (
          <RestrictedNotice message="Rota details are private" />
        ) : (
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
        )
      )}

      {activeTab === 'recruitment' && isAdminOrPastor && (
        <RecruitmentTab
          branchDeptId={id}
          defaultProbationDays={dept.probationDays ?? 28}
          branchMembers={branchMembers}
          joinRequests={joinRequests ?? []}
          canManage={canManageRecruitment}
        />
      )}
    </div>
  );
}

function hasMyOpenRequestPill(
  req: { status: string } | undefined,
): req is { status: string } {
  return Boolean(req);
}
