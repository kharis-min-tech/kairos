'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFellowship, useUpdateFellowship } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { FellowshipType } from '@kairos/types';

const FELLOWSHIP_TYPE_LABELS: Record<string, string> = {
  [FellowshipType.KGroups]: 'K-Groups',
  [FellowshipType.KharisExpress]: 'Kharis Express',
  [FellowshipType.NewBreeds]: 'New Breeds',
  [FellowshipType.KharisOnCampus]: 'Kharis on Campus (KOC)',
  [FellowshipType.KharisOnCampusColleges]: 'KOC Colleges',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQUENCIES = [
  { value: 'Every week', label: 'Every week' },
  { value: 'Every two weeks', label: 'Every two weeks' },
  { value: 'Once a month', label: 'Once a month' },
  { value: 'First', label: 'First [day] of month' },
  { value: 'Last', label: 'Last [day] of month' },
];
const TIMES: string[] = [];
for (let h = 5; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) break;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    TIMES.push(`${hour12}:${m === 0 ? '00' : '30'} ${ampm}`);
  }
}

const schema = z.object({
  fellowshipName: z.string().min(1, 'Fellowship name is required').max(150),
  branchId: z.string().uuid('Select a branch'),
  fellowshipType: z.string().min(1, 'Select a fellowship type'),
  description: z.string().optional(),
  leaderId: z.string().optional(),
  coLeaderId: z.string().optional(),
  meetingFrequency: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseMeetingSchedule(schedule: string | null) {
  if (!schedule) return { meetingFrequency: '', meetingDay: '', meetingTime: '' };
  const atIdx = schedule.indexOf(' at ');
  const meetingTime = atIdx >= 0 ? schedule.slice(atIdx + 4) : '';
  const withoutTime = atIdx >= 0 ? schedule.slice(0, atIdx) : schedule;
  const onIdx = withoutTime.indexOf(' on ');
  const meetingDay = onIdx >= 0 ? withoutTime.slice(onIdx + 4) : '';
  const meetingFrequency = onIdx >= 0 ? withoutTime.slice(0, onIdx) : withoutTime;
  return { meetingFrequency, meetingDay, meetingTime };
}

export default function EditFellowshipPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'admin';

  const { data: fellowship, isLoading: fellowshipLoading } = useFellowship(id);
  const updateFellowship = useUpdateFellowship();
  const { data: branches, isLoading: branchesLoading } = useBranches();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedBranchId = watch('branchId');
  const { data: branchMembersData } = useMembers(selectedBranchId ? { branchId: selectedBranchId, limit: 200 } : undefined);
  const branchMembers = branchMembersData?.data ?? [];

  useEffect(() => {
    if (!fellowship) return;
    const parsed = parseMeetingSchedule(fellowship.meetingSchedule);
    reset({
      fellowshipName: fellowship.fellowshipName,
      branchId: fellowship.branchId,
      fellowshipType: fellowship.fellowshipType,
      description: fellowship.description ?? '',
      leaderId: fellowship.leaderId ?? '',
      coLeaderId: fellowship.coLeaderId ?? '',
      ...parsed,
    });
  }, [fellowship, reset]);

  const onSubmit = async (data: FormValues) => {
    let meetingSchedule: string | undefined;
    if (data.meetingFrequency && data.meetingDay) {
      meetingSchedule = `${data.meetingFrequency} on ${data.meetingDay}`;
      if (data.meetingTime) meetingSchedule += ` at ${data.meetingTime}`;
    }
    try {
      await updateFellowship.mutateAsync({
        id,
        data: {
          fellowshipName: data.fellowshipName,
          branchId: data.branchId,
          fellowshipType: data.fellowshipType,
          description: data.description || undefined,
          leaderId: data.leaderId || undefined,
          coLeaderId: data.coLeaderId || undefined,
          meetingSchedule,
        },
      });
      router.push(`/fellowships/${id}`);
    } catch {
      // error surfaced via updateFellowship.error in JSX
    }
  };

  if (fellowshipLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading fellowship...</p>
      </div>
    );
  }

  if (!fellowship) {
    return (
      <div className="rounded-lg bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Fellowship not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <Link href={`/fellowships/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Fellowship
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Fellowship</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{fellowship.fellowshipName}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fellowship Details</CardTitle>
          <CardDescription>Update the details for this fellowship group</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {updateFellowship.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {updateFellowship.error instanceof Error
                  ? updateFellowship.error.message
                  : 'Failed to update fellowship. Please try again.'}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fellowshipName">Fellowship Name *</Label>
              <Input id="fellowshipName" {...register('fellowshipName')} placeholder="e.g. Brixton K-Group A" />
              {errors.fellowshipName && (
                <p className="text-sm text-destructive">{errors.fellowshipName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fellowshipType">Fellowship Type *</Label>
              <CustomSelect
                id="fellowshipType"
                value={watch('fellowshipType') ?? ''}
                onValueChange={(v) => setValue('fellowshipType', v as FormValues['fellowshipType'])}
                placeholder="Select a type..."
                options={Object.values(FellowshipType).map((t) => ({ value: t, label: FELLOWSHIP_TYPE_LABELS[t] ?? t }))}
              />
              {errors.fellowshipType && (
                <p className="text-sm text-destructive">{errors.fellowshipType.message}</p>
              )}
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch *</Label>
                <CustomSelect
                  id="branchId"
                  value={watch('branchId') ?? ''}
                  onValueChange={(v) => setValue('branchId', v)}
                  placeholder={branchesLoading ? 'Loading branches...' : 'Select a branch...'}
                  options={(branches ?? []).map((branch) => ({ value: branch.id, label: branch.branchName }))}
                />
                {errors.branchId && (
                  <p className="text-sm text-destructive">{errors.branchId.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of this fellowship..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leaderId">Leader</Label>
                <CustomSelect
                  id="leaderId"
                  value={watch('leaderId') ?? ''}
                  onValueChange={(v) => setValue('leaderId', v)}
                  placeholder="Select leader..."
                  options={branchMembers.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coLeaderId">Co-Leader</Label>
                <CustomSelect
                  id="coLeaderId"
                  value={watch('coLeaderId') ?? ''}
                  onValueChange={(v) => setValue('coLeaderId', v)}
                  placeholder="Select co-leader..."
                  options={branchMembers.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Meeting Schedule (optional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="meetingFrequency" className="text-xs text-muted-foreground">Frequency</Label>
                  <CustomSelect
                    id="meetingFrequency"
                    value={watch('meetingFrequency') ?? ''}
                    onValueChange={(v) => setValue('meetingFrequency', v as FormValues['meetingFrequency'])}
                    placeholder="—"
                    options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meetingDay" className="text-xs text-muted-foreground">Day</Label>
                  <CustomSelect
                    id="meetingDay"
                    value={watch('meetingDay') ?? ''}
                    onValueChange={(v) => setValue('meetingDay', v as FormValues['meetingDay'])}
                    placeholder="—"
                    options={DAYS.map((d) => ({ value: d, label: d }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meetingTime" className="text-xs text-muted-foreground">Time</Label>
                  <CustomSelect
                    id="meetingTime"
                    value={watch('meetingTime') ?? ''}
                    onValueChange={(v) => setValue('meetingTime', v)}
                    placeholder="—"
                    options={TIMES.map((t) => ({ value: t, label: t }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/fellowships/${id}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={isSubmitting || updateFellowship.isPending}
              >
                {isSubmitting || updateFellowship.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
