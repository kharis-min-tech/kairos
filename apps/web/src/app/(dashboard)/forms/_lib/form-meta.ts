import { FORM_SUBMISSION_STATUS_LABEL, FormSubmissionStatus } from '@kairos/types';

const FORM_SUBMISSION_STATUS_VALUES = Object.values(
  FormSubmissionStatus,
) as FormSubmissionStatus[];

/*
 * Form titles, descriptions, the ordered type list and `isFormType` used to
 * live here. They now live beside the form definitions in `@kairos/types`,
 * which is the only place both web and mobile can read — see FORM_DEFINITIONS.
 * What is left here is genuinely web-only presentation.
 */

/*
 * The per-status colour map that used to live here is gone. Four tinted pills
 * competing at equal weight told you nothing; `StatusText` colours the one
 * value still waiting on somebody. The labels come from @kairos/types so web
 * and mobile cannot drift.
 */
export const STATUS_OPTIONS: { value: FormSubmissionStatus; label: string }[] =
  FORM_SUBMISSION_STATUS_VALUES.map((value) => ({
    value,
    label: FORM_SUBMISSION_STATUS_LABEL[value],
  }));

/** Best-effort display name from a submission payload. */
export function subjectName(payload: Record<string, unknown>): string {
  const first = payload.firstName as string | undefined;
  const last = payload.lastName as string | undefined;
  if (first || last) return `${first ?? ''} ${last ?? ''}`.trim();
  const baby = payload.babyFullName as string | undefined;
  if (baby) return baby;
  return '—';
}
