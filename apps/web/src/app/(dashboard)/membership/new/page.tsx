'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Input, Label, Textarea } from '@kairos/ui';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { DateSelect } from '@/components/date-select';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useCreateCohort } from '@/hooks/use-membership';
import { CHURCH_SCOPE } from '@kairos/types';

/**
 * Create a membership cohort.
 *
 * Gated on `membership:admin` at CHURCH scope, not on `systemRole === 'admin'`:
 * a cohort is church-wide, so no branch-scoped grant can authorise creating
 * one, but the people who actually run the class hold no platform authority.
 */
export default function NewCohortPage() {
  const router = useRouter();
  const caps = useCapabilities();
  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  const createCohort = useCreateCohort();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [graduationDate, setGraduationDate] = useState('');
  const [finalTestDeadline, setFinalTestDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) router.replace('/membership');
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  function validate() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next['name'] = 'Give the cohort a name, e.g. "Autumn 2026".';
    if (!startDate) next['startDate'] = 'A start date is required.';
    if (graduationDate && startDate && graduationDate < startDate) {
      next['graduationDate'] = 'The induction cannot be before the start date.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    createCohort.mutate(
      {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        startDate,
        ...(graduationDate ? { graduationDate } : {}),
        ...(finalTestDeadline ? { finalTestDeadline } : {}),
      },
      {
        onSuccess: (cohort) => {
          toast.success(`Created ${cohort.name}.`);
          router.push(`/membership/${cohort.id}`);
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : 'Could not create the cohort.'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/membership"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All cohorts
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <GraduationCap className="size-5 text-[#5D3FD3]" />
          New membership cohort
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cohorts run church-wide. People join the interest pool, and you admit them
          into a cohort from there.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="grid gap-1.5">
            <Label htmlFor="cohort-name">Cohort name</Label>
            <Input
              id="cohort-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Autumn 2026"
            />
            {errors['name'] ? (
              <p className="text-xs text-destructive">{errors['name']}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cohort-description">Description (optional)</Label>
            <Textarea
              id="cohort-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Start date</Label>
              <DateSelect value={startDate} onChange={setStartDate} />
              {errors['startDate'] ? (
                <p className="text-xs text-destructive">{errors['startDate']}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>Induction ceremony</Label>
              <DateSelect value={graduationDate} onChange={setGraduationDate} />
              {errors['graduationDate'] ? (
                <p className="text-xs text-destructive">{errors['graduationDate']}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>Final test deadline</Label>
              <DateSelect value={finalTestDeadline} onChange={setFinalTestDeadline} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Pass marks default to 50% for homework and quizzes and for the final test. You can
            change them once the cohort exists.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push('/membership')}>
              Cancel
            </Button>
            <Button
              className="bg-[#5D3FD3] hover:bg-[#451ebb]"
              disabled={createCohort.isPending}
              onClick={submit}
            >
              {createCohort.isPending ? 'Creating…' : 'Create cohort'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
