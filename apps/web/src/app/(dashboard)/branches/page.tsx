'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, Mail, Phone, MapPin } from 'lucide-react';
import type { Branch, BranchType } from '@kairos/types';
import { useAuth } from '@/lib/auth';
import { useBranches, useCreateBranch } from '@/hooks/use-branches';
import { PageHeader, LoadingSkeleton, EmptyState, SearchBar } from '@/components/shared';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardContent, Badge, Modal, TextInput, SelectInput } from '@/components/ui';

export default function BranchesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ branchName: '', branchType: 'Main' as BranchType, address: '', city: '', phone: '', email: '' });

  const { data: branchesRes, isLoading } = useBranches({ limit: 100 });
  const createBranch = useCreateBranch();

  const branches = (branchesRes as unknown as { data?: Branch[] })?.data ?? [];
  const filtered = branches.filter((b) =>
    b.branchName.toLowerCase().includes(search.toLowerCase()) ||
    b.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await createBranch.mutateAsync(newBranch);
    setShowCreateModal(false);
    setNewBranch({ branchName: '', branchType: 'Main' as BranchType, address: '', city: '', phone: '', email: '' });
  };

  if (isLoading) return <LoadingSkeleton variant="cards" count={6} />;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Branches' }]} />

      <PageHeader
        title="Branches"
        description="Manage church branches and locations"
        actions={
          isAdmin ? (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={16} className="mr-2" />Add Branch
            </Button>
          ) : undefined
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search branches..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No branches found"
          description={search ? 'Try a different search term.' : 'Get started by adding your first branch.'}
          icon={<Building2 className="h-10 w-10 text-gray-400" />}
          action={
            isAdmin && !search ? (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus size={16} className="mr-2" />Add Branch
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((branch) => (
            <Link key={branch.branchId} href={`/branches/${branch.branchId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} className="text-primary" />
                      <h2 className="text-sm font-semibold text-gray-900">{branch.branchName}</h2>
                    </div>
                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Building2 size={12} /> {branch.branchType}
                    </p>
                    {branch.address && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={12} /> {branch.address}{branch.city ? `, ${branch.city}` : ''}
                      </p>
                    )}
                    {branch.email && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail size={12} /> {branch.email}
                      </p>
                    )}
                    {branch.phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={12} /> {branch.phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Branch Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Branch">
        <div className="space-y-4">
          <TextInput
            label="Branch Name"
            value={newBranch.branchName}
            onChange={(e) => setNewBranch({ ...newBranch, branchName: e.target.value })}
            required
          />
          <SelectInput
            label="Branch Type"
            value={newBranch.branchType}
            onChange={(e) => setNewBranch({ ...newBranch, branchType: e.target.value as BranchType })}
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
            value={newBranch.address}
            onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
          />
          <TextInput
            label="City"
            value={newBranch.city}
            onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
          />
          <TextInput
            label="Phone"
            value={newBranch.phone}
            onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
          />
          <TextInput
            label="Email"
            value={newBranch.email}
            onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!newBranch.branchName || createBranch.isPending}>
            {createBranch.isPending ? 'Creating...' : 'Create Branch'}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
