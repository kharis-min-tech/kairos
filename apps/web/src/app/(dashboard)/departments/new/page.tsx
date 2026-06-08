'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateDepartment, useGlobalDepartments } from '@/hooks/use-departments';
import { useBranches } from '@/hooks/use-branches';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/lib/auth-store';
import {
  Button,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CustomSelect,
} from '@kairos/ui';

const schema = z
  .object({
    departmentId: z.string().uuid('Select a ministry'),
    branchId: z.string().uuid('Select a branch'),
    leadMemberId: z.string().uuid('Pick a lead member'),
    deputyMemberId: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((d) => !d.deputyMemberId || d.deputyMemberId !== d.leadMemberId, {
    message: 'Deputy must differ from lead',
    path: ['deputyMemberId'],
  });

type FormValues = z.infer<typeof schema>;

export default function NewDepartmentPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin';
  const canCreate = activeRole === 'admin' || activeRole === 'pastor';

  // Mirrors list-page persona gating: only admins + pastors can create departments.
  useEffect(() => {
    if (user !== null && !canCreate) {
      router.replace('/departments');
    }
  }, [user, canCreate, router]);

  const createDepartment = useCreateDepartment();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: catalogue, isLoading: catalogueLoading } = useGlobalDepartments();

  const defaultBranchId = !isAdmin ? user?.homeBranchId ?? '' : '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { branchId: defaultBranchId },
  });

  const selectedBranchId = watch('branchId') || defaultBranchId;
  const { data: branchMembersData } = useMembers(
    selectedBranchId ? { branchId: selectedBranchId, limit: 200 } : undefined,
  );
  const branchMembers = branchMembersData?.data ?? [];

  const onSubmit = async (data: FormValues) => {
    try {
      await createDepartment.mutateAsync({
        branchId: data.branchId,
        departmentId: data.departmentId,
        leadMemberId: data.leadMemberId,
        deputyMemberId: data.deputyMemberId || null,
        description: data.description || null,
      });
      router.push('/departments');
    } catch {
      // surfaced via createDepartment.error
    }
  };

  if (user !== null && !canCreate) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between pb-6">
        <div>
          <Link
            href="/departments"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Departments
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">New Department</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Instantiate a ministry team for a branch
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Details</CardTitle>
          <CardDescription>Pick a ministry and assign its lead</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {createDepartment.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {createDepartment.error instanceof Error
                  ? createDepartment.error.message
                  : 'Failed to create department. Please try again.'}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="departmentId">Ministry *</Label>
              <CustomSelect
                id="departmentId"
                value={watch('departmentId') ?? ''}
                onValueChange={(v) => setValue('departmentId', v)}
                placeholder={catalogueLoading ? 'Loading ministries...' : 'Select a ministry...'}
                options={(catalogue ?? [])
                  .filter((d) => d.isActive)
                  .map((d) => ({ value: d.id, label: d.departmentName }))}
              />
              {errors.departmentId && (
                <p className="text-sm text-destructive">{errors.departmentId.message}</p>
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
                  options={(branches ?? []).map((b) => ({ value: b.id, label: b.branchName }))}
                />
                {errors.branchId && (
                  <p className="text-sm text-destructive">{errors.branchId.message}</p>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leadMemberId">Lead *</Label>
                <CustomSelect
                  id="leadMemberId"
                  value={watch('leadMemberId') ?? ''}
                  onValueChange={(v) => setValue('leadMemberId', v)}
                  placeholder="Select lead..."
                  options={branchMembers.map((m) => ({
                    value: m.id,
                    label: `${m.firstName} ${m.lastName}`,
                  }))}
                />
                {errors.leadMemberId && (
                  <p className="text-sm text-destructive">{errors.leadMemberId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deputyMemberId">Deputy</Label>
                <CustomSelect
                  id="deputyMemberId"
                  value={watch('deputyMemberId') ?? ''}
                  onValueChange={(v) => setValue('deputyMemberId', v)}
                  placeholder="Select deputy..."
                  options={branchMembers.map((m) => ({
                    value: m.id,
                    label: `${m.firstName} ${m.lastName}`,
                  }))}
                />
                {errors.deputyMemberId && (
                  <p className="text-sm text-destructive">{errors.deputyMemberId.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                placeholder="Brief description of this ministry's mission..."
                className="flex w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/departments" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
