import type { FormSubmissionStatus } from '@kairos/types';

/*
 * Form titles, descriptions, the ordered type list and `isFormType` used to
 * live here. They now live beside the form definitions in `@kairos/types`,
 * which is the only place both web and mobile can read — see FORM_DEFINITIONS.
 * What is left here is genuinely web-only presentation.
 */

// Status → label + Modern Sanctuary colour tokens.
export const STATUS_META: Record<
  FormSubmissionStatus,
  { label: string; className: string }
> = {
  new: { label: 'New', className: 'bg-[#5D3FD3]/10 text-[#5D3FD3] border border-[#5D3FD3]/30' },
  reviewed: { label: 'Reviewed', className: 'bg-[#f8b537]/10 text-[#9a6b04] dark:text-[#f8b537] border border-[#f8b537]/30' },
  converted: { label: 'Converted', className: 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30' },
  dismissed: { label: 'Dismissed', className: 'bg-slate-400/10 text-slate-500 border border-slate-400/30' },
};

export const STATUS_OPTIONS: { value: FormSubmissionStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'converted', label: 'Converted' },
  { value: 'dismissed', label: 'Dismissed' },
];

/** Best-effort display name from a submission payload. */
export function subjectName(payload: Record<string, unknown>): string {
  const first = payload.firstName as string | undefined;
  const last = payload.lastName as string | undefined;
  if (first || last) return `${first ?? ''} ${last ?? ''}`.trim();
  const baby = payload.babyFullName as string | undefined;
  if (baby) return baby;
  return '—';
}
