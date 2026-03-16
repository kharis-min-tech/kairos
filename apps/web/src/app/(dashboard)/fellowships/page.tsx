'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UsersRound, Plus, Calendar, User } from 'lucide-react';
import type { Fellowship } from '@kairos/types';
import { useAuth } from '@/lib/auth';
import { useFellowships, useCreateFellowship } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { PageHeader, LoadingSkeleton, EmptyState, SearchBar } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardContent, Badge, Modal, TextInput, SelectInput, Textarea } from '@/components/ui';

interface EnrichedFellowship extends Fellowship {
  leaderName?: string;
  coLeaderName?: string;
  memberCount?: number;
}

export default function FellowshipsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isPastor = user?.role === 'Pastor';
  const canCreate = isAdmin || isPastor;

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFellowship, setNewFellowship] = useState({
    fellowshipName: '',
    description: '',
    branchId: '',
    leaderId: '',
    meetingSchedule: '',
  });

  const branchId = isAdmin ? undefined : user?.branchId ? Number(user.branchId) : undefined;
  const { data: fellowshipsRes, isLoading } = useFellowships({ limit: 100, ...(branchId ? { branch_id: branchId } : {}) });
  const { data: branchesRes } = useBranches({ limit: 100 });
  const { data: membersRes } = useMembers({ limit: 200, isActive: true });

  const createFellowship = useCreateFellowship();

  const fellowships: EnrichedFellowship[] = ((fellowshipsRes as unknown as { data?: Fellowship[] })?.data ?? []) as EnrichedFellowship[];
  const branchesList = (branchesRes as unknown as { data?: Array<{ branchId: number; branchName: string }> })?.data ?? [];
  const membersList = (membersRes as unknown as { data?: Array<{ memberId: number; firstName: string; lastName: string }> })?.data ?? [];

  const filtered = fellowships.filter((f) =>
    f.fellowshipName.toLowerCase().includes(search.toLowerCase()) ||
    (f.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await createFellowship.mutateAsync({
      fellowshipName: newFellowship.fellowshipName,
      description: newFellowship.description || undefined,
      branchId: newFellowship.branchId ? Number(newFellowship.branchId) : (branchId ?? 0),
      leaderId: newFellowship.leaderId ? Number(newFellowship.leaderId) : undefined,
      meetingSchedule: newFellowship.meetingSchedule || undefined,
    });
    setShowCreateModal(false);
    setNewFellowship({ fellowshipName: '', description: '', branchId: '', leaderId: '', meetingSchedule: '' });
  };

  if (isLoading) return <LoadingSkeleton variant="cards" count={6} />;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Fellowships' }]} />

      <PageHeader
        title="Fellowships"
        description="Manage fellowship groups and membership"
        actions={
          canCreate ? (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={16} className="mr-2" />Add Fellowship
            </Button>
          ) : undefined
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search fellowships..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No fellowships found"
          description={search ? 'Try a different search term.' : 'Get started by creating a fellowship group.'}
          icon={<UsersRound className="h-10 w-10 text-gray-400" />}
          action={
            canCreate && !search ? (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus size={16} className="mr-2" />Add Fellowship
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <Link key={f.fellowshipId} href={`/fellowships/${f.fellowshipId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersRound size={18} className="text-primary" />
                      <h2 className="text-sm font-semibold text-gray-900">{f.fellowshipName}</h2>
                    </div>
                    <Badge variant={f.isActive ? 'default' : 'secondary'}>
                      {f.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {f.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{f.description}</p>
                    )}
                    {f.leaderName && (
                      <p className="text-xs text-gray-700 flex items-center gap-1">
                        <User size={12} /> Leader: {f.leaderName}
                      </p>
                    )}
                    {f.meetingSchedule && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} /> {f.meetingSchedule}
                      </p>
                    )}
                    {typeof f.memberCount === 'number' && (
                      <p className="text-xs text-gray-500">{f.memberCount} member{f.memberCount !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Fellowship Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Fellowship">
        <div className="space-y-4">
          <TextInput
            label="Fellowship Name"
            value={newFellowship.fellowshipName}
            onChange={(e) => setNewFellowship({ ...newFellowship, fellowshipName: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={newFellowship.description}
            onChange={(e) => setNewFellowship({ ...newFellowship, description: e.target.value })}
          />
          {isAdmin && (
            <SelectInput
              label="Branch"
              value={newFellowship.branchId}
              onChange={(e) => setNewFellowship({ ...newFellowship, branchId: e.target.value })}
              options={[
                { label: 'Select branch...', value: '' },
                ...branchesList.map((b) => ({ label: b.branchName, value: String(b.branchId) })),
              ]}
            />
          )}
          <SelectInput
            label="Leader"
            value={newFellowship.leaderId}
            onChange={(e) => setNewFellowship({ ...newFellowship, leaderId: e.target.value })}
            options={[
              { label: 'Select leader...', value: '' },
              ...membersList.map((m) => ({ label: `${m.firstName} ${m.lastName}`, value: String(m.memberId) })),
            ]}
          />
          <TextInput
            label="Meeting Schedule"
            value={newFellowship.meetingSchedule}
            onChange={(e) => setNewFellowship({ ...newFellowship, meetingSchedule: e.target.value })}
            placeholder="e.g., Every Saturday 4 PM"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!newFellowship.fellowshipName || createFellowship.isPending}>
            {createFellowship.isPending ? 'Creating...' : 'Create Fellowship'}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
