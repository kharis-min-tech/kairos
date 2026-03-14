'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, UserX } from 'lucide-react';
import { Button, Badge, Card, CardBody, Spinner, Alert } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { members } from '@kairos/api-client';
import type { Member } from '@kairos/types';
import { MemberEditModal } from './member-edit-modal';

type BadgeVariant = 'active' | 'inactive' | 'pending';

function MemberDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();
  const { user } = useAuth();
  const isAdminOrPastor = user?.role === 'Admin' || user?.role === 'Pastor';

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'donations' | 'attendance'>('profile');
  const [editOpen, setEditOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const fetchMember = useCallback(async () => {
    setLoading(true);
    try {
      const data = await members.get(Number(id));
      setMember(data);
    } catch {
      setError('Failed to load member details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handleDeactivate = async () => {
    if (!member || !confirm('Are you sure you want to deactivate this member?')) return;
    setDeactivating(true);
    try {
      await members.delete(member.memberId);
      router.push('/members');
    } catch {
      setError('Failed to deactivate member.');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !member) {
    return <Alert variant="error" title="Error">{error || 'Member not found.'}</Alert>;
  }

  const statusVariant: BadgeVariant = member.isActive ? 'active' : 'inactive';
  const tabs = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'donations' as const, label: 'Donations' },
    { key: 'attendance' as const, label: 'Attendance' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/members')} aria-label="Back to members">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {member.firstName} {member.lastName}
            </h1>
            <Badge variant={statusVariant}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{member.email}</p>
        </div>
        {isAdminOrPastor && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeactivate} disabled={deactivating || !member.isActive}>
              <UserX size={16} className="mr-2" />
              Deactivate
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Member detail tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              aria-selected={activeTab === tab.key}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Personal Information</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Full Name</dt>
                  <dd className="text-sm text-gray-900">{member.firstName} {member.middleName ? `${member.middleName} ` : ''}{member.lastName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{member.email || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{member.phone || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Gender</dt>
                  <dd className="text-sm text-gray-900">{member.gender || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Date of Birth</dt>
                  <dd className="text-sm text-gray-900">
                    {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('en-GB') : '—'}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Church Information</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Home Branch</dt>
                  <dd className="text-sm text-gray-900">Branch {member.homeBranchId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Membership Date</dt>
                  <dd className="text-sm text-gray-900">
                    {member.membershipDate ? new Date(member.membershipDate).toLocaleDateString('en-GB') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd><Badge variant={statusVariant}>{member.isActive ? 'Active' : 'Inactive'}</Badge></dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Address</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Address</dt>
                  <dd className="text-sm text-gray-900">{member.address || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">City</dt>
                  <dd className="text-sm text-gray-900">{member.city || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Postal Code</dt>
                  <dd className="text-sm text-gray-900">{member.postalCode || '—'}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Emergency Contact</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{member.emergencyContactName || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{member.emergencyContactPhone || '—'}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'donations' && (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500">Donation history will be displayed here.</p>
          </CardBody>
        </Card>
      )}

      {activeTab === 'attendance' && (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500">Attendance records will be displayed here.</p>
          </CardBody>
        </Card>
      )}

      {/* Edit Modal */}
      <MemberEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        onSaved={() => {
          setEditOpen(false);
          fetchMember();
        }}
      />
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
      <MemberDetailContent />
    </Suspense>
  );
}
