'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateBranch, useRegions } from '@/hooks/use-branches';
import { AddressAutofillGroup, Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { BranchType } from '@kairos/types';
import { useForm, Controller } from 'react-hook-form';
import { DateSelect } from '@/components/date-select';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  regionId: z.string().uuid('Select a region'),
  branchType: z.nativeEnum(BranchType).default(BranchType.Main),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  establishedDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewBranchPage() {  const { t } = useTranslation(['branches', 'common']);

  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const createBranch = useCreateBranch();
  const { data: regions, isLoading: regionsLoading } = useRegions();

  // Second-level guard — admin-only.
  useEffect(() => {
    if (activeRole && activeRole !== 'admin') router.replace('/');
  }, [activeRole, router]);

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
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
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
          <h1 className="text-2xl font-bold tracking-tight">{t('branches:createBranch')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('branches:addANewChurchBranch')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('branches:branchDetails')}</CardTitle>
          <CardDescription>{t('branches:fillInTheDetailsForThe')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">{t('branches:branchName')}</Label>
              <Input id="branchName" {...register('branchName')} />
              {errors.branchName && <p className="text-sm text-destructive">{errors.branchName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionId">{t('branches:region')}</Label>
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
              <Label htmlFor="branchType">{t('branches:branchType')}</Label>
              <CustomSelect
                id="branchType"
                value={watch('branchType') ?? ''}
                onValueChange={(v) => setValue('branchType', v as FormValues['branchType'])}
                placeholder={t('branches:selectType')}
                options={Object.values(BranchType).map((t) => ({ value: t, label: t }))}
              />
            </div>

            <AddressAutofillGroup
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              value={{
                line1: watch('address') ?? '',
                city: watch('city') ?? '',
                postalCode: watch('postalCode') ?? '',
                latitude: watch('latitude') ?? undefined,
                longitude: watch('longitude') ?? undefined,
              }}
              onChange={(v) => {
                setValue('address', v.line1);
                setValue('city', v.city);
                setValue('postalCode', v.postalCode);
                if (typeof v.latitude === 'number') setValue('latitude', v.latitude);
                if (typeof v.longitude === 'number') setValue('longitude', v.longitude);
              }}
            />

            <div className="space-y-2">
              <Label htmlFor="phone">{t('branches:phone')}</Label>
              <Input id="phone" type="tel" {...register('phone')} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t('branches:email')}</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('branches:establishedDate')}</Label>
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
              <Button type="button" variant="outline" onClick={() => router.push('/admin/branches')}>{t('branches:cancel')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
