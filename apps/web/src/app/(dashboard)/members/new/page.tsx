'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useCreateMember } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { DateSelect } from '@/components/date-select';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, CustomSelect } from '@kairos/ui';
import type { CreateMemberRequest } from '@kairos/types';

export default function AddMemberPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const caps = useCapabilities();
  const isAdmin = user?.systemRole === 'admin';
  const canCreate = isAdmin || caps.has('branch:write');
  const createMember = useCreateMember();
  const { data: branches } = useBranches();

  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (user !== null && !canCreate) router.replace('/dashboard');
  }, [user, canCreate, router]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMemberRequest>();

  const dobValue = watch('dateOfBirth') ?? '';
  const secondaryBranchId = watch('secondaryBranchId');

  if (user !== null && !canCreate) return null;

  async function onSubmit(data: CreateMemberRequest) {
    try {
      const res = await createMember.mutateAsync(data);
      setGeneratedPassword(res.generatedPassword);
    } catch {
      // error surfaced via createMember.isError in JSX
    }
  }

  // Success state — show generated password
  if (generatedPassword) {
    return (
      <div className="space-y-6">
        <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 px-6 py-7 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold">Member Created!</h1>
          <p className="mt-0.5 text-sm text-emerald-100">The new member account has been set up</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Temporary Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with the new member. They will be required to change it on first login.
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-center font-mono text-lg font-bold text-foreground">{generatedPassword}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              This password will not be shown again. Make sure to save or share it now.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            className="rounded-lg font-semibold"
            onClick={() => router.push('/members')}
          >
            Back to Members
          </Button>
          <Button
            variant="outline"
            className="rounded-lg"
            onClick={() => {
              setGeneratedPassword(null);
              createMember.reset();
            }}
          >
            Add Another Member
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <Link href="/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Members
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Add New Member</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Create a new member account for your church</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error banner */}
        {createMember.isError && (
          <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {createMember.error instanceof Error ? createMember.error.message : 'Failed to create member'}
          </div>
        )}

        {/* Section 1: Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  className="mt-1"
                  {...register('firstName', { required: 'First name is required' })}
                />
                {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  className="mt-1"
                  {...register('lastName', { required: 'Last name is required' })}
                />
                {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" className="mt-1" {...register('middleName')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  className="mt-1"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" className="mt-1" {...register('phone', { required: 'Phone number is required' })} />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <CustomSelect
                  id="gender"
                  value={watch('gender') ?? ''}
                  onValueChange={(v) => setValue('gender', v as 'Male' | 'Female')}
                  placeholder="Select gender"
                  options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
                />
                {errors.gender && <p className="mt-1 text-xs text-destructive">{errors.gender.message}</p>}
              </div>
              <div>
                <Label>Date of Birth</Label>
                <DateSelect
                  value={dobValue}
                  onChange={(iso) => setValue('dateOfBirth', iso)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" className="mt-1" {...register('address')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" className="mt-1" {...register('city')} />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" className="mt-1" {...register('postalCode')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input id="emergencyContactName" className="mt-1" {...register('emergencyContactName')} />
              </div>
              <div>
                <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                <CustomSelect
                  id="emergencyContactRelationship"
                  value={watch('emergencyContactRelationship') ?? ''}
                  onValueChange={(v) => setValue('emergencyContactRelationship', v)}
                  placeholder="Select relationship..."
                  options={['Spouse','Partner','Parent','Child','Sibling','Grandparent','Guardian','Friend','Other'].map((r) => ({ value: r, label: r }))}
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input id="emergencyContactPhone" type="tel" className="mt-1" {...register('emergencyContactPhone')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Church Info */}
        <Card>
          <CardHeader>
            <CardTitle>Church Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="homeBranchId">Home Branch *</Label>
                <CustomSelect
                  id="homeBranchId"
                  value={watch('homeBranchId') ?? ''}
                  onValueChange={(v) => setValue('homeBranchId', v)}
                  placeholder="Select a branch"
                  options={(branches ?? []).map((b) => ({ value: b.id, label: b.branchName }))}
                />
                {errors.homeBranchId && <p className="mt-1 text-xs text-destructive">{errors.homeBranchId.message}</p>}
              </div>
              <div>
                <Label htmlFor="systemRole">System Role</Label>
                {isAdmin ? (
                  <CustomSelect
                    id="systemRole"
                    value={watch('systemRole') ?? 'member'}
                    onValueChange={(v) => setValue('systemRole', v as 'member' | 'admin')}
                    options={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }]}
                  />
                ) : (
                  <Input id="systemRole" value="Member" disabled className="mt-1 cursor-not-allowed" />
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {isAdmin ? 'Promote new admins or pastors here.' : 'Only admins can assign pastor or admin roles.'}
                </p>
              </div>
            </div>
            {/* Secondary branch */}
            <div>
              <Label htmlFor="secondaryBranchId">Secondary Branch</Label>
              <p className="mb-1 text-xs text-muted-foreground">Optional — e.g. a branch near their university or workplace</p>
              <CustomSelect
                id="secondaryBranchId"
                value={watch('secondaryBranchId') ?? ''}
                onValueChange={(v) => setValue('secondaryBranchId', v)}
                placeholder="None"
                options={(branches ?? []).map((b) => ({ value: b.id, label: b.branchName }))}
              />
            </div>
            {secondaryBranchId && (
              <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-dashed border-input/15 bg-muted/30 p-4">
                <p className="col-span-full text-xs font-medium text-muted-foreground">Secondary Branch Address <span className="font-normal">(optional)</span></p>
                <div className="sm:col-span-3">
                  <Label htmlFor="secondaryAddress">Street Address</Label>
                  <Input id="secondaryAddress" className="mt-1" {...register('secondaryAddress')} />
                </div>
                <div>
                  <Label htmlFor="secondaryCity">City</Label>
                  <Input id="secondaryCity" className="mt-1" {...register('secondaryCity')} />
                </div>
                <div>
                  <Label htmlFor="secondaryPostalCode">Postal Code</Label>
                  <Input id="secondaryPostalCode" className="mt-1" {...register('secondaryPostalCode')} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#5D3FD3]/15 text-[#5D3FD3]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Photo upload coming soon</p>
                <p className="text-xs text-muted-foreground">Profile photos will be available in a future update</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={createMember.isPending}
            className="rounded-lg"
          >
            {createMember.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Member'
            )}
          </Button>
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push('/members')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
