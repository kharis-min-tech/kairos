'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { DateSelect } from '@/components/date-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBranch, useUpdateBranch, useBranchLeadership, useRemoveLeadership, useRegions } from '@/hooks/use-branches';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { BranchType } from '@kairos/types';

const schema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  regionId: z.string().uuid('Select a region'),
  branchType: z.nativeEnum(BranchType),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  establishedDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: branch, isLoading, error } = useBranch(id);
  const { data: leadership } = useBranchLeadership(id);
  const { data: regions } = useRegions();
  const updateBranch = useUpdateBranch();
  const removeLeadership = useRemoveLeadership();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: branch ? {
      branchName: branch.branchName,
      regionId: branch.regionId,
      branchType: branch.branchType as BranchType,
      address: branch.address ?? '',
      city: branch.city ?? '',
      postalCode: branch.postalCode ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      establishedDate: branch.establishedDate ?? '',
    } : undefined,
  });

  const onSubmit = async (data: FormValues) => {
    await updateBranch.mutateAsync({
      id,
      data: {
        branchName: data.branchName,
        regionId: data.regionId,
        branchType: data.branchType,
        address: data.address || undefined,
        city: data.city || undefined,
        postalCode: data.postalCode || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        establishedDate: data.establishedDate || undefined,
      },
    });
    router.push('/admin/branches');
  };

  if (isLoading) {
    return <p className="py-12 text-center text-muted-foreground">Loading branch...</p>;
  }

  if (error || !branch) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Branch not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <h1 className="text-2xl font-bold">{branch.branchName}</h1>
        <p className="mt-0.5 text-sm text-purple-200 capitalize">{branch.branchType} branch</p>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Details</CardTitle>
          <CardDescription>Update branch information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name *</Label>
              <Input id="branchName" {...register('branchName')} />
              {errors.branchName && <p className="text-sm text-destructive">{errors.branchName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionId">Region *</Label>
              <select
                id="regionId"
                {...register('regionId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a region</option>
                {regions?.map((r) => (
                  <option key={r.id} value={r.id}>{r.regionName}</option>
                ))}
              </select>
              {errors.regionId && <p className="text-sm text-destructive">{errors.regionId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchType">Branch Type</Label>
              <select
                id="branchType"
                {...register('branchType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.values(BranchType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" {...register('postalCode')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" {...register('phone')} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
              <div className="space-y-2">
                <Label>Established Date</Label>
                <Controller
                  name="establishedDate"
                  control={control}
                  render={({ field }) => (
                    <DateSelect value={field.value ?? ''} onChange={field.onChange} maxYear={new Date().getFullYear()} />
                  )}
                />
              </div>
            </div>

            {updateBranch.error && (
              <p className="text-sm text-destructive">{(updateBranch.error as Error).message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={!isDirty || isSubmitting || updateBranch.isPending}>
                {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/branches')}>
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Leadership Section */}
      <Card>
        <CardHeader>
          <CardTitle>Leadership</CardTitle>
          <CardDescription>Current branch leadership assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {!leadership || leadership.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leadership assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {leadership.map((leader) => {
                const initials = ((leader.memberFirstName?.[0] ?? '') + (leader.memberLastName?.[0] ?? '')).toUpperCase() || '?';
                return (
                  <div key={leader.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium">
                          {leader.memberFirstName} {leader.memberLastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{leader.role}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        if (confirm(`Remove ${leader.role} assignment?`)) {
                          removeLeadership.mutate({ branchId: id, leadershipId: leader.id });
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
