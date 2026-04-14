'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, UserPlus, Shuffle, CheckCircle, Target, Activity } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, TextInput, DatePicker, Textarea, Modal, Badge, Alert, Spinner, Card, CardHeader, CardBody, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { outreach } from '@kairos/api-client';
import type { OutreachProgram } from '@kairos/types';

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function OutreachProgramsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isPastorOrAdmin = user?.role === 'Admin' || user?.role === 'Pastor';
  const isAdmin = user?.role === 'Admin';
  const [programs, setPrograms] = useState<OutreachProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [createForm, setCreateForm] = useState({ programName: '', programDate: '', location: '', description: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registeringProgram, setRegisteringProgram] = useState<string | null>(null);
  const [completingProgram, setCompletingProgram] = useState<string | null>(null);
  const [overrideForm, setOverrideForm] = useState({ memberId: '', newBranchId: '' });
  const [overrideErrors, setOverrideErrors] = useState<Record<string, string>>({});

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await outreach.listPrograms({ limit: '100' });
      setPrograms((res.data as OutreachProgram[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  // Stat card computations
  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => !p.isCompleted).length;
  const totalSoulsWon = programs.reduce((sum, p) => sum + (p.totalSoulsReached ?? 0), 0);

  const validateCreate = () => {
    const e: Record<string, string> = {};
    if (!createForm.programName.trim()) e.programName = 'Program name is required';
    if (!createForm.programDate) e.programDate = 'Date is required';
    if (!createForm.location.trim()) e.location = 'Location is required';
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (!validateCreate()) return;
    setSubmitting(true);
    try {
      await outreach.createProgram({
        programName: createForm.programName,
        programDate: new Date(createForm.programDate),
        location: createForm.location,
        description: createForm.description || undefined,
        branchId: user?.branchId ?? undefined,
      });
      setShowCreate(false);
      setCreateForm({ programName: '', programDate: '', location: '', description: '' });
      setSuccess('Program created successfully!');
      fetchPrograms();
    } catch {
      setError('Failed to create program.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWorker = async (programId: string) => {
    setRegisteringProgram(programId);
    setError('');
    try {
      await outreach.registerWorker(programId, { memberId: 0 });
      setSuccess('Registered as worker successfully!');
      fetchPrograms();
    } catch {
      setError('Failed to register as worker.');
    } finally {
      setRegisteringProgram(null);
    }
  };

  const handleCompleteProgram = async (programId: string) => {
    setCompletingProgram(programId);
    setError('');
    try {
      await outreach.completeProgram(programId);
      setSuccess('Program marked as completed.');
      fetchPrograms();
    } catch {
      setError('Failed to complete program.');
    } finally {
      setCompletingProgram(null);
    }
  };

  const handleOverrideBranch = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!overrideForm.memberId) e.memberId = 'Member ID is required';
    if (!overrideForm.newBranchId) e.newBranchId = 'Branch ID is required';
    setOverrideErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    try {
      await outreach.overrideBranch({
        memberId: overrideForm.memberId,
        newBranchId: overrideForm.newBranchId,
      });
      setShowOverride(false);
      setOverrideForm({ memberId: '', newBranchId: '' });
      setSuccess('Branch override applied successfully.');
    } catch {
      setError('Failed to override branch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Evangelism' }, { label: 'Outreach Programs' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outreach Programs</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowOverride(true)}>
              <Shuffle size={16} className="mr-2" /> Override Branch
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-2" /> Create Program
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Target size={20} />} label="Total Programs" value={totalPrograms} />
        <StatCard icon={<Activity size={20} />} label="Active Programs" value={activePrograms} />
        <StatCard icon={<Users size={20} />} label="Total Souls Won" value={totalSoulsWon} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : programs.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-gray-500 text-center py-8">No outreach programs yet. Create one to get started.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card
              key={program.outreachId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/evangelism/outreach/detail?id=${program.outreachId}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">{program.programName}</h3>
                  <Badge variant={program.isCompleted ? 'inactive' : 'active'}>
                    {program.isCompleted ? 'Completed' : 'Active'}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">📅 {formatDate(program.programDate)}</p>
                  <p className="text-gray-600">📍 {program.location}</p>
                  {program.description && <p className="text-gray-500">{program.description}</p>}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users size={14} /> Souls: <span className="font-medium">{program.totalSoulsReached ?? 0}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    {!program.isCompleted && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRegisterWorker(program.outreachId)}
                        disabled={registeringProgram === program.outreachId}
                      >
                        <UserPlus size={14} className="mr-1" />
                        {registeringProgram === program.outreachId ? 'Registering…' : 'Register as Worker'}
                      </Button>
                    )}
                    {!program.isCompleted && isPastorOrAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCompleteProgram(program.outreachId)}
                        disabled={completingProgram === program.outreachId}
                      >
                        <CheckCircle size={14} className="mr-1" />
                        {completingProgram === program.outreachId ? 'Completing…' : 'Complete'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Program Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Outreach Program">
        <form onSubmit={handleCreate} className="space-y-4">
          <TextInput label="Program Name" name="programName" value={createForm.programName} onChange={(e) => setCreateForm((p) => ({ ...p, programName: e.target.value }))} error={createErrors.programName} />
          <DatePicker label="Date" name="programDate" value={createForm.programDate} onChange={(e) => setCreateForm((p) => ({ ...p, programDate: e.target.value }))} error={createErrors.programDate} />
          <TextInput label="Location" name="location" value={createForm.location} onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))} error={createErrors.location} />
          <Textarea label="Description (optional)" name="description" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Override Branch Modal */}
      <Modal open={showOverride} onClose={() => setShowOverride(false)} title="Override Member Branch">
        <form onSubmit={handleOverrideBranch} className="space-y-4">
          <p className="text-sm text-gray-600">Temporarily change a member&apos;s branch for cross-branch outreach participation.</p>
          <TextInput label="Member ID" name="memberId" type="number" value={overrideForm.memberId} onChange={(e) => setOverrideForm((p) => ({ ...p, memberId: e.target.value }))} error={overrideErrors.memberId} />
          <TextInput label="New Branch ID" name="newBranchId" type="number" value={overrideForm.newBranchId} onChange={(e) => setOverrideForm((p) => ({ ...p, newBranchId: e.target.value }))} error={overrideErrors.newBranchId} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setShowOverride(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Applying…' : 'Apply Override'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
