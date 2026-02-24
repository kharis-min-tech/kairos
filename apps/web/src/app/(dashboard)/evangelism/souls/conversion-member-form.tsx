'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Modal, Button, Alert } from '@/components/ui';
import { TextInput, SelectInput } from '@/components/ui/form-input';
import { members, branches } from '@kairos/api-client';
import { ApiError } from '@kairos/api-client';
import type { Soul, Branch } from '@kairos/types';

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  home_branch_id?: string;
}

interface ConversionMemberFormProps {
  soul: Soul;
  open: boolean;
  onClose: () => void;
  onSuccess: (memberId: number) => void;
}

export function ConversionMemberForm({ soul, open, onClose, onSuccess }: ConversionMemberFormProps) {
  const [formData, setFormData] = useState({
    first_name: soul.first_name || '',
    last_name: soul.last_name || '',
    phone: soul.phone || '',
    email: soul.email || '',
    address: soul.address || '',
    city: soul.city || '',
    gender: (soul as Soul & { gender?: string }).gender || '',
    home_branch_id: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await branches.list({ limit: 100, is_active: true });
        if (cancelled) return;
        const options = (res.data as Branch[]).map((b) => ({
          value: String(b.branch_id),
          label: b.branch_name,
        }));
        setBranchOptions(options);
        // Auto-select first branch if only one
        if (options.length === 1 && options[0]) {
          const firstBranch = options[0];
          setFormData((prev) => ({ ...prev, home_branch_id: firstBranch.value }));
        }
      } catch {
        setBranchOptions([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Reset form when soul changes
  useEffect(() => {
    setFormData({
      first_name: soul.first_name || '',
      last_name: soul.last_name || '',
      phone: soul.phone || '',
      email: soul.email || '',
      address: soul.address || '',
      city: soul.city || '',
      gender: (soul as Soul & { gender?: string }).gender || '',
      home_branch_id: '',
    });
    setErrors({});
    setSubmitError('');
  }, [soul]);

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!formData.first_name.trim()) e.first_name = 'First name is required';
    if (!formData.last_name.trim()) e.last_name = 'Last name is required';
    if (!formData.home_branch_id) e.home_branch_id = 'Please select a home branch';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const result = await members.create({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        gender: formData.gender as 'Male' | 'Female' || undefined,
        home_branch_id: Number(formData.home_branch_id),
      });
      onSuccess(result.member_id);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || 'Failed to create member registration.');
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register Converted Soul as Member" maxWidth="lg">
      <form onSubmit={handleSubmit} noValidate aria-label="Convert soul to member registration">
        {submitError && (
          <Alert variant="error" className="mb-4">{submitError}</Alert>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Review and complete the member registration for <span className="font-medium">{soul.first_name} {soul.last_name}</span>.
          The registration will be submitted for branch admin approval.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="First name"
              name="first_name"
              required
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              error={errors.first_name}
            />
            <TextInput
              label="Last name"
              name="last_name"
              required
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              error={errors.last_name}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={errors.phone}
            />
            <TextInput
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
            />
          </div>

          <TextInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="City"
              name="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
            <SelectInput
              label="Gender"
              name="gender"
              options={GENDER_OPTIONS}
              placeholder="Select gender"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              error={errors.gender}
            />
          </div>

          <SelectInput
            label="Home branch"
            name="home_branch_id"
            required
            options={branchOptions}
            placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
            value={formData.home_branch_id}
            onChange={(e) => handleChange('home_branch_id', e.target.value)}
            error={errors.home_branch_id}
            disabled={loadingBranches}
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Register as Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
