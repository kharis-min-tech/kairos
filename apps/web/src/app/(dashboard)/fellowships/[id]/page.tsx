'use client';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Tab = 'details' | 'members' | 'meetings' | 'attendance' | 'join-requests';

export default function FellowshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole, user } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
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

  // Pre-load as soon as we have a branchId so data is ready when the panel opens
  const { data: branchMembersData, isLoading: branchMembersLoading } = useMembers(
    fellowship?.branchId ? { branchId: fellowship.branchId, limit: 200 } : undefined
  );
  const branchMembers = branchMembersData?.data ?? [];

  const isMemberOfFellowship = members?.some((m) => m.memberId === user?.id);
  const hasPendingRequest = joinRequests?.some((r) => r.memberId === user?.id && r.status === 'pending');
  const showRequestToJoin = !isAdminOrPastor && !isMemberOfFellowship && !hasPendingRequest;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading fellowship...</p>
      </div>
    );
  }

  if (error || !fellowship) {
    return (
      <div className="space-y-4">
        <Link href="/fellowships" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Fellowships
        </Link>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Fellowship not found.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'members', label: `Members${members ? ` (${members.length})` : ''}` },
    { key: 'meetings', label: `Meetings${meetings ? ` (${meetings.length})` : ''}` },
    { key: 'attendance', label: 'Attendance' },
    ...(isAdminOrPastor ? [{ key: 'join-requests' as const, label: `Requests${joinRequests ? ` (${joinRequests.filter((r) => r.status === 'pending').length})` : ''}` }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link href="/fellowships" className="inline-flex items-center gap-1 text-sm text-purple-200 hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Fellowships
            </Link>
            <h1 className="mt-2 text-2xl font-bold">{fellowship.fellowshipName}</h1>
            <p className="mt-0.5 text-sm text-purple-200">
              {fellowship.fellowshipType} &middot; {fellowship.branchName}
            </p>
          </div>
          {isAdminOrPastor && (
            <div className="flex shrink-0 gap-2 pt-5">
              <Link
                href={`/fellowships/${id}/edit`}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Deactivate "${fellowship.fellowshipName}"? This cannot be undone.`)) {
                    deleteFellowship.mutate(id, {
                      onSuccess: () => {
                        toast.success('Fellowship deactivated.');
                        router.push('/fellowships');
                      },
                      onError: () => toast.error('Failed to deactivate. Please try again.'),
                    });
                  }
                }}
                disabled={deleteFellowship.isPending}
                className="rounded-md bg-rose-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
              >
                {deleteFellowship.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          )}
          {showRequestToJoin && (
            <button
              onClick={() => createJoinRequest.mutate(
                { fellowshipId: id, data: {} },
                {
                  onSuccess: () => toast.success('Request sent! An admin will review and get back to you.'),
                  onError: (error) => {
                    const msg = (error as Error).message;
                    if (msg.includes('pending join request')) {
                      toast.info('Your request has already been sent — an admin will get back to you!');
                    } else if (msg.includes('previously been removed')) {
                      toast.error('You cannot request to join at this time. Please contact an admin.');
                    } else {
                      toast.error('Something went wrong — please try again or contact your admin.');
                    }
                  },
                },
              )}
              disabled={createJoinRequest.isPending}
              className="shrink-0 self-center rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              {createJoinRequest.isPending ? 'Requesting…' : 'Request to Join'}
            </button>
          )}
          {hasPendingRequest && (
            <span className="shrink-0 self-center rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-medium text-amber-200">
              Request Pending
            </span>
          )}
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
            }`}
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
              <CardTitle>Fellowship Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p>{fellowship.fellowshipType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Branch</p>
                <p>{fellowship.branchName}</p>
              </div>
              {fellowship.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{fellowship.description}</p>
                </div>
              )}
              {fellowship.meetingSchedule && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Meeting Schedule</p>
                  <p>{fellowship.meetingSchedule}</p>
                </div>
              )}
              {(fellowship as { leaderFirstName?: string | null; leaderLastName?: string | null }).leaderFirstName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leader</p>
                  <p>{(fellowship as { leaderFirstName?: string | null; leaderLastName?: string | null }).leaderFirstName} {(fellowship as { leaderFirstName?: string | null; leaderLastName?: string | null }).leaderLastName}</p>
                </div>
              )}
              {(fellowship as { coLeaderFirstName?: string | null; coLeaderLastName?: string | null }).coLeaderFirstName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Co-Leader</p>
                  <p>{(fellowship as { coLeaderFirstName?: string | null; coLeaderLastName?: string | null }).coLeaderFirstName} {(fellowship as { coLeaderFirstName?: string | null; coLeaderLastName?: string | null }).coLeaderLastName}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  fellowship.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {fellowship.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Add Member Panel */}
          {isAdminOrPastor && (
            <div className="flex justify-end">
              <button
                onClick={() => { setShowAddMember((v) => !v); setMemberSearch(''); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </button>
            </div>
          )}

          {showAddMember && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <p className="text-sm font-medium">Search members in this branch</p>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Type a name or email..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
{(() => {
                  if (branchMembersLoading) {
                    return <p className="text-sm text-muted-foreground">Loading members…</p>;
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
                    return <p className="text-sm text-muted-foreground">All branch members are already in this fellowship.</p>;
                  }
                  if (filtered.length === 0) {
                    return <p className="text-sm text-muted-foreground">No matching members found.</p>;
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
                                onError: () => toast.error('Failed to add member. Please try again.'),
                              }
                            );
                          }}
                          disabled={addMember.isPending}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-purple-50 disabled:opacity-50"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
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
                {!isMemberOfFellowship && !isAdminOrPastor ? (
                  <p className="text-muted-foreground">Member information is only available to fellowship members.</p>
                ) : (
                  <p className="text-muted-foreground">No members in this fellowship yet.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const initials = ((member.memberFirstName?.[0] ?? '') + (member.memberLastName?.[0] ?? '')).toUpperCase() || '?';
                return (
                  <Card
                    key={member.id}
                    className={isAdminOrPastor ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
                    onClick={isAdminOrPastor ? () => router.push(`/members/${member.memberId}`) : undefined}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {member.memberFirstName} {member.memberLastName}
                        </p>
                        <span className={`text-xs font-medium ${member.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {isAdminOrPastor && member.isActive && (
                        <button
                          className="flex-shrink-0 rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${member.memberFirstName} from this fellowship?`)) {
                                removeMember.mutate(
                                  { fellowshipId: id, memberId: member.memberId },
                                  {
                                    onSuccess: () => toast.success('Member removed from system.'),
                                    onError: () => toast.error('Failed to remove member. Please try again.'),
                                  },
                                );
                            }
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
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {/* Schedule Meeting Button + Dialog */}
          {isAdminOrPastor && (
            <div className="flex justify-end">
              <button
                onClick={() => { setShowMeetingDialog((v) => !v); setMeetingForm({ meetingDate: '', meetingTitle: '', meetingTopic: '', location: '', durationMinutes: '' }); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Schedule Meeting
              </button>
            </div>
          )}

          {showMeetingDialog && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">New Meeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Date *</label>
                    <input type="date" value={meetingForm.meetingDate} onChange={(e) => setMeetingForm((f) => ({ ...f, meetingDate: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Title</label>
                    <input type="text" value={meetingForm.meetingTitle} onChange={(e) => setMeetingForm((f) => ({ ...f, meetingTitle: e.target.value }))} placeholder="e.g. Weekly meeting" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Topic</label>
                    <input type="text" value={meetingForm.meetingTopic} onChange={(e) => setMeetingForm((f) => ({ ...f, meetingTopic: e.target.value }))} placeholder="Discussion topic..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Location</label>
                    <input type="text" value={meetingForm.location} onChange={(e) => setMeetingForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Fellowship center" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Duration (mins)</label>
                    <input type="number" value={meetingForm.durationMinutes} onChange={(e) => setMeetingForm((f) => ({ ...f, durationMinutes: e.target.value }))} placeholder="60" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowMeetingDialog(false)} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
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
                          onError: () => toast.error('Failed to create meeting. Please try again.'),
                        }
                      );
                    }}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {createMeeting.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {!meetings || meetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No meetings recorded yet.</p>
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
                          {new Date(meeting.meetingDate).toLocaleDateString()}
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
                          className="rounded-md border px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50"
                        >
                          {attendanceMeetingId === meeting.id ? 'Close' : 'Record Attendance'}
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
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {(() => {
            const summary = attendanceSummary as { meetingId: string; meetingDate: string; total: number; present: number; absent: number; excused: number; late: number }[] | undefined;
            if (!summary || summary.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">No attendance data yet.</p>
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
              date: new Date(s.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
            }));

            return (
              <>
                {/* Stat Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Meetings</p>
                      <p className="mt-1 text-2xl font-bold text-purple-700">{totalMeetings}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600">{avgAttendance}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <p className="text-sm font-medium text-muted-foreground">Last Meeting Present</p>
                      <p className="mt-1 text-2xl font-bold text-amber-600">{latestPresent}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attendance Trend</CardTitle>
                    <CardDescription>Attendance rate (%) per meeting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis domain={[0, 100]} fontSize={12} tickFormatter={(v) => `${v}%`} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                          <Line type="monotone" dataKey="rate" stroke="#6D28D9" strokeWidth={2} dot={{ fill: '#6D28D9', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-Meeting Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Meeting Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.slice().reverse().map((s) => {
                      const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                      return (
                        <div key={s.meetingId}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{new Date(s.meetingDate).toLocaleDateString()}</span>
                            <span className="text-muted-foreground">{s.present}/{s.total} ({pct}%)</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {activeTab === 'join-requests' && isAdminOrPastor && (
        <div className="space-y-4">
          {selectedRequestIds.size > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm">
              <span className="text-sm font-medium">{selectedRequestIds.size} selected</span>
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
                        toast.success(`${ids.length} request${ids.length > 1 ? 's' : ''} approved.`);
                        setSelectedRequestIds(new Set());
                      })
                      .catch(() => toast.error('Some requests could not be approved. Please try again.'));
                  }}
                  disabled={reviewJoinRequest.isPending}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve selected
                </button>
                <button
                  onClick={() => {
                    const ids = Array.from(selectedRequestIds);
                    Promise.all(
                      ids.map((requestId) =>
                        reviewJoinRequest.mutateAsync({ fellowshipId: id, requestId, data: { status: 'rejected' } }),
                      ),
                    )
                      .then(() => {
                        toast.success(`${ids.length} request${ids.length > 1 ? 's' : ''} rejected.`);
                        setSelectedRequestIds(new Set());
                      })
                      .catch(() => toast.error('Some requests could not be rejected. Please try again.'));
                  }}
                  disabled={reviewJoinRequest.isPending}
                  className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Reject selected
                </button>
              </div>
            </div>
          )}

          {!joinRequests || joinRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No join requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {joinRequests.map((req) => {
                const initials = ((req.memberFirstName?.[0] ?? '') + (req.memberLastName?.[0] ?? '')).toUpperCase() || '?';
                const isSelected = selectedRequestIds.has(req.id);
                const atLimit = selectedRequestIds.size >= 5 && !isSelected;
                return (
                  <Card key={req.id}>
                    <CardContent className="flex items-center gap-3 py-4">
                      {req.status === 'pending' && (
                        <div className="relative flex-shrink-0" title={atLimit ? 'Maximum 5 at a time' : undefined}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={atLimit}
                            onChange={(e) => {
                              setSelectedRequestIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(req.id); else next.delete(req.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 cursor-pointer accent-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </div>
                      )}
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                        {initials}
                      </div>
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
                                  toast.success('Request approved — member added.');
                                  setSelectedRequestIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
                                },
                                onError: () => toast.error('Failed to approve request. Please try again.'),
                              },
                            )}
                            disabled={reviewJoinRequest.isPending}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => reviewJoinRequest.mutate(
                              { fellowshipId: id, requestId: req.id, data: { status: 'rejected' } },
                              {
                                onSuccess: () => {
                                  toast.success('Request rejected.');
                                  setSelectedRequestIds((prev) => { const n = new Set(prev); n.delete(req.id); return n; });
                                },
                                onError: () => toast.error('Failed to reject request. Please try again.'),
                              },
                            )}
                            disabled={reviewJoinRequest.isPending}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {req.status === 'approved' ? 'Approved' : 'Rejected'}
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
}) {
  const statuses = ['Present', 'Absent', 'Excused', 'Late'] as const;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Mark attendance for each member</p>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {members.map((m) => (
          <div key={m.memberId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <span className="min-w-0 truncate text-sm font-medium">{m.memberFirstName} {m.memberLastName}</span>
            <select
              value={attendanceRecords[m.memberId] ?? 'Present'}
              onChange={(e) => setAttendanceRecords((prev) => ({ ...prev, [m.memberId]: e.target.value }))}
              className="rounded-md border px-2 py-1 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {members.length === 0 && <p className="text-sm text-muted-foreground">Add members to the fellowship first.</p>}
      {members.length > 0 && (
        <div className="flex justify-end gap-2">
          <button onClick={onDone} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
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
                  onError: () => toast.error('Failed to save attendance. Please try again.'),
                }
              );
            }}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {recordAttendance.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
