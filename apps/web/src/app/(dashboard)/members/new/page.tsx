'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Alert, Card, CardContent, CardHeader, CardTitle, TextInput, SelectInput } from '@/components/ui';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/lib/auth';
import { useCreateMember } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { ApiError } from '@kairos/api-client';

const addMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number').or(z.literal('')).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  homeBranchId: z.string().min(1, 'Please select a home branch'),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export default function AddMemberPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPastor = user?.role === 'Pastor';

  const createMember = useCreateMember();
  const { data: branchesRes, isLoading: loadingBranches } = useBranches({ limit: 100 });
  const branchOptions = (branchesRes?.data ?? [])
    .filter((b: { isActive: boolean }) => b.isActive)
    .map((b: { branchId: number; branchName: string }) => ({
      value: String(b.branchId),
      label: b.branchName,
    }));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema as never),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      city: '',
      postalCode: '',
      homeBranchId: isPastor && user?.branchId ? user.branchId : '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    },
  });

  useEffect(() => {
    if (isPastor && user?.branchId) {
      setValue('homeBranchId', user.branchId);
    }
  }, [isPastor, user?.branchId, setValue]);

  const onSubmit = async (data: AddMemberForm) => {
    try {
      await createMember.mutateAsync({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: (data.gender as 'Male' | 'Female') || undefined,
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        postalCode: data.postalCode?.trim() || undefined,
        homeBranchId: Number(data.homeBranchId),
        emergencyContactName: data.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || undefined,
      });
      router.push('/members');
    } catch (err: unknown) {
      const message = err instanceof ApiError
        ? err.message || 'Failed to create member.'
        : 'An unexpected error occurred.';
      setError('root', { message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Member" description="Create a new member record" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.root && (
              <Alert variant="error" title="Error">
                {errors.root.message}
              </Alert>
            )}

            {/* Personal */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="First Name"
                {...register('firstName')}
                error={errors.firstName?.message}
                required
                autoComplete="given-name"
              />
              <TextInput
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
                required
                autoComplete="family-name"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                autoComplete="email"
              />
              <TextInput
                label="Phone"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                autoComplete="tel"
                placeholder="+44 7700 900000"
              />
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Date of Birth"
                type="date"
                {...register('dateOfBirth')}
              />
              <SelectInput
                label="Gender"
                options={GENDER_OPTIONS}
                placeholder="Select gender"
                {...register('gender')}
              />
            </div>

            {/* Address */}
            <TextInput
              label="Address"
              {...register('address')}
              autoComplete="street-address"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="City"
                {...register('city')}
                autoComplete="address-level2"
              />
              <TextInput
                label="Postal Code"
                {...register('postalCode')}
                autoComplete="postal-code"
              />
            </div>

            {/* Church */}
            <SelectInput
              label="Home Branch"
              required
              options={branchOptions}
              placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
              {...register('homeBranchId')}
              error={errors.homeBranchId?.message}
              disabled={loadingBranches || isPastor}
            />

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Member'}
              </Button>
              <Link href="/members">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
