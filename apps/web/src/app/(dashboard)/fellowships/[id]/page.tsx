'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useFellowship,
  useFellowshipMembers,
  useFellowshipMeetings,
  useRemoveFellowshipMember,
  useAddFellowshipMember,
  useDeleteFellowship,
  useAttendanceSummary,
} from '@/hooks/use-fellowships';
import { useMembers } from '@/hooks/use-members';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Tab = 'details' | 'members' | 'meetings' | 'attendance';

export default function FellowshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const isAdminOrPastor = activeRole === 'admin' || activeRole === 'pastor';
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const { data: fellowship, isLoading, error } = useFellowship(id);
  const { data: members } = useFellowshipMembers(id);
  const { data: meetings } = useFellowshipMeetings(id);
  const { data: attendanceSummary } = useAttendanceSummary(id);
  const removeMember = useRemoveFellowshipMember();
  const addMember = useAddFellowshipMember();
  const deleteFellowship = useDeleteFellowship();

  // Pre-load as soon as we have a branchId so data is ready when the panel opens
  const { data: branchMembersData, isLoading: branchMembersLoading } = useMembers(
    fellowship?.branchId ? { branchId: fellowship.branchId, limit: 200 } : undefined
  );
  const branchMembers = branchMembersData?.data ?? [];

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
                      onSuccess: () => router.push('/fellowships'),
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
                : 'border border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-purple-600'
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
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-800"
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
                              { onSuccess: () => { setShowAddMember(false); setMemberSearch(''); } }
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
                <p className="text-muted-foreground">No members in this fellowship yet.</p>
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
                        <p className="truncate text-sm text-muted-foreground">{member.memberEmail}</p>
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
                              removeMember.mutate({ fellowshipId: id, memberId: member.memberId });
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
                    <CardTitle className="text-base">
                      {meeting.meetingTitle || 'Meeting'}
                    </CardTitle>
                    <CardDescription>
                      {new Date(meeting.meetingDate).toLocaleDateString()}
                      {meeting.location && ` · ${meeting.location}`}
                      {meeting.durationMinutes && ` · ${meeting.durationMinutes} min`}
                    </CardDescription>
                  </CardHeader>
                  {meeting.meetingTopic && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Topic: {meeting.meetingTopic}
                      </p>
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
    </div>
  );
}
