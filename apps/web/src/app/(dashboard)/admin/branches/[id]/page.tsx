'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { DateSelect } from '@/components/date-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBranch, useUpdateBranch, useBranchLeadership, useRemoveLeadership, useAssignLeadership, useRegions, useDeleteBranch } from '@/hooks/use-branches';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMembers, useMyProfile } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@/components/confirm-dialog';
import { formatShortDate } from '@kairos/core';
import { AddressAutofillGroup, Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { BranchType } from '@kairos/types';
import { MemberAvatar } from '@/components/member-avatar';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  regionId: z.string().uuid('Select a region'),
  branchType: z.nativeEnum(BranchType),
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

export default function BranchDetailPage() {  const { t } = useTranslation(['branches', 'common']);

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const branchSystemAdminBranchIds = useAuthStore((s) => s.branchSystemAdminBranchIds);
  const caps = useCapabilities();
  const { data: myProfile } = useMyProfile();
  const isAdmin = activeRole === 'admin';
  const isPastor = caps.has('branch:write');
  const isBSAHere = branchSystemAdminBranchIds.includes(id);
  const canSeeMembers = isAdmin || (isPastor && myProfile?.homeBranchId === id);
  // Discoverability for the Branch System Admin role page. Visible to system
  // admins (anywhere) and to BSAs of THIS branch. The /roles page itself runs
  // an independent guard, so this is purely a UX hint.
  const canSeeRolesLink = isAdmin || isBSAHere;
  const [showHistory, setShowHistory] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignRole, setAssignRole] = useState<'Main Pastor' | 'Minister'>('Minister');
  const [assignMemberId, setAssignMemberId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const { data: branch, isLoading, error } = useBranch(id);
  const { data: leadership } = useBranchLeadership(id, { includeHistory: showHistory });
  const { data: regions } = useRegions();
  const { data: membersData, isLoading: membersLoading } = useMembers(
    canSeeMembers ? { branchId: id, limit: 100 } : undefined
  );
  const updateBranch = useUpdateBranch();
  const removeLeadership = useRemoveLeadership();
  const assignLeadership = useAssignLeadership();
  const deleteBranch = useDeleteBranch();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Second-level guard — admin or pastor-of-this-branch only. Members + leaders
  // who somehow reach this URL (stale bookmark / direct entry) get bounced.
  useEffect(() => {
    if (!activeRole) return;
    if (activeRole === 'admin') return;
    if (caps.has('branch:write') && myProfile?.homeBranchId === id) return;
    // Don't redirect until myProfile has loaded for pastor — otherwise we may
    // bounce them on the first render before homeBranchId is known.
    if (caps.has('branch:write') && !myProfile) return;
    router.replace('/');
  }, [activeRole, myProfile, id, router]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
      latitude: branch.latitude ?? null,
      longitude: branch.longitude ?? null,
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
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone || undefined,
        email: data.email || undefined,
        establishedDate: data.establishedDate || undefined,
      },
    });
    router.push('/admin/branches');
  };

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="mx-auto max-w-2xl space-y-6">
        <div className="h-9 w-64 animate-pulse rounded bg-muted/60" />
        <div className="h-72 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
        <span className="sr-only">{t('branches:loadingBranch')}</span>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">{t('branches:branchNotFoundOrAccessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{branch.branchName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">{branch.branchType} branch</p>
        </div>
        {canSeeRolesLink && (
          <Link href={`/admin/branches/${id}/roles`}>
            <Button variant="outline" size="sm">{t('branches:manageAdmins')}</Button>
          </Link>
        )}
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branches:branchDetails')}</CardTitle>
          <CardDescription>{t('branches:updateBranchInformation')}</CardDescription>
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
                onValueChange={(v) => setValue('regionId', v, { shouldDirty: true })}
                placeholder={t('branches:selectARegion')}
                options={(regions ?? []).map((r) => ({ value: r.id, label: r.regionName }))}
              />
              {errors.regionId && <p className="text-sm text-destructive">{errors.regionId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchType">{t('branches:branchType')}</Label>
              <CustomSelect
                id="branchType"
                value={watch('branchType') ?? ''}
                onValueChange={(v) => setValue('branchType', v as FormValues['branchType'], { shouldDirty: true })}
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
                setValue('address', v.line1, { shouldDirty: true });
                setValue('city', v.city, { shouldDirty: true });
                setValue('postalCode', v.postalCode, { shouldDirty: true });
                if (typeof v.latitude === 'number') setValue('latitude', v.latitude, { shouldDirty: true });
                if (typeof v.longitude === 'number') setValue('longitude', v.longitude, { shouldDirty: true });
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

            {updateBranch.error && (
              <p className="text-sm text-destructive">{(updateBranch.error as Error).message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="success" disabled={!isDirty || isSubmitting || updateBranch.isPending}>
                {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/branches')}>{t('branches:back')}</Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Deactivate ${branch?.branchName ?? 'this branch'}?`,
                      description: 'The branch will be hidden from active lists. All associated members and data stay in place but are tagged inactive.',
                      confirmLabel: t('branches:deactivate'),
                      variant: 'destructive',
                    });
                    if (!ok) return;
                    deleteBranch.mutate(id, {
                      onSuccess: () => router.push('/admin/branches'),
                    });
                  }}
                >{t('branches:deactivateBranch')}</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Leadership Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{t('branches:leadership')}</CardTitle>
              <CardDescription className="mt-0.5">
                {showHistory ? 'All leadership assignments (including past)' : 'Current branch leadership assignments'}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <span>{t('branches:history')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showHistory}
                  onClick={() => setShowHistory((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showHistory ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      showHistory ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              {isAdmin && (
                <Button size="sm" variant="success" onClick={() => setShowAssignDialog(true)}>{t('branches:assignLeader')}</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assign Leadership Dialog */}
          {showAssignDialog && (
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{t('branches:assignNewLeader')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t('branches:role')}</label>
                  <CustomSelect
                    value={assignRole}
                    onValueChange={(v) => setAssignRole(v as 'Main Pastor' | 'Minister')}
                    options={[{ value: 'Minister', label: t('branches:minister') }, { value: 'Main Pastor', label: t('branches:mainPastor') }]}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t('branches:member')}</label>
                  <CustomSelect
                    value={assignMemberId}
                    onValueChange={setAssignMemberId}
                    placeholder={t('branches:selectAMember')}
                    options={(membersData?.data ?? []).map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t('branches:startDate')}</label>
                  <DateSelect
                    value={assignStartDate}
                    onChange={setAssignStartDate}
                    maxDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              {assignLeadership.error && (
                <p className="text-sm text-rose-600">{(assignLeadership.error as Error).message}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  disabled={!assignMemberId || assignLeadership.isPending}
                  onClick={() => {
                    if (!assignMemberId) return;
                    assignLeadership.mutate(
                      { branchId: id, data: { memberId: assignMemberId, role: assignRole, startDate: assignStartDate || undefined } },
                      {
                        onSuccess: () => {
                          setShowAssignDialog(false);
                          setAssignMemberId('');
                          setAssignStartDate('');
                          setAssignRole('Minister');
                        },
                      }
                    );
                  }}
                >
                  {assignLeadership.isPending ? 'Assigning...' : 'Confirm'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(false)}>{t('branches:cancel')}</Button>
              </div>
            </div>
          )}

          {!leadership || leadership.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {showHistory ? t('branches:noLeadershipRecordsYet') : t('branches:noLeadershipAssignedYet2')}
            </p>
          ) : showHistory ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">{t('branches:name')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('branches:role')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('branches:startDate')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('branches:endDate')}</th>
                    <th className="pb-2 font-medium">{t('branches:status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leadership.map((leader) => (
                    <tr key={leader.id}>
                      <td className="py-2 pr-4">{leader.memberFirstName} {leader.memberLastName}</td>
                      <td className="py-2 pr-4">{leader.role}</td>
                      <td className="py-2 pr-4">{leader.startDate ? formatShortDate(leader.startDate) : '—'}</td>
                      <td className="py-2 pr-4">{leader.endDate ? formatShortDate(leader.endDate) : '—'}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          leader.isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {leader.isCurrent ? 'Current' : 'Past'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {leadership.map((leader) => {
                return (
                  <div key={leader.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        photoUrl={leader.memberPhotoUrl}
                        firstName={leader.memberFirstName}
                        lastName={leader.memberLastName}
                        size="md"
                        variant="light"
                      />
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
                      className="text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Remove ${leader.memberFirstName} ${leader.memberLastName} as ${leader.role}?`,
                          description: 'You can reassign them later if needed.',
                          confirmLabel: t('branches:remove'),
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        removeLeadership.mutate(
                          { branchId: id, leadershipId: leader.id },
                          {
                            onSuccess: () => toast.success(t('branches:leaderRemoved')),
                            onError: () => toast.error(t('branches:failedRemoveLeaderTryAgain')),
                          },
                        );
                      }}
                    >{t('branches:remove')}</Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Section — admin sees all, pastor sees own branch only */}
      {canSeeMembers && (
        <Card>
          <CardHeader>
            <CardTitle>{t('branches:members')}</CardTitle>
            <CardDescription>
              {membersData?.meta?.total ?? 0} member{(membersData?.meta?.total ?? 0) !== 1 ? 's' : ''} in this branch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">{t('branches:loadingMembers')}</p>
            ) : !membersData?.data?.length ? (
              <p className="text-sm text-muted-foreground">{t('branches:noMembersFoundForThisBranch')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">{t('branches:name')}</th>
                      <th className="pb-2 pr-4 font-medium">{t('branches:email')}</th>
                      <th className="pb-2 pr-4 font-medium">{t('branches:phone')}</th>
                      <th className="pb-2 font-medium">{t('branches:status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {membersData.data.map((member) => {
                      return (
                        <tr
                          key={member.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => router.push(`/members/${member.id}`)}
                        >
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <MemberAvatar
                                photoUrl={member.photoUrl}
                                firstName={member.firstName}
                                lastName={member.lastName}
                                size="xs"
                                variant="light"
                              />
                              <span className="font-medium">{member.firstName} {member.lastName}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{member.email ?? '—'}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{member.phone ?? '—'}</td>
                          <td className="py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.approvalStatus === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : member.approvalStatus === 'pending'
                                  ? 'bg-[#f8b537]/15 text-[#9a6b04] dark:text-[#f8b537]'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {member.approvalStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {confirmDialog}
    </div>
  );
}
