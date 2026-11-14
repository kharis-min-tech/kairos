'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  useFellowship,
  useFellowshipMembers,
  useFellowshipMeetings,
  useRemoveFellowshipMember,
  useAddFellowshipMember,
  useDeleteFellowship,
  useAttendanceSummary,
  useCreateMeeting,
  useRecordAttendance,
  useFellowshipJoinRequests,
  useCreateJoinRequest,
  useReviewJoinRequest,
} from '@/hooks/use-fellowships';
import { useMembers } from '@/hooks/use-members';
import { useCapabilities } from '@/hooks/use-capabilities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Checkbox, CustomSelect, NumberStepper } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { useAuthStore } from '@/lib/auth-store';
import { MemberAvatar } from '@/components/member-avatar';
import { FellowshipFollowupsTab } from './_components/followups-tab';
import { CombinedAttendanceSummary } from './_components/combined-attendance-summary';
import { formatDate, formatShortDate } from '@kairos/core';
import { useConfirm } from '@/components/confirm-dialog';
import { NbStageChip } from '@/components/nb-stage-chip';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';

type Tab = 'details' | 'members' | 'meetings' | 'attendance' | 'followups' | 'join-requests';

function FellowshipDetailSkeleton() {
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

export default function FellowshipDetailPage() {  const { t } = useTranslation(['fellowships', 'common']);

  const caps = useCapabilities();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdminOrPastor = caps.has('branch:write');
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ meetingDate: '', meetingTitle: '', meetingTopic: '', location: '', durationMinutes: '' });
  const [attendanceMeetingId, setAttendanceMeetingId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());

  const { data: fellowship, isLoading, error } = useFellowship(id);
  const { data: members } = useFellowshipMembers(id);
  const { data: meetings } = useFellowshipMeetings(id);
  const { data: attendanceSummary } = useAttendanceSummary(id);
  const removeMember = useRemoveFellowshipMember();
  const addMember = useAddFellowshipMember();
  const deleteFellowship = useDeleteFellowship();
  const createMeeting = useCreateMeeting();
  const recordAttendance = useRecordAttendance();
  const { data: joinRequests } = useFellowshipJoinRequests(id);
  const createJoinRequest = useCreateJoinRequest();
  const reviewJoinRequest = useReviewJoinRequest();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Pre-load as soon as we have a branchId so data is ready when the panel opens
  const { data: branchMembersData, isLoading: branchMembersLoading } = useMembers(
    fellowship?.branchId ? { branchId: fellowship.branchId, limit: 200 } : undefined
  );
  const branchMembers = branchMembersData?.data ?? [];

  const isMemberOfFellowship = members?.some((m) => m.memberId === user?.id);
  const hasPendingRequest = joinRequests?.some((r) => r.memberId === user?.id && r.status === 'pending');
  const showRequestToJoin = !isAdminOrPastor && !isMemberOfFellowship && !hasPendingRequest;
  // Non-admin/pastor users who are not members of this fellowship can only see basic details
  const isRestrictedView = !isAdminOrPastor && !isMemberOfFellowship;

  if (isLoading) {
    return <FellowshipDetailSkeleton />;
  }

  if (error || !fellowship) {
    return (
      <div className="space-y-4">
        <Link href="/fellowships" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>{t('fellowships:backToFellowships')}</Link>
        <div role="alert" className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Fellowship not found.'}
          </p>
        </div>
      </div>
    );
  }

  const canManageFollowups =
    isAdminOrPastor || fellowship.leaderId === user?.id || fellowship.coLeaderId === user?.id;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: t('fellowships:details') },
    ...(!isRestrictedView ? [
      { key: 'members' as const, label: `Members${members ? ` (${members.length})` : ''}` },
    ] : []),
    ...(canManageFollowups ? [{ key: 'followups' as const, label: t('fellowships:followups') }] : []),
    ...(!isRestrictedView ? [
      { key: 'meetings' as const, label: `Meetings${meetings ? ` (${meetings.length})` : ''}` },
      { key: 'attendance' as const, label: t('fellowships:attendance') },
    ] : []),
    ...(isAdminOrPastor ? [{ key: 'join-requests' as const, label: `Requests${joinRequests ? ` (${joinRequests.filter((r) => r.status === 'pending').length})` : ''}` }] : []),
  ];

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div className="min-w-0 flex-1">
          <Link href="/fellowships" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>{t('fellowships:backToFellowships')}</Link>
          <h1 className="text-2xl font-bold tracking-tight">{fellowship.fellowshipName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fellowship.fellowshipType} &middot; {fellowship.branchName}
          </p>
        </div>
        {isAdminOrPastor && (
          <div className="flex shrink-0 gap-2">
            <Link href={`/fellowships/${id}/edit`}>
              <Button variant="outline" size="sm">{t('fellowships:edit')}</Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: t('fellowships:deactivateV1', { v1: fellowship.fellowshipName }),
                  description: t('fellowships:theFellowshipWillBeHiddenFrom'),
                  confirmLabel: t('fellowships:deactivate'),
                  variant: 'destructive',
                });
                if (!ok) return;
                deleteFellowship.mutate(id, {
                  onSuccess: () => {
                    toast.success(t('fellowships:fellowshipDeactivated'));
                    router.push('/fellowships');
                  },
                  onError: () => toast.error(t('fellowships:failedDeactivateTryAgain')),
                });
              }}
              disabled={deleteFellowship.isPending}
            >
              {deleteFellowship.isPending ? t('fellowships:deactivating') : t('fellowships:deactivate')}
            </Button>
          </div>
        )}
        {showRequestToJoin && (
          <Button
            size="sm"
            onClick={() => createJoinRequest.mutate(
              { fellowshipId: id, data: {} },
              {
                onSuccess: () => toast.success(t('fellowships:requestSentAdminReviewGetBack')),
                onError: (error) => {
                  const msg = (error as Error).message;
                  if (msg.includes('pending join request')) {
                    toast.info(t('fellowships:yourRequestAlreadyBeenSentAdmin'));
                  } else if (msg.includes('previously been removed')) {
                    toast.error(t('fellowships:youCannotRequestJoinTimeContact'));
                  } else {
                    toast.error(t('fellowships:somethingWentWrongTryAgainContact'));
                  }
                },
              },
            )}
            disabled={createJoinRequest.isPending}
          >
            {createJoinRequest.isPending ? t('fellowships:requesting') : t('fellowships:requestJoin')}
          </Button>
        )}
        {hasPendingRequest && (
          <span className="shrink-0 self-center rounded-full bg-[#f8b537]/15 px-3 py-1.5 text-xs font-medium text-[#9a6b04] dark:text-[#f8b537]">{t('fellowships:requestPending')}</span>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t('fellowships:fellowshipSections')} className="flex flex-wrap gap-1 border-b border-border/40">
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

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('fellowships:fellowshipInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fellowships:type')}</p>
                <p>{fellowship.fellowshipType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fellowships:branch')}</p>
                <p>{fellowship.branchName}</p>
              </div>
              {fellowship.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fellowships:description')}</p>
                  <p>{fellowship.description}</p>
                </div>
              )}
              {fellowship.meetingSchedule && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fellowships:meetingSchedule')}</p>
                  <p>{fellowship.meetingSchedule}</p>
                </div>
              )}
              {(fellowship as { leaderFirstName?: string | null; leaderLastName?: string | null }).leaderFirstName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fellowships:leader')}</p>
                  <p>{(fellowship as { leaderFirstName?: string | null; leaderLastName?: string | null }).leaderFirstName} {(fellowship as { leaderFirstName?: string | null; leaderLastName?: string | null }).leaderLastName}</p>
                </div>
              )}
              {(fellowship as { coLeaderFirstName?: string | null; coLeaderLastName?: string | null }).coLeaderFirstName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fellowships:coLeader')}</p>
                  <p>{(fellowship as { coLeaderFirstName?: string | null; coLeaderLastName?: string | null }).coLeaderFirstName} {(fellowship as { coLeaderFirstName?: string | null; coLeaderLastName?: string | null }).coLeaderLastName}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fellowships:status')}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  fellowship.isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  {fellowship.isActive ? t('fellowships:active') : t('fellowships:inactive')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          {isRestrictedView ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="font-medium">{t('fellowships:membersListIsPrivate')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('fellowships:joinThisFellowshipToViewIts')}</p>
              </CardContent>
            </Card>
          ) : (<>
          {/* Add Member Panel */}
          {isAdminOrPastor && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => { setShowAddMember((v) => !v); setMemberSearch(''); }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>{t('fellowships:addMember')}</Button>
            </div>
          )}

          {showAddMember && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <p className="text-sm font-medium">{t('fellowships:searchMembersInThisBranch')}</p>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={t('fellowships:typeANameOrEmail')}
                  className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                />
{(() => {
                  if (branchMembersLoading) {
                    return <p className="text-sm text-muted-foreground">{t('fellowships:loadingMembers')}</p>;
                  }
                  const currentMemberIds = new Set(members?.map((m) => m.memberId) ?? []);
                  const available = branchMembers.filter((m) => !currentMemberIds.has(m.id));
                  const filtered = memberSearch.length > 0
                    ? available.filter((m) =>
                        `${m.firstName} ${m.lastName} ${m.email ?? ''}`
                          .toLowerCase()
                          .includes(memberSearch.toLowerCase())
                      )
                    : available;
                  if (available.length === 0) {
                    return <p className="text-sm text-muted-foreground">{t('fellowships:allBranchMembersAreAlreadyIn')}</p>;
                  }
                  if (filtered.length === 0) {
                    return <p className="text-sm text-muted-foreground">{t('fellowships:noMatchingMembersFound')}</p>;
                  }
                  return (
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {filtered.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            addMember.mutate(
                              { fellowshipId: id, data: { memberId: m.id } },
                              {
                                onSuccess: () => { setShowAddMember(false); setMemberSearch(''); },
                                onError: () => toast.error(t('fellowships:failedAddMemberTryAgain')),
                              }
                            );
                          }}
                          disabled={addMember.isPending}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted disabled:opacity-50">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/15 text-xs font-bold text-[#5D3FD3] dark:text-[#a392ed]">
                            {((m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {!members || members.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">{t('fellowships:noMembersInThisFellowshipYet')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                return (
                  <Card
                    key={member.id}
                    className={isAdminOrPastor ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
                    onClick={isAdminOrPastor ? () => router.push(`/members/${member.memberId}`) : undefined}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <MemberAvatar
                        photoUrl={member.memberPhotoUrl}
                        firstName={member.memberFirstName}
                        lastName={member.memberLastName}
                        size="sm"
                        variant="light"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {member.memberFirstName} {member.memberLastName}
                        </p>
                        {member.nbStage && (
                          <div className="mt-0.5">
                            <NbStageChip stage={member.nbStage} />
                          </div>
                        )}
                      </div>
                      {isAdminOrPastor && member.isActive && (
                        <button
                          aria-label={t('fellowships:removeV1V2Fellowship', { v1: member.memberFirstName, v2: member.memberLastName })}
                          className="flex-shrink-0 rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({
                              title: t('fellowships:removeV1Fellowship', { v1: member.memberFirstName }),
                              description: t('fellowships:theyWillNoLongerAppearIn'),
                              confirmLabel: t('fellowships:remove'),
                              variant: 'destructive',
                            });
                            if (!ok) return;
                            removeMember.mutate(
                              { fellowshipId: id, memberId: member.memberId },
                              {
                                onSuccess: () => toast.success(t('fellowships:memberRemovedFellowship')),
                                onError: () => toast.error(t('fellowships:failedRemoveMemberTryAgain')),
                              },
                            );
                          }}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </>)}
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {isRestrictedView ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="font-medium">{t('fellowships:meetingsArePrivate')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('fellowships:joinThisFellowshipToViewMeeting')}</p>
              </CardContent>
            </Card>
          ) : (<>
          {/* Schedule Meeting Button + Dialog */}
          {isAdminOrPastor && (
            <div className="flex justify-end">
              <button
                onClick={() => { setShowMeetingDialog((v) => !v); setMeetingForm({ meetingDate: '', meetingTitle: '', meetingTopic: '', location: '', durationMinutes: '' }); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>{t('fellowships:scheduleMeeting')}</button>
            </div>
          )}

          {showMeetingDialog && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('fellowships:newMeeting')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('fellowships:date')}</label>
                    <DateSelect value={meetingForm.meetingDate} onChange={(v) => setMeetingForm((f) => ({ ...f, meetingDate: v }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('fellowships:title')}</label>
                    <input type="text" value={meetingForm.meetingTitle} onChange={(e) => setMeetingForm((f) => ({ ...f, meetingTitle: e.target.value }))} placeholder={t('fellowships:eGWeeklyMeeting')} className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('fellowships:topic')}</label>
                    <input type="text" value={meetingForm.meetingTopic} onChange={(e) => setMeetingForm((f) => ({ ...f, meetingTopic: e.target.value }))} placeholder={t('fellowships:discussionTopic')} className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('fellowships:location')}</label>
                    <input type="text" value={meetingForm.location} onChange={(e) => setMeetingForm((f) => ({ ...f, location: e.target.value }))} placeholder={t('fellowships:eGSouthwarkCommunityCentre')} className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('fellowships:durationMins')}</label>
                    <NumberStepper
                      value={Number(meetingForm.durationMinutes) || 0}
                      onValueChange={(v) => setMeetingForm((f) => ({ ...f, durationMinutes: v ? String(v) : '' }))}
                      min={0}
                      max={600}
                      step={5}
                      suffix="m"
                      ariaLabel={t('fellowships:meetingDurationMinutes')}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowMeetingDialog(false)} className="rounded-lg border border-input/15 px-3 py-1.5 text-sm">{t('fellowships:cancel')}</button>
                  <button
                    disabled={!meetingForm.meetingDate || createMeeting.isPending}
                    onClick={() => {
                      createMeeting.mutate(
                        {
                          fellowshipId: id,
                          data: {
                            meetingDate: meetingForm.meetingDate,
                            meetingTitle: meetingForm.meetingTitle || undefined,
                            meetingTopic: meetingForm.meetingTopic || undefined,
                            location: meetingForm.location || undefined,
                            durationMinutes: meetingForm.durationMinutes ? Number(meetingForm.durationMinutes) : undefined,
                          },
                        },
                        {
                          onSuccess: () => setShowMeetingDialog(false),
                          onError: () => toast.error(t('fellowships:failedCreateMeetingTryAgain')),
                        }
                      );
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {createMeeting.isPending ? t('fellowships:creating') : t('fellowships:create')}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {!meetings || meetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">{t('fellowships:noMeetingsRecordedYet')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {meeting.meetingTitle || 'Meeting'}
                        </CardTitle>
                        <CardDescription>
                          {formatShortDate(meeting.meetingDate)}
                          {meeting.location && ` · ${meeting.location}`}
                          {meeting.durationMinutes && ` · ${meeting.durationMinutes} min`}
                        </CardDescription>
                      </div>
                      {isAdminOrPastor && (
                        <button
                          onClick={() => {
                            if (attendanceMeetingId === meeting.id) {
                              setAttendanceMeetingId(null);
                            } else {
                              setAttendanceMeetingId(meeting.id);
                              const records: Record<string, string> = {};
                              members?.forEach((m) => { records[m.memberId] = 'Present'; });
                              setAttendanceRecords(records);
                            }
                          }}
                          className="rounded-lg border border-input/15 px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
                        >
                          {attendanceMeetingId === meeting.id ? t('fellowships:close') : t('fellowships:recordAttendance')}
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  {meeting.meetingTopic && (
                    <CardContent className="pt-0 pb-2">
                      <p className="text-sm text-muted-foreground">
                        Topic: {meeting.meetingTopic}
                      </p>
                    </CardContent>
                  )}
                  {attendanceMeetingId === meeting.id && (
                    <CardContent className="border-t pt-3">
                      <AttendanceForm
                        fellowshipId={id}
                        meetingId={meeting.id}
                        members={members ?? []}
                        attendanceRecords={attendanceRecords}
                        setAttendanceRecords={setAttendanceRecords}
                        recordAttendance={recordAttendance}
                        onDone={() => setAttendanceMeetingId(null)}
                      />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
          </>)}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {!isRestrictedView && <CombinedAttendanceSummary fellowshipId={id} />}
          {isRestrictedView ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="font-medium">{t('fellowships:attendanceDataIsPrivate')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('fellowships:joinThisFellowshipToViewAttendance')}</p>
              </CardContent>
            </Card>
          ) : (<>{(() => {
            const summary = attendanceSummary as { meetingId: string; meetingDate: string; total: number; present: number; absent: number; excused: number; late: number }[] | undefined;
            if (!summary || summary.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">{t('fellowships:noAttendanceDataYet')}</p>
                  </CardContent>
                </Card>
              );
            }

            const totalMeetings = summary.length;
            const avgAttendance = totalMeetings > 0
              ? Math.round(summary.reduce((acc, s) => acc + (s.total > 0 ? (s.present / s.total) * 100 : 0), 0) / totalMeetings)
              : 0;
            const latestPresent = summary[summary.length - 1]?.present ?? 0;

            const chartData = summary.map((s) => ({
              date: formatDate(s.meetingDate, { month: 'short', day: 'numeric' }),
              rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
            }));

            return (
              <>
                {/* Stat Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm font-medium text-muted-foreground">{t('fellowships:totalMeetings')}</p>
                      <p className="mt-1 text-2xl font-bold text-[#5D3FD3] dark:text-[#a392ed]">{totalMeetings}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm font-medium text-muted-foreground">{t('fellowships:avgAttendance')}</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600">{avgAttendance}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm font-medium text-muted-foreground">{t('fellowships:lastMeetingPresent')}</p>
                      <p className="mt-1 text-2xl font-bold text-[#a07720] dark:text-[#f8b537]">{latestPresent}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('fellowships:attendanceTrend')}</CardTitle>
                    <CardDescription>{t('fellowships:attendanceRatePerMeeting')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis domain={[0, 100]} fontSize={12} tickFormatter={(v) => `${v}%`} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                          <Line type="monotone" dataKey="rate" stroke="#5D3FD3" strokeWidth={2} dot={{ fill: '#5D3FD3', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-Meeting Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('fellowships:meetingBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.slice().reverse().map((s) => {
                      const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                      return (
                        <div key={s.meetingId}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{formatShortDate(s.meetingDate)}</span>
                            <span className="text-muted-foreground">{s.present}/{s.total} ({pct}%)</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            );
          })()}</>
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <FellowshipFollowupsTab
          fellowshipId={id}
          members={members ?? []}
          canManage={canManageFollowups}
        />
      )}

      {activeTab === 'join-requests' && isAdminOrPastor && (
        <div className="space-y-4">
          {selectedRequestIds.size > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-card px-4 py-2.5 shadow-ambient">
              <span className="text-sm font-medium">{t('common:selectedCount', { count: selectedRequestIds.size })}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const ids = Array.from(selectedRequestIds);
                    Promise.all(
                      ids.map((requestId) =>
                        reviewJoinRequest.mutateAsync({ fellowshipId: id, requestId, data: { status: 'approved' } }),
                      ),
                    )
                      .then(() => {
                        toast.success(t('fellowships:requestsApproved', { count: ids.length }));
                        setSelectedRequestIds(new Set());
                      })
                      .catch(() => toast.error(t('fellowships:someRequestsCouldApprovedTryAgain')));
                  }}
                  disabled={reviewJoinRequest.isPending}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >{t('fellowships:approveSelected')}</button>
                <button
                  onClick={() => {
                    const ids = Array.from(selectedRequestIds);
                    Promise.all(
                      ids.map((requestId) =>
                        reviewJoinRequest.mutateAsync({ fellowshipId: id, requestId, data: { status: 'rejected' } }),
                      ),
                    )
                      .then(() => {
                        toast.success(t('fellowships:requestsRejected', { count: ids.length }));
                        setSelectedRequestIds(new Set());
                      })
                      .catch(() => toast.error(t('fellowships:someRequestsCouldRejectedTryAgain')));
                  }}
                  disabled={reviewJoinRequest.isPending}
                  className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >{t('fellowships:rejectSelected')}</button>
              </div>
            </div>
          )}

          {!joinRequests || joinRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">{t('fellowships:noJoinRequests')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {joinRequests.map((req) => {
                const isSelected = selectedRequestIds.has(req.id);
                const atLimit = selectedRequestIds.size >= 5 && !isSelected;
                return (
                  <Card key={req.id}>
                    <CardContent className="flex items-center gap-3 py-4">
                      {req.status === 'pending' && (
                        <div className="relative flex-shrink-0" title={atLimit ? 'Maximum 5 at a time' : undefined}>
                          <Checkbox
                            checked={isSelected}
                            disabled={atLimit}
                            onChange={(e) => {
                              setSelectedRequestIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(req.id); else next.delete(req.id);
                                return next;
                              });
                            }}
                          />
                        </div>
                      )}
                      <MemberAvatar
                        photoUrl={req.memberPhotoUrl}
                        firstName={req.memberFirstName}
                        lastName={req.memberLastName}
                        size="sm"
                        variant="light"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{req.memberFirstName} {req.memberLastName}</p>
                        {req.notes && <p className="mt-1 text-xs text-muted-foreground">Note: {req.notes}</p>}
                      </div>
                      {req.status === 'pending' ? (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => reviewJoinRequest.mutate(
                              { fellowshipId: id, requestId: req.id, data: { status: 'approved' } },
                              {
                                onSuccess: () => {
                                  toast.success(t('fellowships:requestApprovedMemberAdded'));
                                  setSelectedRequestIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
                                },
                                onError: () => toast.error(t('fellowships:failedApproveRequestTryAgain')),
                              },
                            )}
                            disabled={reviewJoinRequest.isPending}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >{t('fellowships:approve')}</button>
                          <button
                            onClick={() => reviewJoinRequest.mutate(
                              { fellowshipId: id, requestId: req.id, data: { status: 'rejected' } },
                              {
                                onSuccess: () => {
                                  toast.success(t('fellowships:requestRejected'));
                                  setSelectedRequestIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
                                },
                                onError: () => toast.error(t('fellowships:failedRejectRequestTryAgain')),
                              },
                            )}
                            disabled={reviewJoinRequest.isPending}
                            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                          >{t('fellowships:reject')}</button>
                        </div>
                      ) : (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}>
                          {req.status === 'approved' ? t('fellowships:approved') : t('fellowships:rejected')}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline Attendance Form ─────────────────────────────────

function AttendanceForm({
  fellowshipId,
  meetingId,
  members,
  attendanceRecords,
  setAttendanceRecords,
  recordAttendance,
  onDone,
}: {
  fellowshipId: string;
  meetingId: string;
  members: { memberId: string; memberFirstName: string; memberLastName: string }[];
  attendanceRecords: Record<string, string>;
  setAttendanceRecords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  recordAttendance: ReturnType<typeof useRecordAttendance>;
  onDone: () => void;
}) {  const { t } = useTranslation(['fellowships', 'common']);

  const statuses = ['Present', 'Absent', 'Excused', 'Late'] as const;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t('fellowships:markAttendanceForEachMember')}</p>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {members.map((m) => (
          <div key={m.memberId} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
            <span className="min-w-0 truncate text-sm font-medium">{m.memberFirstName} {m.memberLastName}</span>
            <CustomSelect
              size="sm"
              value={attendanceRecords[m.memberId] ?? 'Present'}
              onValueChange={(v) => setAttendanceRecords((prev) => ({ ...prev, [m.memberId]: v }))}
              options={statuses.map((s) => ({ value: s, label: s }))}
            />
          </div>
        ))}
      </div>
      {members.length === 0 && <p className="text-sm text-muted-foreground">{t('fellowships:addMembersToTheFellowshipFirst')}</p>}
      {members.length > 0 && (
        <div className="flex justify-end gap-2">
          <button onClick={onDone} className="rounded-lg border border-input/15 px-3 py-1.5 text-sm">{t('fellowships:cancel')}</button>
          <button
            disabled={recordAttendance.isPending}
            onClick={() => {
              recordAttendance.mutate(
                {
                  fellowshipId,
                  meetingId,
                  data: {
                    records: Object.entries(attendanceRecords).map(([memberId, status]) => ({
                      memberId,
                      attendanceStatus: status as 'Present' | 'Absent' | 'Excused' | 'Late',
                    })),
                  },
                },
                {
                  onSuccess: onDone,
                  onError: () => toast.error(t('fellowships:failedSaveAttendanceTryAgain')),
                }
              );
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {recordAttendance.isPending ? t('fellowships:savingEllipsis') : t('fellowships:saveAttendance')}
          </button>
        </div>
      )}
    </div>
  );
}
