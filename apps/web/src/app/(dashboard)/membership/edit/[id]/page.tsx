'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, Button } from '@kairos/ui';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, Archive } from 'lucide-react';
import { useCapabilities } from '@/hooks/use-capabilities';
import {
  useMembershipCohort,
  useUpdateCohort,
  useArchiveCohort,
} from '@/hooks/use-membership';
import { useConfirm } from '@/components/confirm-dialog';
import { CHURCH_SCOPE } from '@kairos/types';
import { CohortForm } from '../../_components/cohort-form';

/**
 * Edit an existing cohort. Mirrors the mobile edit flow — same fields,
 * same validation, plus a destructive archive affordance in the footer.
 *
 * Status is editable here (planned → active → completed), but marking the
 * cohort complete does NOT grant the Members in it — graduation is still
 * the explicit action on the detail page, because graduating per-enrolment
 * is where the real Member confirmation happens.
 */
export default function EditCohortPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cohortId = params?.id ?? '';
  const caps = useCapabilities();
  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  const cohort = useMembershipCohort(cohortId);
  const update = useUpdateCohort(cohortId);
  const archive = useArchiveCohort();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) router.replace('/membership');
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  if (cohort.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading cohort…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cohort.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Cohort not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {confirmDialog}

      <div>
        <Link
          href={`/membership/${cohortId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to cohort
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <GraduationCap className="size-5 text-[#5D3FD3]" />
          Edit {cohort.data.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes save immediately. Pass marks apply on the next session register you record.
        </p>
      </div>

      <CohortForm
        initial={{
          name: cohort.data.name,
          description: cohort.data.description ?? '',
          startDate: cohort.data.startDate ?? '',
          graduationDate: cohort.data.graduationDate ?? '',
          finalTestDeadline: cohort.data.finalTestDeadline ?? '',
          status: cohort.data.status,
          enrolmentOpen: cohort.data.enrolmentOpen,
          homeworkPassMark: cohort.data.homeworkPassMark,
          quizPassMark: cohort.data.quizPassMark,
          finalTestPassMark: cohort.data.finalTestPassMark,
          notes: cohort.data.notes ?? '',
        }}
        showStatus
        submitLabel="Save changes"
        submitPendingLabel="Saving…"
        submitting={update.isPending}
        serverError={serverError}
        onCancel={() => router.push(`/membership/${cohortId}`)}
        onSubmit={(payload) => {
          setServerError(null);
          update.mutate(payload, {
            onSuccess: () => {
              toast.success('Cohort updated.');
              router.push(`/membership/${cohortId}`);
            },
            onError: (e: unknown) => {
              const msg = e instanceof Error ? e.message : 'Could not save the cohort.';
              setServerError(msg);
              toast.error(msg);
            },
          });
        }}
        footer={
          <div className="mt-6 border-t border-destructive/20 pt-5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-destructive">
              Danger zone
            </h3>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Archive this cohort</p>
                <p className="text-xs text-muted-foreground">
                  Hides it from the lists. Enrolments stay in the DB for audit. Not reversible from the UI.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                disabled={archive.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Archive ${cohort.data!.name}?`,
                    description:
                      'This hides it from every active list. The row stays in the database.',
                    variant: 'destructive',
                    confirmLabel: 'Archive',
                  });
                  if (!ok) return;
                  archive.mutate(cohortId, {
                    onSuccess: () => {
                      toast.success('Cohort archived.');
                      router.push('/membership');
                    },
                    onError: (e: unknown) =>
                      toast.error(e instanceof Error ? e.message : 'Could not archive.'),
                  });
                }}
              >
                <Archive className="mr-1 size-4" />
                {archive.isPending ? 'Archiving…' : 'Archive cohort'}
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
