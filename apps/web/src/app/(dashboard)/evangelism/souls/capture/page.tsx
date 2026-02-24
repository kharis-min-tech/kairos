'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button, TextInput, SelectInput, Textarea, Alert } from '@/components/ui';
import { souls, outreach } from '@kairos/api-client';

const sourceOptions = [
  { value: 'ad-hoc', label: 'Ad-hoc Evangelism' },
  { value: 'outreach', label: 'Outreach Program' },
];

const genderOptions = [
  { value: '', label: 'Select gender...' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const ageGroupOptions = [
  { value: '', label: 'Select age group...' },
  { value: 'Under 18', label: 'Under 18' },
  { value: '18-25', label: '18-25' },
  { value: '26-35', label: '26-35' },
  { value: '36-45', label: '36-45' },
  { value: '46-60', label: '46-60' },
  { value: 'Over 60', label: 'Over 60' },
];

const initialForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  gender: '',
  ageGroup: '',
  notes: '',
  source: 'ad-hoc',
  outreachId: '',
};

export default function SoulCapturePage() {
  const [form, setForm] = useState(initialForm);
  const [programs, setPrograms] = useState<Array<{ value: string; label: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    outreach.listPrograms({ limit: 100 }).then((res: { data: Array<{ outreach_id: number; program_name: string }> }) => {
      const items = (res.data || []).map((p: { outreach_id: number; program_name: string }) => ({
        value: String(p.outreach_id),
        label: p.program_name,
      }));
      setPrograms(items);
    }).catch(() => {});
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (form.source === 'outreach' && !form.outreachId) e.outreachId = 'Select an outreach program';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setApiError('');
    setDuplicateWarning('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await souls.create({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        gender: form.gender || undefined,
        age_range: form.ageGroup || undefined,
        notes: form.notes || undefined,
        outreach_id: form.source === 'outreach' ? Number(form.outreachId) : undefined,
      } as Parameters<typeof souls.create>[0]);

      // Check for duplicate phone warning in API response
      const response = result as unknown as Record<string, unknown>;
      if (response.warning && typeof response.warning === 'string') {
        setDuplicateWarning(response.warning);
      }

      setSuccess(true);
      setForm({ ...initialForm });
    } catch {
      setApiError('Failed to capture soul. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <>
      <Breadcrumbs items={[
        { label: 'Evangelism', href: '/evangelism/souls' },
        { label: 'Capture Soul' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900">Capture Soul</h1>
      <p className="mt-1 text-sm text-gray-600">Record a new soul reached during evangelism.</p>

      {success && !duplicateWarning && <Alert variant="success" title="Soul captured successfully!" className="mt-4" onDismiss={() => setSuccess(false)} />}
      {success && duplicateWarning && (
        <Alert variant="warning" title="Soul captured with warning" className="mt-4" onDismiss={() => { setSuccess(false); setDuplicateWarning(''); }}>
          <p className="text-sm">Soul was captured successfully, but a duplicate phone number was detected:</p>
          <p className="mt-1 text-sm font-medium">{duplicateWarning}</p>
        </Alert>
      )}
      {apiError && <Alert variant="error" title={apiError} className="mt-4" onDismiss={() => setApiError('')} />}

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="First Name *" name="firstName" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} error={errors.firstName} />
          <TextInput label="Last Name *" name="lastName" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} error={errors.lastName} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <TextInput label="Email" name="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <TextInput label="Address" name="address" value={form.address} onChange={(e) => update('address', e.target.value)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectInput label="Gender" name="gender" options={genderOptions} value={form.gender} onChange={(e) => update('gender', e.target.value)} />
          <SelectInput label="Age Group" name="ageGroup" options={ageGroupOptions} value={form.ageGroup} onChange={(e) => update('ageGroup', e.target.value)} />
        </div>

        <SelectInput label="Source *" name="source" options={sourceOptions} value={form.source} onChange={(e) => update('source', e.target.value)} />
        {form.source === 'outreach' && (
          <SelectInput label="Outreach Program *" name="outreachId" options={programs} placeholder="Select program..." value={form.outreachId} onChange={(e) => update('outreachId', e.target.value)} error={errors.outreachId} />
        )}

        <Textarea label="Notes" name="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Any additional notes about this soul..." />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Capture Soul'}</Button>
          <Button type="button" variant="ghost" onClick={() => window.history.back()}>Cancel</Button>
        </div>
      </form>
    </>
  );
}
