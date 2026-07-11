'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, X } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  CustomSelect,
  NumberStepper,
  TimeSelect,
} from '@kairos/ui';
import { DateSelect } from '@kairos/ui';
import { ServiceType } from '@kairos/types';
import type { CreateServiceRequest, FormMemberSearchResult } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useFormMemberSearch } from '@/hooks/use-forms';
import { useBranches } from '@/hooks/use-branches';

const serviceSchema = z
  .object({
    serviceBranchId: z.string().optional(),
    serviceDate: z.string().min(1, 'Pick a service date'),
    serviceTime: z.string().min(1, 'Pick a service time'),
    serviceType: z.enum([ServiceType.Sunday, ServiceType.Midweek, ServiceType.Special]),
    serviceTitle: z.string().optional(),
    topic: z.string().optional(),
    preacherId: z.string().optional(),
    expectedAttendance: z.number().int().min(0).optional(),
  })
  .refine(
    (v) => v.serviceType !== ServiceType.Special || (v.serviceTitle?.trim().length ?? 0) > 0,
    { path: ['serviceTitle'], message: 'A special service needs a title' },
  );

export type ServiceFormValues = z.infer<typeof serviceSchema>;

const TYPE_OPTIONS = [
  { value: ServiceType.Sunday, label: 'Sunday Service' },
  { value: ServiceType.Midweek, label: 'Midweek Service' },
  { value: ServiceType.Special, label: 'Special Service' },
];

interface CreateServiceFormProps {
  /** Returns the created service id so the page can route to check-in. */
  onSubmit: (data: CreateServiceRequest) => Promise<{ id: string }>;
  submitError?: string | null;
  /** admin/pastor may target any branch; shows the branch picker. */
  canPickBranch: boolean;
}

