'use client';

import { useState } from 'react';
import { Layers, Plus, Users, UserCog } from 'lucide-react';
import type { BranchDepartment } from '@kairos/types';
import { useAuth } from '@/lib/auth';
import { useDepartments, useCreateDepartment } from '@/hooks/use-departments';
import { useBranches } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { PageHeader, LoadingSkeleton, EmptyState, SearchBar } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardContent, Badge, Modal, TextInput, SelectInput } from '@/components/ui';

interface EnrichedDept extends BranchDepartment {
  departmentName?: string;
  leadName?: string;
  deputyName?: string;
  memberCount?: number;
}

export default function DepartmentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isPastor = user?.role === 'Pastor';
  const canCreate = isAdmin || isPastor;

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDept, setNewDept] = useState({ departmentName: '', description: '', branchId: '', leadMemberId: '' });

  const branchId = isAdmin ? undefined : user?.branchId ? Number(user.branchId) : undefined;
  const { data: deptsRes, isLoading } = useDepartments({ limit: 100, ...(branchId ? { branch_id: branchId } : {}) });
  const { data: branchesRes } = useBranches({ limit: 100 });
  const { data: membersRes } = useMembers({ limit: 200, isActive: true });

  const createDepartment = useCreateDepartment();

  const depts: EnrichedDept[] = ((deptsRes as unknown as { data?: BranchDepartment[] })?.data ?? []) as EnrichedDept[];
  const branchesList = (branchesRes as unknown as { data?: Array<{ branchId: number; branchName: string }> })?.data ?? [];
  const membersList = (membersRes as unknown as { data?: Array<{ memberId: number; firstName: string; lastName: string }> })?.data ?? [];

  const filtered = depts.filter((d) =>
    (d.departmentName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await createDepartment.mutateAsync({
      departmentName: newDept.departmentName,
      description: newDept.description || undefined,
      branchId: newDept.branchId ? Number(newDept.branchId) : undefined,
      leadMemberId: newDept.leadMemberId ? Number(newDept.leadMemberId) : undefined,
    });
    setShowCreateModal(false);
    setNewDept({ departmentName: '', description: '', branchId: '', leadMemberId: '' });
  };

  if (isLoading) return <LoadingSkeleton variant="cards" count={6} />;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Departments' }]} />

      <PageHeader
        title="Departments"
        description="Manage church departments and leadership assignments"
        actions={
          canCreate ? (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={16} className="mr-2" />Add Department
            </Button>
          ) : undefined
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search departments..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No departments found"
          description={search ? 'Try a different search term.' : 'Get started by adding a department.'}
          icon={<Layers className="h-10 w-10 text-gray-400" />}
          action={
            canCreate && !search ? (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus size={16} className="mr-2" />Add Department
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dept) => (
            <Card key={dept.branchDepartmentId} className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-primary" />
                    <h2 className="text-sm font-semibold text-gray-900">
                      {dept.departmentName || `Department #${dept.departmentId}`}
                    </h2>
                  </div>
                  <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-gray-700 flex items-center gap-1">
                    <UserCog size={12} /> Lead: {dept.leadName || `Member #${dept.leadMemberId}`}
                  </p>
                  {dept.deputyMemberId && (
                    <p className="text-xs text-gray-700 flex items-center gap-1">
                      <UserCog size={12} /> Deputy: {dept.deputyName || `Member #${dept.deputyMemberId}`}
                    </p>
                  )}
                  {typeof dept.memberCount === 'number' && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Users size={12} /> {dept.memberCount} member{dept.memberCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Department Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Department">
        <div className="space-y-4">
          <TextInput
            label="Department Name"
            value={newDept.departmentName}
            onChange={(e) => setNewDept({ ...newDept, departmentName: e.target.value })}
            required
          />
          <TextInput
            label="Description"
            value={newDept.description}
            onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
          />
          {isAdmin && (
            <SelectInput
              label="Branch"
              value={newDept.branchId}
              onChange={(e) => setNewDept({ ...newDept, branchId: e.target.value })}
              options={[
                { label: 'Select branch...', value: '' },
                ...branchesList.map((b) => ({ label: b.branchName, value: String(b.branchId) })),
              ]}
            />
          )}
          <SelectInput
            label="Lead Member"
            value={newDept.leadMemberId}
            onChange={(e) => setNewDept({ ...newDept, leadMemberId: e.target.value })}
            options={[
              { label: 'Select lead...', value: '' },
              ...membersList.map((m) => ({ label: `${m.firstName} ${m.lastName}`, value: String(m.memberId) })),
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!newDept.departmentName || createDepartment.isPending}>
            {createDepartment.isPending ? 'Creating...' : 'Create Department'}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
