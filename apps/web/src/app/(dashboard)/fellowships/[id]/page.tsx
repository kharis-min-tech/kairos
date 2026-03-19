'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useFellowship,
  useFellowshipMembers,
  useFellowshipMeetings,
  useRemoveFellowshipMember,
} from '@/hooks/use-fellowships';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';

type Tab = 'details' | 'members' | 'meetings';

export default function FellowshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isAdminOrPastor = user?.systemRole === 'admin' || user?.systemRole === 'pastor';
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const { data: fellowship, isLoading, error } = useFellowship(id);
  const { data: members } = useFellowshipMembers(id);
  const { data: meetings } = useFellowshipMeetings(id);
  const removeMember = useRemoveFellowshipMember();

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
  ];

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
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
                  <Card key={member.id}>
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
                          onClick={() => {
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
    </div>
  );
}
