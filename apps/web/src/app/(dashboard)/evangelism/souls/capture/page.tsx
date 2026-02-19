'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button, TextInput, SelectInput, DatePicker, Textarea, Alert } from '@/components/ui';
import { souls, outreach } from '@kairos/api-client';

const sourceOptions = [
  { value: 'ad-hoc', label: 'Ad-hoc Evangelism' },
  { value: 'outreach', label: 'Outreach Program' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SoulCapturePage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    captureDate: todayStr(),
    email: '',
    address: '',
    notes: '',
    source: 'ad-hoc',
    outreachId: '',
  });
  const [programs, setPrograms] = useState<Array<{ value: string; label: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.captureDate) e.captureDate = 'Capture date is required';
    if (form.source === 'outreach' && !form.outreachId) e.outreachId = 'Select an outreach program';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await souls.create({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        capture_date: new Date(form.captureDate),
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        outreach_id: form.source === 'outreach' ? Number(form.outreachId) : undefined,
      } as Parameters<typeof souls.create>[0]);
      setSuccess(true);
      setForm({
        firstName: '', lastName: '', phone: '',
        captureDate: todayStr(),
        email: '', address: '', notes: '', source: 'ad-hoc', outreachId: '',
      });
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

      {success && <Alert variant="success" title="Soul captured successfully!" className="mt-4" onDismiss={() => setSuccess(false)} />}
      {apiError && <Alert variant="error" title={apiError} className="mt-4" onDismiss={() => setApiError('')} />}

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="First Name *" name="firstName" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} error={errors.firstName} />
          <TextInput label="Last Name *" name="lastName" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} error={errors.lastName} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Phone *" name="phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} error={errors.phone} />
          <DatePicker label="Capture Date *" name="captureDate" value={form.captureDate} onChange={(e) => update('captureDate', e.target.value)} error={errors.captureDate} />
        </div>
        <TextInput label="Email" name="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        <TextInput label="Address" name="address" value={form.address} onChange={(e) => update('address', e.target.value)} />

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
