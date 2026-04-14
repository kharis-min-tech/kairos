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
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  homeBranchId?: string;
}

interface ConversionMemberFormProps {
  soul: Soul;
  open: boolean;
  onClose: () => void;
  onSuccess: (memberId: string) => void;
}

export function ConversionMemberForm({ soul, open, onClose, onSuccess }: ConversionMemberFormProps) {
  const [formData, setFormData] = useState({
    firstName: soul.firstName || '',
    lastName: soul.lastName || '',
    phone: soul.phone || '',
    email: soul.email || '',
    address: soul.address || '',
    city: soul.city || '',
    gender: (soul as Soul & { gender?: string }).gender || '',
    homeBranchId: '',
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
        const res = await branches.list();
        if (cancelled) return;
        const options = (res.data as Branch[]).map((b) => ({
          value: String(b.id),
          label: b.branchName,
        }));
        setBranchOptions(options);
        // Auto-select first branch if only one
        if (options.length === 1 && options[0]) {
          const firstBranch = options[0];
          setFormData((prev) => ({ ...prev, homeBranchId: firstBranch.value }));
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
      firstName: soul.firstName || '',
      lastName: soul.lastName || '',
      phone: soul.phone || '',
      email: soul.email || '',
      address: soul.address || '',
      city: soul.city || '',
      gender: (soul as Soul & { gender?: string }).gender || '',
      homeBranchId: '',
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
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.homeBranchId) e.homeBranchId = 'Please select a home branch';
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
      const createData: Record<string, string> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        homeBranchId: formData.homeBranchId,
      };
      if (formData.email.trim()) createData.email = formData.email.trim();
      if (formData.phone.trim()) createData.phone = formData.phone.trim();
      if (formData.address.trim()) createData.address = formData.address.trim();
      if (formData.city.trim()) createData.city = formData.city.trim();
      if (formData.gender) createData.gender = formData.gender;

      const result = await members.create(createData as Parameters<typeof members.create>[0]);
      const resultData = result as unknown as { data?: { id?: string }; id?: string };
      onSuccess(resultData.data?.id ?? resultData.id ?? '');
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
          Review and complete the member registration for <span className="font-medium">{soul.firstName} {soul.lastName}</span>.
          The registration will be submitted for branch admin approval.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="First name"
              name="first_name"
              required
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={errors.firstName}
            />
            <TextInput
              label="Last name"
              name="last_name"
              required
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={errors.lastName}
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
            value={formData.homeBranchId}
            onChange={(e) => handleChange('homeBranchId', e.target.value)}
            error={errors.homeBranchId}
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
