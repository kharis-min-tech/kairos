'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateBranch, useRegions } from '@/hooks/use-branches';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { BranchType } from '@kairos/types';

const schema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  regionId: z.string().uuid('Select a region'),
  branchType: z.nativeEnum(BranchType).default(BranchType.Main),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  establishedDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewBranchPage() {
  const router = useRouter();
  const createBranch = useCreateBranch();
  const { data: regions, isLoading: regionsLoading } = useRegions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { branchType: BranchType.Main },
  });

  const onSubmit = async (data: FormValues) => {
    await createBranch.mutateAsync({
      branchName: data.branchName,
      regionId: data.regionId,
      branchType: data.branchType,
      address: data.address || undefined,
      city: data.city || undefined,
      postalCode: data.postalCode || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      establishedDate: data.establishedDate || undefined,
    });
    router.push('/admin/branches');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Branch</h1>
        <p className="text-muted-foreground">Add a new church branch</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Details</CardTitle>
          <CardDescription>Fill in the details for the new branch</CardDescription>
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
                <option value="">
                  {regionsLoading ? 'Loading regions...' : 'Select a region'}
                </option>
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
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="establishedDate">Established Date</Label>
                <Input id="establishedDate" type="date" {...register('establishedDate')} />
              </div>
            </div>

            {createBranch.error && (
              <p className="text-sm text-destructive">
                {(createBranch.error as Error).message}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || createBranch.isPending}>
                {createBranch.isPending ? 'Creating...' : 'Create Branch'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/branches')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
