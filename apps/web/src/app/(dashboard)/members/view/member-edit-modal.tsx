'use client';

import { useState } from 'react';
import { Button, Modal, TextInput, SelectInput, Alert } from '@/components/ui';
import { members } from '@kairos/api-client';
import type { Member } from '@kairos/types';

interface MemberEditModalProps {
  open: boolean;
  onClose: () => void;
  member: Member;
  onSaved: () => void;
}

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export function MemberEditModal({ open, onClose, member, onSaved }: MemberEditModalProps) {
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    middleName: member.middleName || '',
    email: member.email || '',
    phone: member.phone || '',
    gender: member.gender || '',
    dateOfBirth: member.dateOfBirth
      ? new Date(member.dateOfBirth).toISOString().split('T')[0]
      : '',
    address: member.address || '',
    city: member.city || '',
    postalCode: member.postalCode || '',
    emergencyContactName: member.emergencyContactName || '',
    emergencyContactPhone: member.emergencyContactPhone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email format';
    }
    if (form.phone && !/^[\d\s+()-]+$/.test(form.phone)) {
      errs.phone = 'Invalid phone format';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      await members.update(member.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || undefined,
        phone: form.phone || undefined,
        gender: (form.gender as 'Male' | 'Female') || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        postalCode: form.postalCode || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
      });
      onSaved();
    } catch {
      setApiError('Failed to update member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Member"
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {apiError && <Alert variant="error">{apiError}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="First Name"
            name="first_name"
            value={form.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
            required
          />
          <TextInput
            label="Last Name"
            name="last_name"
            value={form.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={errors.lastName}
            required
          />
        </div>

        <TextInput
          label="Middle Name"
          name="middle_name"
          value={form.middleName}
          onChange={(e) => handleChange('middleName', e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
          />
          <TextInput
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            label="Gender"
            name="gender"
            options={genderOptions}
            placeholder="Select gender"
            value={form.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
          />
          <TextInput
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          />
        </div>

        <TextInput
          label="Address"
          name="address"
          value={form.address}
          onChange={(e) => handleChange('address', e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="City"
            name="city"
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
          <TextInput
            label="Postal Code"
            name="postal_code"
            value={form.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Emergency Contact Name"
            name="emergency_contact_name"
            value={form.emergencyContactName}
            onChange={(e) => handleChange('emergencyContactName', e.target.value)}
          />
          <TextInput
            label="Emergency Contact Phone"
            name="emergency_contact_phone"
            type="tel"
            value={form.emergencyContactPhone}
            onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
          />
        </div>

        {/* Non-editable fields shown as read-only info */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-xs text-gray-500 mb-2">The following fields cannot be edited:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Home Branch:</span> Branch {member.homeBranchId}
            </div>
            <div>
              <span className="font-medium">Membership Date:</span>{' '}
              {member.membershipDate ? new Date(member.membershipDate).toLocaleDateString('en-GB') : '—'}
            </div>
            <div>
              <span className="font-medium">Status:</span> {member.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
