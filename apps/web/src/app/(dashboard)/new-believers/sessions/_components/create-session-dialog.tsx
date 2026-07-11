'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Button,
  CustomSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  TimeSelect,
} from '@kairos/ui';
import { DateSelect } from '@kairos/ui';
import { useCreateSession } from '@/hooks/use-new-believers';
import type { CreateNewBelieverSessionRequest } from '@kairos/types';
import {
  combineDateAndTime,
  curriculumOptions,
  getSessionStageDef,
  todayIso,
} from './session-helpers';

const createSessionFormSchema = z.object({
  sessionStage: z.enum(['session-1', 'session-2', 'session-3', 'session-4']),
  sessionDate: z.string().min(1, 'Choose a session date'),
  sessionTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a session time'),
  location: z.string().trim().min(1, 'Enter a location').max(300, 'Location is too long'),
  teacherId: z.string().min(1, 'Choose a teacher'),
  feedback: z.string().max(2000, 'Notes are too long').optional(),
});

type CreateSessionFormValues = z.infer<typeof createSessionFormSchema>;

function defaultValues(): CreateSessionFormValues {
  return {
    sessionStage: 'session-1',
    sessionDate: todayIso(),
    sessionTime: '19:00',
    location: '',
    teacherId: '',
    feedback: '',
  };
}

export function CreateSessionDialog({
  branchId,
  teacherOptions,
  open,
  onOpenChange,
}: {
  branchId: string;
  teacherOptions: { value: string; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createSession = useCreateSession();
  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionFormSchema),
    defaultValues: defaultValues(),
  });

  const sessionDate = form.watch('sessionDate');
  const sessionStage = form.watch('sessionStage');
  const selectedStage = getSessionStageDef(sessionStage);

  async function handleSubmit(values: CreateSessionFormValues) {
    const payload: CreateNewBelieverSessionRequest = {
      branchId,
      sessionStage: values.sessionStage,
      sessionDate: combineDateAndTime(values.sessionDate, values.sessionTime),
      location: values.location.trim(),
      teacherId: values.teacherId,
      feedback: values.feedback?.trim() || undefined,
    };

    try {
      await createSession.mutateAsync(payload);
      toast.success('Session created');
      form.reset(defaultValues());
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create session');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) form.reset(defaultValues());
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
          <DialogDescription>
            Schedule a New Believers class session for this branch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Curriculum Session</label>
            <CustomSelect
              value={sessionStage}
              onValueChange={(value) =>
                form.setValue('sessionStage', value as CreateSessionFormValues['sessionStage'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={curriculumOptions}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Topic: {selectedStage?.topic ?? 'Select a session'}
            </p>
            {form.formState.errors.sessionStage && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.sessionStage.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <DateSelect
              value={sessionDate}
              onChange={(value) =>
                form.setValue('sessionDate', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {form.formState.errors.sessionDate && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.sessionDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Time</label>
            <TimeSelect
              value={form.watch('sessionTime')}
              onValueChange={(value) =>
                form.setValue('sessionTime', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              allowEmpty={false}
            />
            {form.formState.errors.sessionTime && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.sessionTime.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="session-location" className="mb-1 block text-sm font-medium">
              Location
            </label>
            <Input
              id="session-location"
              placeholder="Main auditorium"
              {...form.register('location')}
            />
            {form.formState.errors.location && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Teacher</label>
            <CustomSelect
              value={form.watch('teacherId')}
              onValueChange={(value) =>
                form.setValue('teacherId', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={teacherOptions}
              placeholder="Assign teacher"
            />
            {form.formState.errors.teacherId && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.teacherId.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="session-feedback" className="mb-1 block text-sm font-medium">
              Session Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="session-feedback"
              rows={3}
              placeholder="Class-wide observations or follow-up themes"
              {...form.register('feedback')}
            />
            {form.formState.errors.feedback && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {form.formState.errors.feedback.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSession.isPending}>
              {createSession.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
