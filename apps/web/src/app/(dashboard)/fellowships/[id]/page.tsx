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
import { Button } from '@kairos/ui';
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
        <Link href="/fellowships">
          <Button variant="ghost">&larr; Back to Fellowships</Button>
        </Link>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Fellowship not found.</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/fellowships">
            <Button variant="ghost" size="sm">&larr; Back</Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            {fellowship.fellowshipName}
          </h1>
          <p className="text-muted-foreground">
            {fellowship.fellowshipType} &middot; {fellowship.branchName}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
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
              {members.map((member) => (
                <Card key={member.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {member.memberFirstName} {member.memberLastName}
                    </CardTitle>
                    <CardDescription>{member.memberEmail}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${member.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {isAdminOrPastor && member.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => {
                            if (confirm(`Remove ${member.memberFirstName} from this fellowship?`)) {
                              removeMember.mutate({ fellowshipId: id, memberId: member.memberId });
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
