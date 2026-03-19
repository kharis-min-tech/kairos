'use client';

import { useEffect, useState } from 'react';
import { UsersRound, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fellowships, branches, members } from '@kairos/api-client';
import type { Fellowship, Branch, Member } from '@kairos/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody, Skeleton, Badge, Modal } from '@/components/ui';
import { TextInput, Textarea } from '@/components/ui/form-input';
import { useAuth } from '@/lib/auth/auth-context';

const FELLOWSHIP_TYPES = [
  'K-Groups',
  'Kharis Express',
  'New Breeds',
  'Kharis on Campus',
  'Kharis on Campus Colleges',
] as const;

export default function FellowshipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<Fellowship[]>([]);
  const [filteredData, setFilteredData] = useState<Fellowship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [branchOptions, setBranchOptions] = useState<Branch[]>([]);
  const [memberOptions, setMemberOptions] = useState<Member[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fellowship_name: '',
    fellowship_type: 'K-Groups' as typeof FELLOWSHIP_TYPES[number],
    branch_id: '',
    leader_id: '',
    description: '',
    meeting_schedule: '',
    location: '',
  });

  useEffect(() => {
    loadFellowships();
  }, []);

  // Load branches and members when the modal opens
  useEffect(() => {
    if (!showCreateModal) return;
    let cancelled = false;
    (async () => {
      setLoadingOptions(true);
      try {
        const [branchRes, memberRes] = await Promise.all([
          branches.list({ limit: 100, isActive: true }),
          members.list({ limit: 200, status: 'active' }),
        ]);
        if (cancelled) return;
        setBranchOptions(branchRes.data as unknown as Branch[]);
        setMemberOptions(memberRes.data as unknown as Member[]);
        // Pre-select the user's own branch if no branch selected
        if (!formData.branch_id && user?.branchId) {
          const myBranch = (branchRes.data as unknown as Branch[]).find(
            (b) => String(b.branchId) === String(user.branchId)
          );
          if (myBranch) {
            setFormData((prev) => ({ ...prev, branch_id: String(myBranch.branchId) }));
          }
        }
      } catch (err) {
        console.error('Failed to load branch/member options', err);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showCreateModal]);

  useEffect(() => {
    // Filter data based on search term
    if (searchTerm) {
      const filtered = data.filter((f) =>
        f.fellowshipName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchTerm, data]);

  const loadFellowships = async () => {
    try {
      setLoading(true);
      const res = await fellowships.list({ limit: 100 });
      setData(res.data);
      setFilteredData(res.data);
    } catch (err) {
      setError('Failed to load fellowships');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const branchId = formData.branch_id
      ? parseInt(formData.branch_id, 10)
      : user?.branchId
        ? parseInt(user.branchId, 10)
        : undefined;

    if (!branchId) {
      alert('Please select a branch.');
      return;
    }

    const payload = {
      fellowship_name: formData.fellowship_name,
      fellowship_type: formData.fellowship_type,
      branch_id: branchId,
      leader_id: formData.leader_id ? parseInt(formData.leader_id, 10) : undefined,
      description: formData.description || undefined,
      meeting_schedule: formData.meeting_schedule || undefined,
      location: formData.location || undefined,
    };

    console.log('Creating fellowship with payload:', payload);

    setCreating(true);
    try {
      const result = await fellowships.create(payload);
      console.log('Fellowship created successfully:', result);
      setShowCreateModal(false);
      setFormData({
        fellowship_name: '',
        fellowship_type: 'K-Groups',
        branch_id: '',
        leader_id: '',
        description: '',
        meeting_schedule: '',
        location: '',
      });
      loadFellowships();
    } catch (err: any) {
      console.error('Failed to create fellowship:', err);
      console.error('Error details:', {
        message: err?.message,
        status: err?.status,
        code: err?.code,
        body: err?.body,
      });
      const errorMessage = err?.body?.message || err?.message || 'Failed to create fellowship';
      alert(`Error: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <section aria-label="Fellowship management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fellowships</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fellowship groups and membership</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          Add Fellowship
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search fellowships..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredData.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full text-center py-12">
              {searchTerm ? 'No fellowships match your search.' : 'No fellowships found.'}
            </p>
          ) : (
            filteredData.map((f) => (
              <Card
                key={f.fellowshipId}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/fellowships/view?id=${f.fellowshipId}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersRound size={18} className="text-primary" />
                      <h2 className="text-sm font-semibold text-gray-900">{f.fellowshipName}</h2>
                    </div>
                    <Badge variant={f.isActive ? 'active' : 'inactive'}>
                      {f.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  {f.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{f.description}</p>
                  )}
                  {f.meetingSchedule && (
                    <p className="text-xs text-gray-500 mt-1">📅 {f.meetingSchedule}</p>
                  )}
                  {f.location && (
                    <p className="text-xs text-gray-500 mt-1">📍 {f.location}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                    <span>Members</span>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add Fellowship Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Fellowship"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <TextInput
            label="Fellowship Name"
            required
            value={formData.fellowship_name}
            onChange={(e) => setFormData({ ...formData, fellowship_name: e.target.value })}
            placeholder="e.g., Victory K-Group"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fellowship Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.fellowship_type}
              onChange={(e) => setFormData({ ...formData, fellowship_type: e.target.value as typeof FELLOWSHIP_TYPES[number] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {FELLOWSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the fellowship"
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              disabled={loadingOptions}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">{loadingOptions ? 'Loading...' : 'Select branch...'}</option>
              {branchOptions.map((b) => (
                <option key={b.branchId} value={String(b.branchId)}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leader
            </label>
            <select
              value={formData.leader_id}
              onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
              disabled={loadingOptions}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">{loadingOptions ? 'Loading...' : 'Select leader (optional)...'}</option>
              {memberOptions.map((m) => (
                <option key={m.memberId} value={String(m.memberId)}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <TextInput
            label="Meeting Schedule"
            value={formData.meeting_schedule}
            onChange={(e) => setFormData({ ...formData, meeting_schedule: e.target.value })}
            placeholder="e.g., Every Tuesday 7:00 PM"
          />

          <TextInput
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Community Hall A"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating || loadingOptions}>
              {creating ? 'Creating...' : 'Create Fellowship'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
