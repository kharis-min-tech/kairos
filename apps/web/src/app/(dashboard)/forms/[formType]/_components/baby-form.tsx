'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, Textarea } from '@kairos/ui';
import { DateSelect } from '@kairos/ui';
import type { FormMemberSearchResult } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitForm } from '@/hooks/use-forms';
import { FORM_META } from '../../_lib/form-meta';
import { FormShell } from './form-shell';
import { FieldError, FieldLabel, RadioRow } from './field';
import { MemberSearchLink } from './member-search-link';
import { DisclaimerConsent, CONSENT_POLICY_VERSION } from './disclaimer-consent';
import { BranchPicker } from './branch-picker';

const baseSchema = z.object({
  babyFullName: z.string().trim().min(1, 'Baby’s full name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female']).optional(),
  fathersName: z.string().trim().min(1, 'Father’s name is required'),
  mothersName: z.string().trim().min(1, 'Mother’s name is required'),
  parentContactPhone: z.string().trim().min(1, 'Parent contact phone is required'),
  parentContactEmail: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  additionalNotes: z.string().optional(),
});

const GENDER = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];
const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

export function BabyForm({ mode }: { mode: 'baby_naming' | 'baby_dedication' }) {
  const meta = FORM_META[mode];
  const isDedication = mode === 'baby_dedication';
  const user = useAuthStore((s) => s.user);
  const submitForm = useSubmitForm();

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  const [consentAck, setConsentAck] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();
  const [form, setForm] = useState({
    babyFullName: '',
    dateOfBirth: '',
    gender: '' as string,
    fathersName: '',
    mothersName: '',
    parentsAreMembers: '' as string,
    parentContactPhone: '',
    parentContactEmail: '',
    preferredDate: '',
    additionalNotes: '',
  });

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => {
      const next = { ...p };
      delete next[field as string];
      return next;
    });
  }

  function selectParent(r: FormMemberSearchResult) {
    setSubjectMemberId(r.id);
    setForm((p) => ({ ...p, parentContactPhone: r.phone ?? '' }));
    setErrors((p) => {
      const next = { ...p };
      delete next.parentContactPhone;
      return next;
    });
  }

  function clearParent() {
    setSubjectMemberId(undefined);
    setForm((p) => ({ ...p, parentContactPhone: '', parentContactEmail: '' }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = baseSchema.safeParse({
      babyFullName: form.babyFullName,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender || undefined,
      fathersName: form.fathersName,
      mothersName: form.mothersName,
      parentContactPhone: form.parentContactPhone,
      parentContactEmail: form.parentContactEmail,
      additionalNotes: form.additionalNotes,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const payload: Record<string, unknown> = {
      babyFullName: form.babyFullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender || undefined,
      fathersName: form.fathersName.trim(),
      mothersName: form.mothersName.trim(),
      parentContactPhone: form.parentContactPhone.trim(),
      parentContactEmail: form.parentContactEmail.trim() || undefined,
      additionalNotes: form.additionalNotes.trim() || undefined,
    };
    if (isDedication) {
      if (form.parentsAreMembers) payload.parentsAreMembers = form.parentsAreMembers === 'Yes';
      if (form.preferredDate) payload.preferredDedicationDate = form.preferredDate;
    } else if (form.preferredDate) {
      payload.preferredCeremonyDate = form.preferredDate;
    }

    try {
      await submitForm.mutateAsync({
        formType: mode,
        data: {
          subjectMemberId,
          branchId: selectedBranchId,
          payload,
          consentGivenAt: new Date().toISOString(),
          consentPolicyVersion: CONSENT_POLICY_VERSION,
        },
      });
      setSubmitted(true);
    } catch {
      // surfaced below
    }
  }

  function reset() {
    setSubmitted(false);
    setErrors({});
    setSubjectMemberId(undefined);
    setConsentAck(false);
    setSelectedBranchId(undefined);
    setForm({
      babyFullName: '',
      dateOfBirth: '',
      gender: '',
      fathersName: '',
      mothersName: '',
      parentsAreMembers: '',
      parentContactPhone: '',
      parentContactEmail: '',
      preferredDate: '',
      additionalNotes: '',
    });
  }

  return (
    <FormShell
      title={meta.title}
      description={meta.description}
      branchName={(user as { branchName?: string | null })?.branchName}
      submitted={submitted}
      successTitle={isDedication ? 'Dedication request submitted' : 'Naming request submitted'}
      successMessage="Your request has been recorded. A leader will follow up to confirm a date."
      onSubmitAnother={reset}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <BranchPicker value={selectedBranchId} onChange={setSelectedBranchId} />

        <MemberSearchLink
          value={subjectMemberId}
          onSelect={selectParent}
          onClear={clearParent}
          label="Find the parent/guardian"
          helpText="Search by name or phone to link an existing member. Leave blank otherwise."
          linkedNote="Linked to an existing member — they’ll be recorded as the parent/guardian."
        />

        <div className="space-y-2">
          <FieldLabel htmlFor="babyFullName" required>
            Baby’s full name
          </FieldLabel>
          <Input
            id="babyFullName"
            value={form.babyFullName}
            onChange={(e) => set('babyFullName', e.target.value)}
          />
          <FieldError message={errors.babyFullName} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel required>Date of birth</FieldLabel>
            <DateSelect value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
            <FieldError message={errors.dateOfBirth} />
          </div>
          <div className="space-y-2">
            <FieldLabel>Gender</FieldLabel>
            <RadioRow name="Gender" value={form.gender} options={GENDER} onChange={(v) => set('gender', v)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="fathersName" required>
              Father’s name
            </FieldLabel>
            <Input id="fathersName" value={form.fathersName} onChange={(e) => set('fathersName', e.target.value)} />
            <FieldError message={errors.fathersName} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="mothersName" required>
              Mother’s name
            </FieldLabel>
            <Input id="mothersName" value={form.mothersName} onChange={(e) => set('mothersName', e.target.value)} />
            <FieldError message={errors.mothersName} />
          </div>
        </div>

        {isDedication ? (
          <div className="space-y-2">
            <FieldLabel>Are parents members?</FieldLabel>
            <RadioRow
              name="Are parents members?"
              value={form.parentsAreMembers}
              options={YES_NO}
              onChange={(v) => set('parentsAreMembers', v)}
            />
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="parentContactPhone" required>
              Parent contact phone
            </FieldLabel>
            <Input
              id="parentContactPhone"
              type="tel"
              value={form.parentContactPhone}
              onChange={(e) => set('parentContactPhone', e.target.value)}
            />
            <FieldError message={errors.parentContactPhone} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="parentContactEmail">Parent contact email</FieldLabel>
            <Input
              id="parentContactEmail"
              type="email"
              value={form.parentContactEmail}
              onChange={(e) => set('parentContactEmail', e.target.value)}
            />
            <FieldError message={errors.parentContactEmail} />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel>{isDedication ? 'Preferred dedication date' : 'Preferred ceremony date'}</FieldLabel>
          <DateSelect value={form.preferredDate} onChange={(v) => set('preferredDate', v)} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="additionalNotes">Additional notes</FieldLabel>
          <Textarea
            id="additionalNotes"
            rows={4}
            value={form.additionalNotes}
            onChange={(e) => set('additionalNotes', e.target.value)}
          />
        </div>

        <DisclaimerConsent checked={consentAck} onChange={setConsentAck} />

        {submitForm.isError ? (
          <p className="text-sm text-destructive">
            {submitForm.error instanceof Error
              ? submitForm.error.message
              : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={submitForm.isPending || !consentAck}
          className="w-full bg-[#5D3FD3] hover:bg-[#451ebb]"
        >
          {submitForm.isPending ? 'Submitting…' : 'Submit'}
        </Button>
      </form>
    </FormShell>
  );
}
