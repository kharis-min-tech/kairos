'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, UserCog, Shield, Edit, Trash2 } from 'lucide-react';
import type { Branch } from '@kairos/types';
import { useAuth } from '@/lib/auth';
import { useBranch, useUpdateBranch } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { branches as branchesApi } from '@kairos/api-client';
import { PageHeader, LoadingSkeleton } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardContent, Badge, Modal, TextInput, SelectInput } from '@/components/ui';

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const branchId = Number(params.branchId);

  // 404 for dummy or invalid param
  if (!params.branchId || params.branchId === 'dummy' || Number.isNaN(branchId) || branchId <= 0) {
    return <p className="text-center text-destructive text-lg p-12">404 – Branch not found.</p>;
  }

  const { data: branchRaw, isLoading } = useBranch(branchId);
  const branch = branchRaw as unknown as (Branch & {
    currentPastor?: { memberId: number; firstName: string; lastName: string } | null;
    elders?: Array<{ memberId: number; firstName: string; lastName: string }>;
    memberCount?: number;
    regionName?: string;
  }) | undefined;

  const { data: membersRes } = useMembers({ homeBranchId: branchId, limit: 100, isActive: true });
  const membersList = (membersRes as unknown as { data?: Array<{ memberId: number; firstName: string; lastName: string }> })?.data ?? [];

  const updateBranch = useUpdateBranch();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Branch>>({});

  const openEdit = () => {
    if (!branch) return;
    setEditData({
      branchName: branch.branchName,
      branchType: branch.branchType,
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    await updateBranch.mutateAsync({ id: branchId, data: editData });
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this branch?')) return;
    await branchesApi.delete(branchId);
    router.push('/branches');
  };

  if (isLoading) return <LoadingSkeleton variant="detail" />;
  if (!branch) return <p className="text-sm text-gray-500 p-8">Branch not found.</p>;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Branches', href: '/branches' }, { label: branch.branchName }]} />

      <PageHeader
        title={branch.branchName}
        description={`${branch.branchType} branch${branch.city ? ` · ${branch.city}` : ''}`}
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={openEdit}>
                <Edit size={16} className="mr-2" />Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 size={16} className="mr-2" />Deactivate
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{branch.memberCount ?? 0}</p>
                <p className="text-xs text-gray-500">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCog className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-semibold">
                  {branch.currentPastor
                    ? `${branch.currentPastor.firstName} ${branch.currentPastor.lastName}`
                    : 'Not assigned'}
                </p>
                <p className="text-xs text-gray-500">Senior Pastor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-semibold">{branch.elders?.length ?? 0} Elders</p>
                <p className="text-xs text-gray-500">
                  {branch.elders?.map((e) => `${e.firstName} ${e.lastName}`).join(', ') || 'None assigned'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Info */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Branch Details</h3>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium">{branch.branchType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                  {branch.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            {branch.address && (
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium">{branch.address}</dd>
              </div>
            )}
            {branch.city && (
              <div>
                <dt className="text-gray-500">City</dt>
                <dd className="font-medium">{branch.city}</dd>
              </div>
            )}
            {branch.email && (
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{branch.email}</dd>
              </div>
            )}
            {branch.phone && (
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{branch.phone}</dd>
              </div>
            )}
            {branch.regionName && (
              <div>
                <dt className="text-gray-500">Region</dt>
                <dd className="font-medium">{branch.regionName}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Members List Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members ({membersList.length})</h3>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/members?branchId=${branchId}`)}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membersList.length === 0 ? (
            <p className="text-sm text-gray-500">No active members in this branch.</p>
          ) : (
            <div className="space-y-2">
              {membersList.slice(0, 10).map((m) => (
                <div key={m.memberId} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="text-sm">{m.firstName} {m.lastName}</span>
                </div>
              ))}
              {membersList.length > 10 && (
                <p className="text-xs text-gray-400 pt-1">+{membersList.length - 10} more</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Branch">
        <div className="space-y-4">
          <TextInput
            label="Branch Name"
            value={editData.branchName ?? ''}
            onChange={(e) => setEditData({ ...editData, branchName: e.target.value })}
            required
          />
          <SelectInput
            label="Branch Type"
            value={editData.branchType ?? 'Main'}
            onChange={(e) => setEditData({ ...editData, branchType: e.target.value as Branch['branchType'] })}
            options={[
              { label: 'Main', value: 'Main' },
              { label: 'Satellite', value: 'Satellite' },
              { label: 'Cell', value: 'Cell' },
              { label: 'Campus', value: 'Campus' },
              { label: 'Online', value: 'Online' },
            ]}
          />
          <TextInput
            label="Address"
            value={(editData.address as string) ?? ''}
            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
          />
          <TextInput
            label="City"
            value={(editData.city as string) ?? ''}
            onChange={(e) => setEditData({ ...editData, city: e.target.value })}
          />
          <TextInput
            label="Phone"
            value={(editData.phone as string) ?? ''}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
          />
          <TextInput
            label="Email"
            value={(editData.email as string) ?? ''}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={updateBranch.isPending}>
            {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
