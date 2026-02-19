'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { members, branches } from '@kairos/api-client';
import { ApiError } from '@kairos/api-client';
import type { Branch } from '@kairos/types';
import { TextInput, SelectInput, DatePicker } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  home_branch_id?: string;
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

function validateForm(data: typeof defaultFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.first_name.trim()) errors.first_name = 'First name is required';
  if (!data.last_name.trim()) errors.last_name = 'Last name is required';

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required';
  } else {
    const dob = new Date(data.date_of_birth);
    if (dob >= new Date()) errors.date_of_birth = 'Date of birth must be in the past';
  }

  if (!data.gender) errors.gender = 'Gender is required';
  if (!data.address.trim()) errors.address = 'Address is required';
  if (!data.home_branch_id) errors.home_branch_id = 'Please select a home branch';

  return errors;
}

const defaultFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  address: '',
  home_branch_id: '',
};

export default function RegisterPage() {
  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fetch branches for the dropdown
  useEffect(() => {
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
      } catch {
        // If branches fail to load, user can still see the form
        setBranchOptions([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
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
      await members.create({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        date_of_birth: new Date(formData.date_of_birth),
        gender: formData.gender as 'Male' | 'Female',
        address: formData.address.trim(),
        home_branch_id: Number(formData.home_branch_id),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || 'Registration failed. Please try again.');
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Success state — pending approval message
  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-primary">Kairos</h1>
          <Alert variant="success" title="Registration submitted">
            <p>
              Your registration is pending approval. A branch administrator will
              review your application. You will be notified once your account is
              approved.
            </p>
          </Alert>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-primary">Kairos</h1>
        <p className="mb-6 text-center text-sm text-gray-600">Create your account</p>

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Member registration"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Register</h2>

          {submitError && (
            <Alert variant="error" title="Registration failed">
              {submitError}
            </Alert>
          )}

          {/* Name row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="First name"
              name="first_name"
              required
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              error={errors.first_name}
              autoComplete="given-name"
            />
            <TextInput
              label="Last name"
              name="last_name"
              required
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              error={errors.last_name}
              autoComplete="family-name"
            />
          </div>

          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          <TextInput
            label="Phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={errors.phone}
            autoComplete="tel"
            placeholder="+44 7700 900000"
          />

          {/* DOB and Gender row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              label="Date of birth"
              name="date_of_birth"
              required
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              error={errors.date_of_birth}
              max={new Date().toISOString().split('T')[0]}
            />
            <SelectInput
              label="Gender"
              name="gender"
              required
              options={GENDER_OPTIONS}
              placeholder="Select gender"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              error={errors.gender}
            />
          </div>

          <TextInput
            label="Address"
            name="address"
            required
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            error={errors.address}
            autoComplete="street-address"
          />

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

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Register'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
