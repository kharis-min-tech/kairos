'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, UserX } from 'lucide-react';
import { Button, Badge, Card, CardContent, Spinner, Alert, Modal } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMember, useDeleteMember } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import type { Member } from '@kairos/types';
import { MemberEditModal } from './member-edit-modal';
import { AttendanceTab } from './attendance-tab';
import { DonationsTab } from './donations-tab';
import { PhotoUpload } from './photo-upload';

interface DepartmentAssignment {
  departmentMemberId: number;
  departmentName: string;
  branchDepartmentId: number;
  joinDate: string;
  isActive: boolean;
}

interface FellowshipAssignment {
  fellowshipMemberId: number;
  fellowshipName: string;
  fellowshipId: number;
  joinDate: string;
  isActive: boolean;
}

export default function MemberDetailPage() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get('id') ?? '0');
  const router = useRouter();
  const { user } = useAuth();
  const isAdminOrPastor = user?.role === 'Admin' || user?.role === 'Pastor';

  const { data: member, isLoading, error, refetch } = useMember(id);
  const { data: branchesRes } = useBranches({ limit: 100 });
  const deleteMember = useDeleteMember();

  const [activeTab, setActiveTab] = useState<'profile' | 'donations' | 'attendance'>('profile');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  const branchList = branchesRes?.data ?? [];

  const handleDeactivate = async () => {
    if (!member) return;
    setDeactivateError('');
    try {
      await deleteMember.mutateAsync((member as Member).memberId);
      setConfirmDeactivate(false);
      refetch();
    } catch {
      setDeactivateError('Failed to deactivate member.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !member) {
    return <Alert variant="error" title="Error">{error?.message || 'Member not found.'}</Alert>;
  }

  const m = member as Member & { departments?: DepartmentAssignment[]; fellowships?: FellowshipAssignment[] };
  const departmentAssignments = m.departments ?? [];
  const fellowshipAssignments = m.fellowships ?? [];
  const statusVariant = m.isActive ? 'default' as const : 'secondary' as const;
  const branchName = (branchList as Array<{ branchId: number; branchName: string }>).find(
    (b) => b.branchId === m.homeBranchId
  )?.branchName ?? `Branch ${m.homeBranchId}`;
  const tabs = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'donations' as const, label: 'Donations' },
    { key: 'attendance' as const, label: 'Attendance' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/members')} aria-label="Back to members">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <PhotoUpload memberId={m.memberId} photoUrl={m.photoUrl} onUploaded={() => refetch()} />
            <h1 className="text-2xl font-semibold text-gray-900">
              {m.firstName} {m.lastName}
            </h1>
            <Badge variant={statusVariant}>{m.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{m.email}</p>
        </div>
        {isAdminOrPastor && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDeactivate(true)} disabled={deleteMember.isPending || !m.isActive}>
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
              className={`pb-3 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
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
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Personal Information</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Full Name</dt>
                  <dd className="text-sm text-gray-900">{m.firstName} {m.middleName ? `${m.middleName} ` : ''}{m.lastName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{m.email || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{m.phone || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Gender</dt>
                  <dd className="text-sm text-gray-900">{m.gender || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Date of Birth</dt>
                  <dd className="text-sm text-gray-900">
                    {m.dateOfBirth ? new Date(m.dateOfBirth).toLocaleDateString('en-GB') : '—'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Church Information</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Home Branch</dt>
                  <dd className="text-sm text-gray-900">{branchName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Membership Date</dt>
                  <dd className="text-sm text-gray-900">
                    {m.membershipDate ? new Date(m.membershipDate).toLocaleDateString('en-GB') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd><Badge variant={statusVariant}>{m.isActive ? 'Active' : 'Inactive'}</Badge></dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Address</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Address</dt>
                  <dd className="text-sm text-gray-900">{m.address || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">City</dt>
                  <dd className="text-sm text-gray-900">{m.city || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Postal Code</dt>
                  <dd className="text-sm text-gray-900">{m.postalCode || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Emergency Contact</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{m.emergencyContactName || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{m.emergencyContactPhone || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Departments</h3>
              {departmentAssignments.length > 0 ? (
                <dl className="space-y-3">
                  {departmentAssignments.map(dept => (
                    <div key={dept.departmentMemberId} className="flex justify-between">
                      <dt className="text-sm text-gray-900">{dept.departmentName}</dt>
                      <dd className="text-sm text-gray-500">
                        Joined {new Date(dept.joinDate).toLocaleDateString('en-GB')}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No departments assigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Fellowship</h3>
              {fellowshipAssignments.length > 0 ? (
                <dl className="space-y-3">
                  {fellowshipAssignments.map(fel => (
                    <div key={fel.fellowshipMemberId} className="flex justify-between">
                      <dt className="text-sm text-gray-900">{fel.fellowshipName}</dt>
                      <dd className="text-sm text-gray-500">
                        Joined {new Date(fel.joinDate).toLocaleDateString('en-GB')}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No fellowship assigned</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'donations' && <DonationsTab memberId={m.memberId} />}

      {activeTab === 'attendance' && <AttendanceTab memberId={m.memberId} />}

      {/* Edit Modal */}
      <MemberEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={m}
        onSaved={() => {
          setEditOpen(false);
          refetch();
        }}
      />

      {/* Deactivation error */}
      {deactivateError && (
        <Alert variant="error" title="Deactivation Failed">{deactivateError}</Alert>
      )}

      {/* Deactivation Confirmation Modal */}
      <Modal
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title="Confirm Deactivation"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeactivate(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeactivate} disabled={deleteMember.isPending}>
              {deleteMember.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to deactivate this member? Their data will be retained for reporting purposes.
        </p>
      </Modal>
    </div>
  );
}
