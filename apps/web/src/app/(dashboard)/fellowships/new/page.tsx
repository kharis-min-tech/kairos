'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateFellowship } from '@/hooks/use-fellowships';
import { useBranches } from '@/hooks/use-branches';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { FellowshipType } from '@kairos/types';

const FELLOWSHIP_TYPE_LABELS: Record<string, string> = {
  [FellowshipType.KGroups]: 'Cell Groups (K-Groups)',
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
  meetingFrequency: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewFellowshipPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'admin';

  const createFellowship = useCreateFellowship();
  const { data: branches, isLoading: branchesLoading } = useBranches();

  const defaultBranchId = !isAdmin ? (user?.homeBranchId ?? '') : '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { branchId: defaultBranchId },
  });

  const onSubmit = async (data: FormValues) => {
    let meetingSchedule: string | undefined;
    if (data.meetingFrequency && data.meetingDay) {
      meetingSchedule = `${data.meetingFrequency} on ${data.meetingDay}`;
      if (data.meetingTime) meetingSchedule += ` at ${data.meetingTime}`;
    }

    await createFellowship.mutateAsync({
      fellowshipName: data.fellowshipName,
      branchId: data.branchId,
      fellowshipType: data.fellowshipType,
      description: data.description || undefined,
      meetingSchedule,
    });
    router.push('/fellowships');
  };

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <Link
          href="/fellowships"
          className="inline-flex items-center gap-1 text-sm text-purple-200 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Fellowships
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New Fellowship</h1>
        <p className="mt-0.5 text-sm text-purple-200">Create a new fellowship group</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fellowship Details</CardTitle>
          <CardDescription>Fill in the details for the new fellowship group</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {createFellowship.error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {createFellowship.error instanceof Error
                  ? createFellowship.error.message
                  : 'Failed to create fellowship. Please try again.'}
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
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
                {errors.branchId && (
                  <p className="text-sm text-destructive">{errors.branchId.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Meeting Schedule</Label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  {...register('meetingFrequency')}
                  className={selectClass}
                >
                  <option value="">Frequency...</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  {...register('meetingDay')}
                  className={selectClass}
                >
                  <option value="">Day...</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  {...register('meetingTime')}
                  className={selectClass}
                >
                  <option value="">Time...</option>
                  {TIMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                placeholder="Brief description of this fellowship group..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/fellowships" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Fellowship'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
