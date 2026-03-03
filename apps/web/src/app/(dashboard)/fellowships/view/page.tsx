'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Calendar, MessageSquare, Plus, UserPlus, X, Send } from 'lucide-react';
import { fellowships } from '@kairos/api-client';
import type { Fellowship } from '@kairos/types';
import { Button } from '@/components/ui/button';
import { Card, CardBody, Skeleton, Badge, Modal, TextInput, Textarea } from '@/components/ui';

type Tab = 'members' | 'meetings' | 'messages';

function FellowshipDetailContent() {
  const searchParams = useSearchParams();
  const fellowshipIdParam = searchParams.get('id');
  const router = useRouter();
  const fellowshipId = fellowshipIdParam ? parseInt(fellowshipIdParam, 10) : 0;

  const [fellowship, setFellowship] = useState<Fellowship | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('members');

  useEffect(() => {
    if (fellowshipId) {
      loadFellowship();
    }
  }, [fellowshipId]);

  const loadFellowship = async () => {
    try {
      setLoading(true);
      const data = await fellowships.get(fellowshipId);
      setFellowship(data);
    } catch (err) {
      console.error('Failed to load fellowship', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!fellowship) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Fellowship not found</p>
        <Button onClick={() => router.push('/fellowships')} className="mt-4">
          Back to Fellowships
        </Button>
      </div>
    );
  }

  return (
    <section aria-label="Fellowship details">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => router.push('/fellowships')}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fellowship.fellowship_name}</h1>
            {fellowship.description && (
              <p className="text-sm text-gray-500 mt-1">{fellowship.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              {fellowship.meeting_schedule && <span>📅 {fellowship.meeting_schedule}</span>}
              {fellowship.location && <span>📍 {fellowship.location}</span>}
            </div>
          </div>
          <Badge variant={fellowship.is_active ? 'active' : 'inactive'}>
            {fellowship.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500">Members</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-gray-500">Meetings This Month</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0%</p>
              <p className="text-sm text-gray-500">Avg Attendance</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'meetings'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Meetings
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'messages'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={16} className="inline mr-2" />
            Messages
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && <MembersTab fellowshipId={fellowshipId} />}
      {activeTab === 'meetings' && <MeetingsTab fellowshipId={fellowshipId} />}
      {activeTab === 'messages' && <MessagesTab fellowshipId={fellowshipId} />}
    </section>
  );
}

export default function FellowshipDetailPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>}>
      <FellowshipDetailContent />
    </Suspense>
  );
}

function MembersTab({ fellowshipId }: { fellowshipId: number }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [fellowshipId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      // TODO: Implement fellowships.getMembers() in API client
      setMembers([]);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberId) return;
    try {
      setSubmitting(true);
      await fellowships.addMember(fellowshipId, { memberId: parseInt(memberId) });
      setShowAddModal(false);
      setMemberId('');
      loadMembers();
    } catch (err) {
      console.error('Failed to add member', err);
      alert('Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberIdToRemove: number) => {
    if (!confirm('Remove this member from the fellowship?')) return;
    try {
      await fellowships.removeMember(fellowshipId, { fellowshipId, memberId: memberIdToRemove });
      loadMembers();
    } catch (err) {
      console.error('Failed to remove member', err);
      alert('Failed to remove member');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Fellowship Members</h2>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} className="mr-2" />
          Add Member
        </Button>
      </div>

      {loading ? (
        <Card><CardBody><p className="text-center py-4">Loading...</p></CardBody></Card>
      ) : members.length === 0 ? (
        <Card><CardBody><p className="text-sm text-gray-500 text-center py-8">No members yet</p></CardBody></Card>
      ) : (
        <Card>
          <CardBody>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.member_id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleRemoveMember(member.member_id)}>
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Member">
        <div className="space-y-4">
          <TextInput
            label="Member ID"
            type="number"
            value={memberId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMemberId(e.target.value)}
            placeholder="Enter member ID"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={submitting || !memberId}>
              {submitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MeetingsTab({ fellowshipId }: { fellowshipId: number }) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_title: '',
    meeting_topic: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, [fellowshipId]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await fellowships.listMeetings(fellowshipId);
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!formData.meeting_date || !formData.meeting_title) {
      alert('Please fill in required fields');
      return;
    }
    try {
      setSubmitting(true);
      await fellowships.createMeeting(fellowshipId, {
        fellowshipId,
        meetingDate: new Date(formData.meeting_date).toISOString(),
        meetingTitle: formData.meeting_title,
        meetingTopic: formData.meeting_topic,
        location: formData.location,
      });
      setShowCreateModal(false);
      setFormData({ meeting_date: '', meeting_title: '', meeting_topic: '', location: '' });
      loadMeetings();
    } catch (err) {
      console.error('Failed to create meeting', err);
      alert('Failed to create meeting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Fellowship Meetings</h2>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          Create Meeting
        </Button>
      </div>

      {loading ? (
        <Card><CardBody><p className="text-center py-4">Loading...</p></CardBody></Card>
      ) : meetings.length === 0 ? (
        <Card><CardBody><p className="text-sm text-gray-500 text-center py-8">No meetings yet</p></CardBody></Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card key={meeting.meetingId}>
              <CardBody>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{meeting.meetingTitle}</h3>
                    <p className="text-sm text-gray-600">{meeting.meetingTopic}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(meeting.meetingDate).toLocaleDateString()} • {meeting.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{meeting.presentCount}/{meeting.totalCount}</p>
                    <p className="text-xs text-gray-500">{meeting.attendancePercentage}% present</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Meeting">
        <div className="space-y-4">
          <TextInput
            label="Meeting Date"
            type="datetime-local"
            value={formData.meeting_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meeting_date: e.target.value })}
            required
          />
          <TextInput
            label="Title"
            value={formData.meeting_title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meeting_title: e.target.value })}
            placeholder="Weekly Fellowship"
            required
          />
          <TextInput
            label="Topic"
            value={formData.meeting_topic}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meeting_topic: e.target.value })}
            placeholder="Prayer and Worship"
          />
          <TextInput
            label="Location"
            value={formData.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Church Hall"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateMeeting} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Meeting'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MessagesTab({ fellowshipId }: { fellowshipId: number }) {
  const [message, setMessage] = useState({ title: '', body: '' });
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!message.title || !message.body) {
      alert('Please fill in all fields');
      return;
    }
    try {
      setSending(true);
      await fellowships.sendMessage(fellowshipId, {
        title: message.title,
        body: message.body,
      });
      alert('Message sent successfully!');
      setMessage({ title: '', body: '' });
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Send Broadcast Message</h2>
        <p className="text-sm text-gray-500">Send a message to all fellowship members</p>
      </div>
      <Card>
        <CardBody>
          <div className="space-y-4">
            <TextInput
              label="Message Title"
              value={message.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage({ ...message, title: e.target.value })}
              placeholder="Weekly Reminder"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <Textarea
                value={message.body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage({ ...message, body: e.target.value })}
                placeholder="Enter your message here..."
                rows={6}
              />
            </div>
            <Button onClick={handleSendMessage} disabled={sending}>
              <Send size={16} className="mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
