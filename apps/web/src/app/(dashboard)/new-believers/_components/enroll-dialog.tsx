'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  CustomSelect,
  Textarea,
  Label,
} from '@kairos/ui';
import { useCreateEnrollment } from '@/hooks/use-new-believers';

const enrollFormSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  teacherId: z.string().optional(),
  mentorId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type EnrollFormValues = z.infer<typeof enrollFormSchema>;

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

interface EnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  memberPool: MemberOption[];
  teacherPool: MemberOption[];
  mentorPool: MemberOption[];
  allBranchMembers: MemberOption[];
}

function toOption(m: MemberOption) {
  return { value: m.id, label: `${m.firstName} ${m.lastName}` };
}

export function EnrollDialog({
  open,
  onOpenChange,
  branchId,
  memberPool,
  teacherPool,
  mentorPool,
  allBranchMembers,
}: EnrollDialogProps) {
  const createEnrollment = useCreateEnrollment();
  const { handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EnrollFormValues>({
    resolver: zodResolver(enrollFormSchema),
    defaultValues: { memberId: '', teacherId: '', mentorId: '', notes: '' },
  });

  const memberId = watch('memberId');
  const teacherId = watch('teacherId');
  const mentorId = watch('mentorId');
  const [notes, setNotes] = useState('');

  // Reset when the dialog closes
  useEffect(() => {
    if (!open) {
      reset({ memberId: '', teacherId: '', mentorId: '', notes: '' });
      setNotes('');
    }
  }, [open, reset]);

  // Safety net: clear teacher/mentor if they collide with the chosen member.
  // The dropdowns below already filter the chosen member out, but the
  // collision can still happen if the member field changes after a teacher
  // or mentor was picked.
  useEffect(() => {
    if (memberId && teacherId === memberId) setValue('teacherId', '');
    if (memberId && mentorId === memberId) setValue('mentorId', '');
  }, [memberId, teacherId, mentorId, setValue]);

  // Filter options so the selected member can never appear as their own
  // teacher / mentor. Cross-exclude teacher and mentor too, since the
  // same person playing both roles for one student is a likely mistake.
  const teacherOptions = teacherPool
    .filter((m) => m.id !== memberId && m.id !== mentorId)
    .map(toOption);
  const mentorOptions = mentorPool
    .filter((m) => m.id !== memberId && m.id !== teacherId)
    .map(toOption);

  const selectedMentor = allBranchMembers.find((m) => m.id === mentorId);
  const mentorHasNoEmail = !!mentorId && !selectedMentor?.email;

  async function onSubmit(values: EnrollFormValues) {
    try {
      await createEnrollment.mutateAsync({
        memberId: values.memberId,
        branchId,
        teacherId: values.teacherId || undefined,
        mentorId: values.mentorId || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Member enrolled in New Believers programme');
      onOpenChange(false);
    } catch (err: unknown) {
      const apiStatus = (err as { status?: number } | null)?.status;
      const fallback = apiStatus ? `Failed to enroll member (HTTP ${apiStatus})` : 'Failed to enroll member';
      toast.error(err instanceof Error && err.message ? err.message : fallback);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enrol Member in New Believers</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="enrol-member">Member</Label>
            <CustomSelect
              id="enrol-member"
              value={memberId}
              onValueChange={(v) => setValue('memberId', v, { shouldValidate: true })}
              options={memberPool.map(toOption)}
              placeholder={memberPool.length === 0 ? 'No members available' : 'Select a member...'}
              disabled={memberPool.length === 0}
            />
            {errors.memberId && (
              <p className="mt-1 text-xs text-destructive">{errors.memberId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="enrol-teacher">Assign Teacher</Label>
            <CustomSelect
              id="enrol-teacher"
              value={teacherId ?? ''}
              onValueChange={(v) => setValue('teacherId', v)}
              options={teacherOptions}
              placeholder="Select a teacher..."
            />
          </div>

          <div>
            <Label htmlFor="enrol-mentor">Assign Mentor</Label>
            <CustomSelect
              id="enrol-mentor"
              value={mentorId ?? ''}
              onValueChange={(v) => setValue('mentorId', v)}
              options={mentorOptions}
              placeholder="Select a mentor..."
            />
            {mentorHasNoEmail && (
              <p className="mt-1 text-xs font-medium text-[#f8b537]">
                This member has no email on file — they won&apos;t receive an assignment notification.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="enrol-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="enrol-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!memberId || createEnrollment.isPending}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90 border-0"
            >
              {createEnrollment.isPending ? 'Enrolling...' : 'Enrol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
