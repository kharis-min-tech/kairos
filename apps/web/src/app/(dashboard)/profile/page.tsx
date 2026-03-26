'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { useMyProfile, useUpdateMember } from '@/hooks/use-members';
import { DateSelect } from '@/components/date-select';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@kairos/ui';
import type { UpdateMemberRequest } from '@kairos/types';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}

function resizeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 256;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { data: member, isLoading } = useMyProfile();
  const updateMember = useUpdateMember();

  const [isEditing, setIsEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = member ?? user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateMemberRequest>({
    defaultValues: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      middleName: (profile as { middleName?: string | null })?.middleName ?? '',
      phone: profile?.phone ?? '',
      gender: profile?.gender as 'Male' | 'Female' | undefined,
      dateOfBirth: (profile as { dateOfBirth?: string | null })?.dateOfBirth ?? '',
      address: (profile as { address?: string | null })?.address ?? '',
      city: (profile as { city?: string | null })?.city ?? '',
      postalCode: (profile as { postalCode?: string | null })?.postalCode ?? '',
      emergencyContactName: (profile as { emergencyContactName?: string | null })?.emergencyContactName ?? '',
      emergencyContactRelationship: (profile as { emergencyContactRelationship?: string | null })?.emergencyContactRelationship ?? '',
      emergencyContactPhone: (profile as { emergencyContactPhone?: string | null })?.emergencyContactPhone ?? '',
    },
  });

  const dobValue = watch('dateOfBirth') ?? '';

  function openEditMode() {
    reset({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      middleName: (profile as { middleName?: string | null })?.middleName ?? '',
      phone: profile?.phone ?? '',
      gender: profile?.gender as 'Male' | 'Female' | undefined,
      dateOfBirth: (profile as { dateOfBirth?: string | null })?.dateOfBirth ?? '',
      address: (profile as { address?: string | null })?.address ?? '',
      city: (profile as { city?: string | null })?.city ?? '',
      postalCode: (profile as { postalCode?: string | null })?.postalCode ?? '',
      emergencyContactName: (profile as { emergencyContactName?: string | null })?.emergencyContactName ?? '',
      emergencyContactRelationship: (profile as { emergencyContactRelationship?: string | null })?.emergencyContactRelationship ?? '',
      emergencyContactPhone: (profile as { emergencyContactPhone?: string | null })?.emergencyContactPhone ?? '',
    });
    setPhotoPreview(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setPhotoPreview(null);
    setSaveError(null);
    setIsEditing(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImageToBase64(file);
    setPhotoPreview(resized);
    setValue('photoUrl', resized);
  }

  async function onSubmit(data: UpdateMemberRequest) {
    const memberId = profile?.id;
    if (!memberId) return;
    setSaveError(null);

    const cleaned: UpdateMemberRequest = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== '' && v !== null && v !== undefined) {
        (cleaned as Record<string, unknown>)[k] = v;
      }
    }

    try {
      const updated = await updateMember.mutateAsync({ id: memberId, data: cleaned });
      setUser(updated as never);
      setIsEditing(false);
      setPhotoPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setSaveError(message);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <Card className="animate-pulse">
          <CardContent className="space-y-4 pt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarUrl = photoPreview ?? (profile as { photoUrl?: string | null })?.photoUrl;
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <div className="space-y-6">
      {/* Purple gradient header with avatar */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-8 text-white">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {initials}
              </div>
            )}
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                  title="Change photo"
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {profile?.firstName} {profile?.lastName}
            </h1>
            <p className="mt-0.5 text-sm capitalize text-purple-200">{profile?.systemRole}</p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Link href="/profile/settings">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  Settings
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openEditMode}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...register('firstName', { required: 'Required' })} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...register('lastName', { required: 'Required' })} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input id="middleName" {...register('middleName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <select
                    {...register('gender')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <DateSelect
                    value={dobValue}
                    onChange={(val) => setValue('dateOfBirth', val)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input id="address" {...register('address')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" {...register('postalCode')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input id="emergencyContactName" {...register('emergencyContactName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <select
                    id="emergencyContactRelationship"
                    {...register('emergencyContactRelationship')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select relationship...</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Partner">Partner</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            {saveError && (
              <p className="w-full text-sm text-destructive">{saveError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="success" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name" value={profile?.firstName} />
                <Field label="Last Name" value={profile?.lastName} />
                <Field label="Middle Name" value={(profile as { middleName?: string | null })?.middleName} />
                <Field label="Email" value={profile?.email} />
                <Field label="Phone" value={profile?.phone} />
                <Field label="Gender" value={profile?.gender} />
                <Field label="Date of Birth" value={(profile as { dateOfBirth?: string | null })?.dateOfBirth} />
                <Field label="System Role" value={profile?.systemRole} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Street Address" value={(profile as { address?: string | null })?.address} />
                <Field label="City" value={(profile as { city?: string | null })?.city} />
                <Field label="Postal Code" value={(profile as { postalCode?: string | null })?.postalCode} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact Name" value={(profile as { emergencyContactName?: string | null })?.emergencyContactName} />
                <Field label="Relationship" value={(profile as { emergencyContactRelationship?: string | null })?.emergencyContactRelationship} />
                <Field label="Contact Phone" value={(profile as { emergencyContactPhone?: string | null })?.emergencyContactPhone} />
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
