'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useCreateCohort } from '@/hooks/use-membership';
import { CHURCH_SCOPE } from '@kairos/types';
import { CohortForm } from '../_components/cohort-form';

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
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) router.replace('/membership');
  }, [isAdmin, router]);

  if (!isAdmin) return null;

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

      <CohortForm
        submitLabel="Create cohort"
        submitPendingLabel="Creating…"
        submitting={createCohort.isPending}
        serverError={serverError}
        onCancel={() => router.push('/membership')}
        onSubmit={(payload) => {
          setServerError(null);
          createCohort.mutate(payload, {
            onSuccess: (cohort) => {
              toast.success(`Created ${cohort.name}.`);
              router.push(`/membership/${cohort.id}`);
            },
            onError: (e: unknown) => {
              const msg = e instanceof Error ? e.message : 'Could not create the cohort.';
              setServerError(msg);
              toast.error(msg);
            },
          });
        }}
      />
    </div>
  );
}