export function CreateServiceForm({ onSubmit, submitError, canPickBranch }: CreateServiceFormProps) {
  const user = useAuthStore((s) => s.user);
  const [preacherName, setPreacherName] = useState('');
  const [preacherSearch, setPreacherSearch] = useState('');
  const [preacherOpen, setPreacherOpen] = useState(false);

  // Branch picker (admin/pastor only). Leaders are pinned to their own branch
  // by the API, so they don't see it.
  const { data: branches } = useBranches();
  const branchOptions = (branches ?? []).map((b) => ({ value: b.id, label: b.branchName }));

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      serviceType: ServiceType.Sunday,
      serviceTime: '09:00',
      serviceBranchId: user?.homeBranchId,
    },
  });

  const serviceType = watch('serviceType');
  const preacherId = watch('preacherId');
  const serviceBranchId = watch('serviceBranchId');

  // Search the preacher within the service's target branch (so an admin
  // creating a service for another branch finds that branch's members).
  const preacherBranchId = canPickBranch ? serviceBranchId : user?.homeBranchId;
  const { data: preacherResults, isFetching: searchingPreacher } = useFormMemberSearch(
    { q: preacherSearch, branchId: preacherBranchId },
    { enabled: preacherOpen && preacherSearch.trim().length >= 2 },
  );

  function pickPreacher(r: FormMemberSearchResult) {
    setValue('preacherId', r.id);
    setPreacherName(`${r.firstName} ${r.lastName}`);
    setPreacherSearch(`${r.firstName} ${r.lastName}`);
    setPreacherOpen(false);
  }

  function clearPreacher() {
    setValue('preacherId', undefined);
    setPreacherName('');
    setPreacherSearch('');
    setPreacherOpen(false);
  }

  const submit = handleSubmit(async (values) => {
    // Combine the chosen date (YYYY-MM-DD) + time (HH:MM) into an ISO datetime.
    const iso = new Date(`${values.serviceDate}T${values.serviceTime}:00`).toISOString();
    const payload: CreateServiceRequest = {
      serviceDate: iso,
      serviceType: values.serviceType,
      serviceTitle: values.serviceTitle?.trim() || undefined,
      topic: values.topic?.trim() || undefined,
      preacherId: values.preacherId || undefined,
      expectedAttendance: values.expectedAttendance,
    };
    // admin/pastor send the chosen branch; everyone else is pinned server-side.
    if (canPickBranch) payload.branchId = values.serviceBranchId || user?.homeBranchId;
    await onSubmit(payload);
  });

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardContent className="space-y-5 py-6">
          {/* Branch picker — admin/pastor only */}
          {canPickBranch && (
            <div className="space-y-2">
              <Label htmlFor="serviceBranchId">Branch</Label>
              <Controller
                control={control}
                name="serviceBranchId"
                render={({ field }) => (
                  <CustomSelect
                    id="serviceBranchId"
                    value={field.value ?? ''}
                    onValueChange={(v) => {
                      field.onChange(v);
                      // Picked branch changed — drop any preacher chosen from the old branch.
                      if (preacherId) clearPreacher();
                    }}
                    options={branchOptions}
                    placeholder="Select a branch"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Record this service for a branch you oversee.
              </p>
            </div>
          )}

          {/* Date + time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceDate">Service date</Label>
              <Controller
                control={control}
                name="serviceDate"
                render={({ field }) => (
                  <DateSelect value={field.value ?? ''} onChange={field.onChange} placeholder="Select date" />
                )}
              />
              {errors.serviceDate && (
                <p className="text-xs font-medium text-destructive">{errors.serviceDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceTime">Service time</Label>
              <Controller
                control={control}
                name="serviceTime"
                render={({ field }) => (
                  <TimeSelect value={field.value ?? ''} onValueChange={field.onChange} allowEmpty={false} />
                )}
              />
              {errors.serviceTime && (
                <p className="text-xs font-medium text-destructive">{errors.serviceTime.message}</p>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service type</Label>
            <Controller
              control={control}
              name="serviceType"
              render={({ field }) => (
                <CustomSelect
                  id="serviceType"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={TYPE_OPTIONS}
                />
              )}
            />
          </div>

          {/* Title — always shown, required when Special */}
          <div className="space-y-2">
            <Label htmlFor="serviceTitle">
              Service title{serviceType === ServiceType.Special ? '' : ' (optional)'}
            </Label>
            <Input id="serviceTitle" {...register('serviceTitle')} placeholder="e.g. Watchnight" />
            <p className="text-xs text-muted-foreground">
              Name the special service, e.g. Watchnight. Optional for Sunday and Midweek.
            </p>
            {errors.serviceTitle && (
              <p className="text-xs font-medium text-destructive">{errors.serviceTitle.message}</p>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Textarea id="topic" {...register('topic')} placeholder="Sermon topic or theme" rows={2} />
          </div>

          {/* Preacher typeahead */}
          <div className="space-y-2">
            <Label htmlFor="preacher-search">Preacher (optional)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="preacher-search"
                className="pl-9 pr-9"
                placeholder="Search a member by name…"
                value={preacherSearch}
                onChange={(e) => {
                  setPreacherSearch(e.target.value);
                  setPreacherOpen(true);
                  if (preacherId) clearPreacher();
                }}
                onFocus={() => setPreacherOpen(true)}
              />
              {(preacherSearch || preacherId) && (
                <button
                  type="button"
                  aria-label="Clear preacher"
                  onClick={clearPreacher}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {preacherId && (
              <p className="text-xs font-medium text-[#16A34A]">Preacher set to {preacherName}.</p>
            )}
            {preacherOpen && preacherSearch.trim().length >= 2 && !preacherId && (
              <div className="rounded-lg border border-input/15">
                {searchingPreacher ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                ) : preacherResults && preacherResults.length > 0 ? (
                  <ul>
                    {preacherResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => pickPreacher(r)}
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-foreground/5"
                        >
                          <span className="font-medium text-foreground">
                            {r.firstName} {r.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">{r.phone ?? 'No phone'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matches.</p>
                )}
              </div>
            )}
          </div>

          {/* Expected attendance */}
          <div className="space-y-2">
            <Label htmlFor="expectedAttendance">Expected attendance (optional)</Label>
            <Controller
              control={control}
              name="expectedAttendance"
              render={({ field }) => (
                <NumberStepper
                  value={field.value ?? 0}
                  onValueChange={field.onChange}
                  min={0}
                  step={10}
                  ariaLabel="Expected attendance"
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{submitError}</div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create service'}
        </Button>
      </div>
    </form>
  );
}
