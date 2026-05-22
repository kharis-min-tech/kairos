import type { FormType, FormSubmissionStatus } from '@kairos/types';

export const FORM_TYPES: FormType[] = [
  'altar_call',
  'baptism',
  'testimony',
  'baby_naming',
  'baby_dedication',
];

export function isFormType(value: string): value is FormType {
  return (FORM_TYPES as string[]).includes(value);
}

export interface FormMetaEntry {
  type: FormType;
  title: string;
  description: string;
}

export const FORM_META: Record<FormType, FormMetaEntry> = {
  altar_call: {
    type: 'altar_call',
    title: 'New Believers Class',
    description: 'Register someone who responded to an altar call into the New Believers programme.',
  },
  baptism: {
    type: 'baptism',
    title: 'Baptism',
    description: 'Capture a request to be baptised.',
  },
  testimony: {
    type: 'testimony',
    title: 'Testimony',
    description: 'Share a testimony of what God has done.',
  },
  baby_naming: {
    type: 'baby_naming',
    title: 'Baby Naming',
    description: 'Request a baby naming ceremony.',
  },
  baby_dedication: {
    type: 'baby_dedication',
    title: 'Baby Dedication',
    description: 'Request a baby dedication.',
  },
};

export const TESTIMONY_CATEGORIES = [
  'Business',
  'Career/Job',
  'Deliverance',
  'Education',
  'Financial',
  'Health/Healing',
  'Marriage/Family',
  'Salvation',
  'Unusual Favour',
  'Other',
] as const;

// Status → label + Modern Sanctuary colour tokens.
export const STATUS_META: Record<
  FormSubmissionStatus,
  { label: string; className: string }
> = {
  new: { label: 'New', className: 'bg-[#5D3FD3]/10 text-[#5D3FD3] border border-[#5D3FD3]/30' },
  reviewed: { label: 'Reviewed', className: 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/30' },
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
