'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { UserPlus, Send, Calendar, User, Users } from 'lucide-react';
import type { Fellowship } from '@kairos/types';
import { useAuth } from '@/lib/auth';
import { useFellowship, useAddFellowshipMember, useSendFellowshipMessage } from '@/hooks/use-fellowships';
import { useMembers } from '@/hooks/use-members';
import { PageHeader, LoadingSkeleton } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardContent, Badge, Modal, SelectInput, TextInput, Textarea } from '@/components/ui';


export default function FellowshipDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const fellowshipId = Number(params.fellowshipId);

  // 404 for dummy or invalid param
  if (!params.fellowshipId || params.fellowshipId === 'dummy' || Number.isNaN(fellowshipId) || fellowshipId <= 0) {
    return <p className="text-center text-destructive text-lg p-12">404 – Fellowship not found.</p>;
  }

  const { data: fellowshipRaw, isLoading } = useFellowship(fellowshipId);
  const fellowship = fellowshipRaw as unknown as (Fellowship & {
    leaderName?: string;
    coLeaderName?: string;
    memberCount?: number;
    members?: Array<{ memberId: number; firstName: string; lastName: string; email?: string }>;
  }) | undefined;

  const { data: membersRes } = useMembers({ limit: 200, isActive: true });
  const allMembers = (membersRes as unknown as { data?: Array<{ memberId: number; firstName: string; lastName: string }> })?.data ?? [];

  const addMember = useAddFellowshipMember();
  const sendMessage = useSendFellowshipMessage();

  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: '', body: '' });

  const handleAddMember = async () => {
    if (!selectedMemberId) return;
    await addMember.mutateAsync({ fellowshipId, memberId: Number(selectedMemberId) });
    setShowAddMember(false);
    setSelectedMemberId('');
  };

  const handleSendMessage = async () => {
    if (!messageData.title || !messageData.body) return;
    await sendMessage.mutateAsync({ fellowshipId, data: messageData });
    setShowSendMessage(false);
    setMessageData({ title: '', body: '' });
  };

  if (isLoading) return <LoadingSkeleton variant="detail" />;
  if (!fellowship) return <p className="text-sm text-gray-500 p-8">Fellowship not found.</p>;

  const isLeader = fellowship.leaderId === Number(user?.sub) || fellowship.coLeaderId === Number(user?.sub);
  const canManage = isAdmin || isLeader;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Fellowships', href: '/fellowships' }, { label: fellowship.fellowshipName }]} />

      <PageHeader
        title={fellowship.fellowshipName}
        description={fellowship.description}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddMember(true)}>
                <UserPlus size={16} className="mr-2" />Add Member
              </Button>
              <Button onClick={() => setShowSendMessage(true)}>
                <Send size={16} className="mr-2" />Send Message
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Quick Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{fellowship.members?.length ?? fellowship.memberCount ?? 0}</p>
                <p className="text-xs text-gray-500">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-semibold">{fellowship.leaderName ?? 'Not assigned'}</p>
                <p className="text-xs text-gray-500">Leader</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-semibold">{fellowship.meetingSchedule ?? 'Not set'}</p>
                <p className="text-xs text-gray-500">Meeting Schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fellowship Info */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Details</h3>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <Badge variant={fellowship.isActive ? 'default' : 'secondary'}>
                  {fellowship.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            {fellowship.coLeaderName && (
              <div>
                <dt className="text-gray-500">Co-Leader</dt>
                <dd className="font-medium">{fellowship.coLeaderName}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members</h3>
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => setShowAddMember(true)}>
                <UserPlus size={14} className="mr-1" />Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!fellowship.members || fellowship.members.length === 0) ? (
            <p className="text-sm text-gray-500">No members in this fellowship yet.</p>
          ) : (
            <div className="space-y-2">
              {fellowship.members.map((m) => (
                <div key={m.memberId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                    {m.email && <p className="text-xs text-gray-500">{m.email}</p>}
                  </div>
                  {(m.memberId === fellowship.leaderId) && (
                    <Badge variant="default">Leader</Badge>
                  )}
                  {(m.memberId === fellowship.coLeaderId) && (
                    <Badge variant="outline">Co-Leader</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Modal */}
      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member to Fellowship">
        <div className="space-y-4">
          <SelectInput
            label="Select Member"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            options={[
              { label: 'Choose a member...', value: '' },
              ...allMembers.map((m) => ({ label: `${m.firstName} ${m.lastName}`, value: String(m.memberId) })),
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
          <Button onClick={handleAddMember} disabled={!selectedMemberId || addMember.isPending}>
            {addMember.isPending ? 'Adding...' : 'Add Member'}
          </Button>
        </div>
      </Modal>

      {/* Send Message Modal */}
      <Modal open={showSendMessage} onClose={() => setShowSendMessage(false)} title="Send Message to Fellowship">
        <div className="space-y-4">
          <TextInput
            label="Subject"
            value={messageData.title}
            onChange={(e) => setMessageData({ ...messageData, title: e.target.value })}
            required
          />
          <Textarea
            label="Message"
            value={messageData.body}
            onChange={(e) => setMessageData({ ...messageData, body: e.target.value })}
            required
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowSendMessage(false)}>Cancel</Button>
          <Button onClick={handleSendMessage} disabled={!messageData.title || !messageData.body || sendMessage.isPending}>
            {sendMessage.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
