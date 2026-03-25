'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Badge, TextInput, SelectInput, DatePicker, Textarea, Alert } from '@/components/ui';
import { souls } from '@kairos/api-client';
import type { Soul, FollowUp, ContactMethod, ContactStatus } from '@kairos/types';
import { ConversionMemberForm } from './conversion-member-form';

const CONTACT_METHODS = [
  { value: 'Phone Call', label: 'Phone Call' },
  { value: 'Home Visit', label: 'Home Visit' },
  { value: 'Text Message', label: 'Text Message' },
  { value: 'Email', label: 'Email' },
  { value: 'In-Person Meeting', label: 'In-Person Meeting' },
];

const CONTACT_STATUSES = [
  { value: 'Successful', label: 'Successful' },
  { value: 'No Answer', label: 'No Answer' },
  { value: 'Call Back Later', label: 'Call Back Later' },
  { value: 'Not Interested', label: 'Not Interested' },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  'New': ['Following Up', 'Not Interested'],
  'Following Up': ['Interested', 'Not Interested', 'Lost Contact'],
  'Interested': ['Converted', 'Not Interested', 'Following Up'],
  'Converted': [],
  'Not Interested': [],
  'Lost Contact': ['Following Up'],
};

const STATUS_BADGE: Record<string, 'active' | 'pending' | 'inactive' | 'error'> = {
  'New': 'pending',
  'Following Up': 'pending',
  'Interested': 'active',
  'Converted': 'active',
  'Not Interested': 'error',
  'Lost Contact': 'inactive',
};

const todayStr = () => new Date().toISOString().slice(0, 10);

interface SoulDetailModalProps {
  soul: Soul;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function SoulDetailModal({ soul, open, onClose, onUpdate }: SoulDetailModalProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpForm, setFollowUpForm] = useState<{
    contactDate: string;
    contactTime: string;
    contactMethod: ContactMethod;
    contactStatus: ContactStatus;
    notes: string;
  }>({
    contactDate: todayStr(),
    contactTime: '',
    contactMethod: 'Phone Call',
    contactStatus: 'Successful',
    notes: '',
  });
  const [followUpErrors, setFollowUpErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showConversionForm, setShowConversionForm] = useState(false);

  useEffect(() => {
    if (open && soul.soulId) {
      souls.get(soul.soulId).then((res: { followUps: FollowUp[] }) => {
        setFollowUps(res.followUps || []);
      }).catch(() => {});
    }
  }, [open, soul.soulId]);

  const validateFollowUp = () => {
    const e: Record<string, string> = {};
    if (!followUpForm.contactDate) e.contactDate = 'Date is required';
    if (!followUpForm.contactMethod) e.contactMethod = 'Method is required';
    if (!followUpForm.contactStatus) e.contactStatus = 'Status is required';
    setFollowUpErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateFollowUp()) return;

    setSubmitting(true);
    try {
      await souls.addFollowup(soul.soulId, {
        soulId: soul.soulId,
        followUpDate: new Date(followUpForm.contactDate),
        contactMethod: followUpForm.contactMethod,
        contactStatus: followUpForm.contactStatus,
        notes: followUpForm.notes || undefined,
      });
      setShowFollowUpForm(false);
      setFollowUpForm({
        contactDate: todayStr(),
        contactTime: '',
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
        notes: '',
      });
      // Refresh follow-ups
      const res = await souls.get(soul.soulId);
      setFollowUps(res.followUps || []);
      onUpdate();
    } catch (err) {
      console.error('Failed to log follow-up:', err);
      setError('Failed to log follow-up. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === 'Converted') {
      setShowConversionForm(true);
      return;
    }
    setError('');
    setStatusUpdating(true);
    try {
      await souls.updateStatus(soul.soulId, { status: newStatus });
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConversionSuccess = async () => {
    setShowConversionForm(false);
    onUpdate();
    onClose();
  };

  // Normalize status and get valid transitions
  const currentStatus = soul.status?.trim() || 'New';
  const nextStatuses = VALID_TRANSITIONS[currentStatus] || [];

  // Helper for capture date - try different possible property names
  const captureDate = (soul as any).captureDate || (soul as any).capture_date || (soul as any).createdAt || (soul as any).created_at;

  return (
    <Modal open={open} onClose={onClose} title={`${soul.firstName} ${soul.lastName}`} maxWidth="lg">
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="space-y-4">
        {/* Soul Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{soul.phone}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-medium">{soul.email || '—'}</span></div>
          <div><span className="text-gray-500">Address:</span> <span className="font-medium">{soul.address || '—'}</span></div>
          <div><span className="text-gray-500">Status:</span> <Badge variant={STATUS_BADGE[currentStatus] || 'pending'}>{currentStatus}</Badge></div>
          <div><span className="text-gray-500">Captured:</span> <span className="font-medium">{captureDate ? new Date(captureDate).toLocaleDateString('en-GB') : '—'}</span></div>
          {soul.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{soul.notes}</span></div>}
        </div>

        {/* Status Update */}
        {nextStatuses.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">Update status:</span>
            {nextStatuses.map((s) => (
              <Button key={s} size="sm" variant="secondary" disabled={statusUpdating} onClick={() => handleStatusUpdate(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}

        {/* Follow-up History */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Follow-up History</h3>
            <Button size="sm" onClick={() => setShowFollowUpForm(!showFollowUpForm)}>
              {showFollowUpForm ? 'Cancel' : '+ Log Follow-up'}
            </Button>
          </div>

          {showFollowUpForm && (
            <form onSubmit={handleLogFollowUp} className="mb-4 space-y-3 rounded-lg border border-gray-200 p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <DatePicker label="Date *" name="contactDate" value={followUpForm.contactDate} onChange={(e) => setFollowUpForm((p) => ({ ...p, contactDate: e.target.value }))} error={followUpErrors.contactDate} />
                <TextInput label="Time" name="contactTime" type="time" value={followUpForm.contactTime} onChange={(e) => setFollowUpForm((p) => ({ ...p, contactTime: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SelectInput label="Method *" name="contactMethod" options={CONTACT_METHODS} value={followUpForm.contactMethod} onChange={(e) => setFollowUpForm((p) => ({ ...p, contactMethod: e.target.value as ContactMethod }))} error={followUpErrors.contactMethod} />
                <SelectInput label="Status *" name="contactStatus" options={CONTACT_STATUSES} value={followUpForm.contactStatus} onChange={(e) => setFollowUpForm((p) => ({ ...p, contactStatus: e.target.value as ContactStatus }))} error={followUpErrors.contactStatus} />
              </div>
              <Textarea label="Notes" name="notes" value={followUpForm.notes} onChange={(e) => setFollowUpForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? 'Saving...' : 'Save Follow-up'}</Button>
            </form>
          )}

          {followUps.length === 0 ? (
            <p className="text-sm text-gray-500">No follow-ups recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {followUps.map((fu) => (
                <div key={fu.followUpId} className="rounded border border-gray-100 bg-white p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{fu.contactMethod}</span>
                    <span className="text-xs text-gray-500">{new Date(fu.followUpDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <Badge variant={fu.contactStatus === 'Successful' ? 'active' : fu.contactStatus === 'Not Interested' ? 'error' : 'pending'} className="mt-1">
                    {fu.contactStatus}
                  </Badge>
                  {fu.notes && <p className="mt-1 text-xs text-gray-600">{fu.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConversionForm && (
        <ConversionMemberForm
          soul={soul}
          open={showConversionForm}
          onClose={() => setShowConversionForm(false)}
          onSuccess={handleConversionSuccess}
        />
      )}
    </Modal>
  );
}