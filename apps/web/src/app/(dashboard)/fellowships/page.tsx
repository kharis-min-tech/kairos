'use client';

import { useEffect, useState } from 'react';
import { UsersRound, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fellowships } from '@kairos/api-client';
import type { Fellowship } from '@kairos/types';
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

  // Form state
  const [formData, setFormData] = useState({
    fellowship_name: '',
    fellowship_type: 'K-Groups' as typeof FELLOWSHIP_TYPES[number],
    description: '',
    meeting_schedule: '',
    location: '',
  });

  useEffect(() => {
    loadFellowships();
  }, []);

  useEffect(() => {
    // Filter data based on search term
    if (searchTerm) {
      const filtered = data.filter((f) =>
        f.fellowship_name.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    if (!user?.branchId) {
      alert('Unable to determine your branch. Please contact support.');
      return;
    }

    const payload = {
      fellowship_name: formData.fellowship_name,
      fellowship_type: formData.fellowship_type,
      branch_id: parseInt(user.branchId, 10),
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
                key={f.fellowship_id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/fellowships/${f.fellowship_id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersRound size={18} className="text-primary" />
                      <h2 className="text-sm font-semibold text-gray-900">{f.fellowship_name}</h2>
                    </div>
                    <Badge variant={f.is_active ? 'active' : 'inactive'}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  {f.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{f.description}</p>
                  )}
                  {f.meeting_schedule && (
                    <p className="text-xs text-gray-500 mt-1">📅 {f.meeting_schedule}</p>
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

      {/* Create Fellowship Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Fellowship"
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

          <TextInput
            label="Meeting Schedule"
            value={formData.meeting_schedule}
            onChange={(e) => setFormData({ ...formData, meeting_schedule: e.target.value })}
            placeholder="e.g., Wednesdays 7:00 PM"
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
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Fellowship'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
