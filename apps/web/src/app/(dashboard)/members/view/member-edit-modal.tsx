'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Modal, TextInput, SelectInput, Checkbox, Alert } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useUpdateMember } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import type { Member } from '@kairos/types';

interface MemberEditModalProps {
  open: boolean;
  onClose: () => void;
  member: Member;
  onSaved: () => void;
}

const editMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().regex(/^[\d\s+()-]+$/, 'Invalid phone format').or(z.literal('')).optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  homeBranchId: z.string().optional(),
  isActive: z.boolean().optional(),
});

type EditMemberForm = z.infer<typeof editMemberSchema>;

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export function MemberEditModal({ open, onClose, member, onSaved }: MemberEditModalProps) {
  const { user } = useAuth();
  const isAdminOrPastor = user?.role === 'Admin' || user?.role === 'Pastor';

  const updateMember = useUpdateMember();
  const { data: branchesRes } = useBranches({ limit: 100 });
  const branchList = (branchesRes?.data ?? []).filter((b: { isActive: boolean }) => b.isActive);
  const branchOptions = branchList.map((b: { branchId: number; branchName: string }) => ({
    value: String(b.branchId),
    label: b.branchName,
  }));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditMemberForm>({
    resolver: zodResolver(editMemberSchema as never),
  });

  useEffect(() => {
    if (open) {
      reset({
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
        homeBranchId: String(member.homeBranchId),
        isActive: member.isActive,
      });
    }
  }, [open, member, reset]);

  const isActiveValue = watch('isActive');

  const onSubmit = async (data: EditMemberForm) => {
    try {
      const payload: Partial<Member> = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        gender: (data.gender as 'Male' | 'Female') || undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        postalCode: data.postalCode || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
      };
      if (isAdminOrPastor) {
        payload.homeBranchId = Number(data.homeBranchId);
        payload.isActive = data.isActive;
      }
      await updateMember.mutateAsync({ id: member.memberId, data: payload });
      onSaved();
    } catch {
      setError('root', { message: 'Failed to update member. Please try again.' });
    }
  };

  const resolveBranchName = (branchId: number) => {
    const branch = branchList.find((b: { branchId: number }) => b.branchId === branchId);
    return branch ? (branch as { branchName: string }).branchName : `Branch ${branchId}`;
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
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="First Name"
            {...register('firstName')}
            error={errors.firstName?.message}
            required
          />
          <TextInput
            label="Last Name"
            {...register('lastName')}
            error={errors.lastName?.message}
            required
          />
        </div>

        <TextInput
          label="Middle Name"
          {...register('middleName')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <TextInput
            label="Phone"
            type="tel"
            {...register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            label="Gender"
            options={genderOptions}
            placeholder="Select gender"
            {...register('gender')}
          />
          <TextInput
            label="Date of Birth"
            type="date"
            {...register('dateOfBirth')}
          />
        </div>

        <TextInput
          label="Address"
          {...register('address')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="City"
            {...register('city')}
          />
          <TextInput
            label="Postal Code"
            {...register('postalCode')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Emergency Contact Name"
            {...register('emergencyContactName')}
          />
          <TextInput
            label="Emergency Contact Phone"
            type="tel"
            {...register('emergencyContactPhone')}
          />
        </div>

        {isAdminOrPastor && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs text-gray-500 mb-3">Admin Controls</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                label="Home Branch"
                options={branchOptions}
                placeholder="Select branch"
                {...register('homeBranchId')}
              />
              <div className="flex items-end pb-1">
                <Checkbox
                  label="Member is active"
                  name="isActive"
                  checked={isActiveValue ?? false}
                  onChange={(e) => setValue('isActive', e.target.checked)}
                />
              </div>
            </div>
          </div>
        )}

        {!isAdminOrPastor && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs text-gray-500 mb-2">The following fields cannot be edited:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Home Branch:</span> {resolveBranchName(member.homeBranchId)}
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
        )}
      </div>
    </Modal>
  );
}
