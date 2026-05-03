'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateBranch, useRegions } from '@/hooks/use-branches';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { BranchType } from '@kairos/types';
import { useForm, Controller } from 'react-hook-form';
import { DateSelect } from '@/components/date-select';

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
    control,
    watch,
    setValue,
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
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Branch</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Add a new church branch</p>
        </div>
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
              <CustomSelect
                id="regionId"
                value={watch('regionId') ?? ''}
                onValueChange={(v) => setValue('regionId', v)}
                placeholder={regionsLoading ? 'Loading regions...' : 'Select a region'}
                options={(regions ?? []).map((r) => ({ value: r.id, label: r.regionName }))}
              />
              {errors.regionId && <p className="text-sm text-destructive">{errors.regionId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchType">Branch Type</Label>
              <CustomSelect
                id="branchType"
                value={watch('branchType') ?? ''}
                onValueChange={(v) => setValue('branchType', v as FormValues['branchType'])}
                placeholder="Select type"
                options={Object.values(BranchType).map((t) => ({ value: t, label: t }))}
              />
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
