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
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
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
  };

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  if (fellowshipLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading fellowship...</p>
      </div>
    );
  }

  if (!fellowship) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">Fellowship not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <Link
          href={`/fellowships/${id}`}
          className="inline-flex items-center gap-1 text-sm text-purple-200 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Fellowship
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Fellowship</h1>
        <p className="mt-0.5 text-sm text-purple-200">{fellowship.fellowshipName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fellowship Details</CardTitle>
          <CardDescription>Update the details for this fellowship group</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {updateFellowship.error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {updateFellowship.error instanceof Error
                  ? updateFellowship.error.message
                  : 'Failed to update fellowship. Please try again.'}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fellowshipName">Fellowship Name *</Label>
              <Input id="fellowshipName" {...register('fellowshipName')} placeholder="e.g. Ikeja K-Group A" />
              {errors.fellowshipName && (
                <p className="text-sm text-destructive">{errors.fellowshipName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fellowshipType">Fellowship Type *</Label>
              <select id="fellowshipType" {...register('fellowshipType')} className={selectClass}>
                <option value="">Select a type...</option>
                {Object.values(FellowshipType).map((t) => (
                  <option key={t} value={t}>{FELLOWSHIP_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
              {errors.fellowshipType && (
                <p className="text-sm text-destructive">{errors.fellowshipType.message}</p>
              )}
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch *</Label>
                <select id="branchId" {...register('branchId')} className={selectClass}>
                  <option value="">
                    {branchesLoading ? 'Loading branches...' : 'Select a branch...'}
                  </option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                  ))}
                </select>
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
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leaderId">Leader</Label>
                <select id="leaderId" {...register('leaderId')} className={selectClass}>
                  <option value="">Select leader...</option>
                  {branchMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coLeaderId">Co-Leader</Label>
                <select id="coLeaderId" {...register('coLeaderId')} className={selectClass}>
                  <option value="">Select co-leader...</option>
                  {branchMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Meeting Schedule (optional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="meetingFrequency" className="text-xs text-muted-foreground">Frequency</Label>
                  <select id="meetingFrequency" {...register('meetingFrequency')} className={selectClass}>
                    <option value="">—</option>
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meetingDay" className="text-xs text-muted-foreground">Day</Label>
                  <select id="meetingDay" {...register('meetingDay')} className={selectClass}>
                    <option value="">—</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meetingTime" className="text-xs text-muted-foreground">Time</Label>
                  <select id="meetingTime" {...register('meetingTime')} className={selectClass}>
                    <option value="">—</option>
                    {TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
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
                disabled={isSubmitting || updateFellowship.isPending}
                className="bg-purple-700 hover:bg-purple-800"
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
