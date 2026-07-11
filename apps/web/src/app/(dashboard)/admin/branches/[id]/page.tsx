'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { DateSelect } from '@kairos/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBranch, useUpdateBranch, useBranchLeadership, useRemoveLeadership, useAssignLeadership, useRegions, useDeleteBranch } from '@/hooks/use-branches';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMembers, useMyProfile } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@kairos/ui';
import { formatShortDate } from '@/lib/date-format';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { BranchType } from '@kairos/types';
import { MemberAvatar } from '@/components/member-avatar';

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
  const [assignRole, setAssignRole] = useState<'Main Pastor' | 'Elder'>('Elder');
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
    return (
      <div aria-busy="true" aria-live="polite" className="mx-auto max-w-2xl space-y-6">
        <div className="h-9 w-64 animate-pulse rounded bg-muted/60" />
        <div className="h-72 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
        <span className="sr-only">Loading branch</span>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">Branch not found or access denied.</p>
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
            <Button variant="outline" size="sm">Manage Admins</Button>
          </Link>
        )}
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
              <CustomSelect
                id="regionId"
                value={watch('regionId') ?? ''}
                onValueChange={(v) => setValue('regionId', v, { shouldDirty: true })}
                placeholder="Select a region"
                options={(regions ?? []).map((r) => ({ value: r.id, label: r.regionName }))}
              />
              {errors.regionId && <p className="text-sm text-destructive">{errors.regionId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchType">Branch Type</Label>
              <CustomSelect
                id="branchType"
                value={watch('branchType') ?? ''}
                onValueChange={(v) => setValue('branchType', v as FormValues['branchType'], { shouldDirty: true })}
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
              <Button type="submit" variant="success" disabled={!isDirty || isSubmitting || updateBranch.isPending}>
                {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/branches')}>
                Back
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Deactivate ${branch?.branchName ?? 'this branch'}?`,
                      description: 'The branch will be hidden from active lists. All associated members and data stay in place but are tagged inactive.',
                      confirmLabel: 'Deactivate',
                      variant: 'destructive',
                    });
                    if (!ok) return;
                    deleteBranch.mutate(id, {
                      onSuccess: () => router.push('/admin/branches'),
                    });
                  }}
                >
                  Deactivate Branch
                </Button>
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
              <CardTitle>Leadership</CardTitle>
              <CardDescription className="mt-0.5">
                {showHistory ? 'All leadership assignments (including past)' : 'Current branch leadership assignments'}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <span>History</span>
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
                <Button size="sm" variant="success" onClick={() => setShowAssignDialog(true)}>
                  Assign Leader
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assign Leadership Dialog */}
          {showAssignDialog && (
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Assign New Leader</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Role</label>
                  <CustomSelect
                    value={assignRole}
                    onValueChange={(v) => setAssignRole(v as 'Main Pastor' | 'Elder')}
                    options={[{ value: 'Elder', label: 'Elder' }, { value: 'Main Pastor', label: 'Main Pastor' }]}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Member</label>
                  <CustomSelect
                    value={assignMemberId}
                    onValueChange={setAssignMemberId}
                    placeholder="Select a member..."
                    options={(membersData?.data ?? []).map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Start Date</label>
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
                          setAssignRole('Elder');
                        },
                      }
                    );
                  }}
                >
                  {assignLeadership.isPending ? 'Assigning...' : 'Confirm'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {!leadership || leadership.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leadership {showHistory ? 'records' : 'assigned'} yet.</p>
          ) : showHistory ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Start Date</th>
                    <th className="pb-2 pr-4 font-medium">End Date</th>
                    <th className="pb-2 font-medium">Status</th>
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
                          confirmLabel: 'Remove',
                          variant: 'destructive',
                        });
                        if (!ok) return;
                        removeLeadership.mutate(
                          { branchId: id, leadershipId: leader.id },
                          {
                            onSuccess: () => toast.success('Leader removed.'),
                            onError: () => toast.error('Failed to remove leader. Please try again.'),
                          },
                        );
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

      {/* Members Section — admin sees all, pastor sees own branch only */}
      {canSeeMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {membersData?.meta?.total ?? 0} member{(membersData?.meta?.total ?? 0) !== 1 ? 's' : ''} in this branch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : !membersData?.data?.length ? (
              <p className="text-sm text-muted-foreground">No members found for this branch.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Phone</th>
                      <th className="pb-2 font-medium">Status</th>
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
