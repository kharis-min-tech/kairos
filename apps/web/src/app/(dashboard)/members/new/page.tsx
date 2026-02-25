'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { members, branches } from '@kairos/api-client';
import { ApiError } from '@kairos/api-client';
import type { Branch } from '@kairos/types';
import { TextInput, SelectInput, Button, Alert } from '@/components/ui';
import { Breadcrumbs } from '@/components/layout';
import { useAuth } from '@/lib/auth';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  homeBranchId?: string;
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{7,20}$/.test(phone);
}

const defaultFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  postalCode: '',
  homeBranchId: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

function validateForm(data: typeof defaultFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.firstName.trim()) errors.firstName = 'First name is required';
  if (!data.lastName.trim()) errors.lastName = 'Last name is required';
  if (!data.homeBranchId) errors.homeBranchId = 'Please select a home branch';

  if (data.email.trim() && !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (data.phone.trim() && !validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  return errors;
}

export default function AddMemberPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';

  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch branches for the dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await branches.list({ limit: 100 });
        if (cancelled) return;
        const activeBranches = (res.data as Branch[]).filter((b) => b.isActive);
        const options = activeBranches.map((b) => ({
          value: String(b.branchId),
          label: b.branchName,
        }));
        setBranchOptions(options);
      } catch {
        setBranchOptions([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pre-select branch for Pastor role
  useEffect(() => {
    if (isPastor && user?.branchId) {
      setFormData((prev) => ({ ...prev, homeBranchId: user.branchId }));
    }
  }, [isPastor, user?.branchId]);

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      // Backend expects snake_case field names
      await members.create({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        gender: (formData.gender as 'Male' | 'Female') || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        postal_code: formData.postalCode.trim() || undefined,
        home_branch_id: Number(formData.homeBranchId),
        emergency_contact_name: formData.emergencyContactName.trim() || undefined,
        emergency_contact_phone: formData.emergencyContactPhone.trim() || undefined,
      } as Record<string, unknown>);
      router.push('/members');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || 'Failed to create member. Please try again.');
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Members', href: '/members' }, { label: 'Add Member' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Member</h1>
        <p className="mt-1 text-sm text-gray-600">Create a new member record</p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Add member"
        className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        {submitError && (
          <Alert variant="error" title="Error">
            {submitError}
          </Alert>
        )}

        {/* Name row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="First Name"
            name="first_name"
            required
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
            autoComplete="given-name"
          />
          <TextInput
            label="Last Name"
            name="last_name"
            required
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <TextInput
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={errors.phone}
            autoComplete="tel"
            placeholder="+44 7700 900000"
          />
        </div>

        {/* DOB and Gender */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          />
          <SelectInput
            label="Gender"
            name="gender"
            options={GENDER_OPTIONS}
            placeholder="Select gender"
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
          />
        </div>

        {/* Address fields */}
        <TextInput
          label="Address"
          name="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          autoComplete="street-address"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="City"
            name="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            autoComplete="address-level2"
          />
          <TextInput
            label="Postal Code"
            name="postal_code"
            value={formData.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value)}
            autoComplete="postal-code"
          />
        </div>

        {/* Branch selector */}
        <SelectInput
          label="Home Branch"
          name="home_branch_id"
          required
          options={branchOptions}
          placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
          value={formData.homeBranchId}
          onChange={(e) => handleChange('homeBranchId', e.target.value)}
          error={errors.homeBranchId}
          disabled={loadingBranches || isPastor}
        />

        {/* Emergency contact */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Emergency Contact Name"
            name="emergency_contact_name"
            value={formData.emergencyContactName}
            onChange={(e) => handleChange('emergencyContactName', e.target.value)}
          />
          <TextInput
            label="Emergency Contact Phone"
            name="emergency_contact_phone"
            type="tel"
            value={formData.emergencyContactPhone}
            onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Member'}
          </Button>
          <Link href="/members">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
