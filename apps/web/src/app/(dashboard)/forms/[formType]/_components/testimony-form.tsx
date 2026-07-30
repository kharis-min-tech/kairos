'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Checkbox, Input, CustomSelect, Textarea } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import type { FormMemberSearchResult } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitForm } from '@/hooks/use-forms';
import { FORM_META, TESTIMONY_CATEGORIES } from '../../_lib/form-meta';
import { FormShell } from './form-shell';
import { FieldError, FieldLabel, RadioRow } from './field';
import { MemberSearchLink } from './member-search-link';
import { DisclaimerConsent, CONSENT_POLICY_VERSION } from './disclaimer-consent';
import { BranchPicker } from './branch-picker';

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  todaysDate: z.string().min(1, 'Today’s date is required'),
  dateOfTestimony: z.string().min(1, 'Date of testimony is required'),
  category: z.enum(TESTIMONY_CATEGORIES, {
    errorMap: () => ({ message: 'Please choose a category' }),
  }),
  details: z.string().trim().min(1, 'Testimony details are required'),
  shareAnonymously: z.boolean(),
  happyToShareSunday: z.boolean(),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge before submitting' }),
  }),
});

const today = () => new Date().toISOString().slice(0, 10);
const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

export function TestimonyForm() {
  const meta = FORM_META.testimony;
  const user = useAuthStore((s) => s.user);
  const submitForm = useSubmitForm();

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  const [consentAck, setConsentAck] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    todaysDate: today(),
    dateOfTestimony: '',
    category: '' as string,
    details: '',
    shareAnonymously: '' as string,
    happyToShareSunday: '' as string,
    acknowledged: false,
  });

  const isAnonymous = form.shareAnonymously === 'Yes';

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => {
      const next = { ...p };
      delete next[field as string];
      return next;
    });
  }

  function selectExisting(r: FormMemberSearchResult) {
    setSubjectMemberId(r.id);
    setForm((p) => ({
      ...p,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone ?? '',
    }));
    setErrors((p) => {
      const next = { ...p };
      delete next.firstName;
      delete next.lastName;
      delete next.phone;
      return next;
    });
  }

  function clearExisting() {
    setSubjectMemberId(undefined);
    setForm((p) => ({ ...p, firstName: '', lastName: '', phone: '' }));
  }

  function setShareAnonymously(value: string) {
    // The API skips member matching for anonymous testimonies — drop any link.
    if (value === 'Yes' && subjectMemberId) setSubjectMemberId(undefined);
    set('shareAnonymously', value);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      todaysDate: form.todaysDate,
      dateOfTestimony: form.dateOfTestimony,
      category: form.category,
      details: form.details,
      shareAnonymously: form.shareAnonymously === 'Yes',
      happyToShareSunday: form.happyToShareSunday === 'Yes',
      acknowledged: form.acknowledged,
    };
    const fieldErrors: Record<string, string> = {};
    if (!form.shareAnonymously) fieldErrors.shareAnonymously = 'Please choose an option';
    if (!form.happyToShareSunday) fieldErrors.happyToShareSunday = 'Please choose an option';

    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    try {
      await submitForm.mutateAsync({
        formType: 'testimony',
        // An anonymous testimony is never linked, even if a person was picked first.
        data: {
          subjectMemberId: isAnonymous ? undefined : subjectMemberId,
          branchId: selectedBranchId,
          payload: candidate,
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
      firstName: '',
      lastName: '',
      phone: '',
      todaysDate: today(),
      dateOfTestimony: '',
      category: '',
      details: '',
      shareAnonymously: '',
      happyToShareSunday: '',
      acknowledged: false,
    });
  }

  return (
    <FormShell
      title={meta.title}
      description={meta.description}
      branchName={(user as { branchName?: string | null })?.branchName}
      submitted={submitted}
      successTitle="Testimony shared"
      successMessage="Thank you for sharing your testimony. To God be the glory!"
      onSubmitAnother={reset}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <BranchPicker value={selectedBranchId} onChange={setSelectedBranchId} />

        <MemberSearchLink
          value={subjectMemberId}
          onSelect={selectExisting}
          onClear={clearExisting}
          label="Find the person giving the testimony"
          helpText="Search by name or phone. Leave blank to create a new contact."
          linkedNote="Linked to an existing person — this testimony will be tied to their record."
          disabled={isAnonymous}
          disabledHint="An anonymous testimony won’t be linked to a person’s record."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="firstName" required>
              First name
            </FieldLabel>
            <Input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            <FieldError message={errors.firstName} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="lastName" required>
              Last name
            </FieldLabel>
            <Input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            <FieldError message={errors.lastName} />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="phone" required>
            Phone
          </FieldLabel>
          <Input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <FieldError message={errors.phone} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel required>Today’s date</FieldLabel>
            <DateSelect value={form.todaysDate} onChange={(v) => set('todaysDate', v)} />
            <FieldError message={errors.todaysDate} />
          </div>
          <div className="space-y-2">
            <FieldLabel required>Date of testimony</FieldLabel>
            <DateSelect value={form.dateOfTestimony} onChange={(v) => set('dateOfTestimony', v)} />
            <FieldError message={errors.dateOfTestimony} />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="category" required>
            Testimony category
          </FieldLabel>
          <CustomSelect
            id="category"
            value={form.category}
            onValueChange={(v) => set('category', v)}
            placeholder="Select a category"
            options={TESTIMONY_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <FieldError message={errors.category} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="details" required>
            Testimony details
          </FieldLabel>
          <Textarea
            id="details"
            rows={5}
            value={form.details}
            onChange={(e) => set('details', e.target.value)}
            placeholder="Share what God has done…"
          />
          <FieldError message={errors.details} />
        </div>

        <div className="space-y-2">
          <FieldLabel required>Share anonymously?</FieldLabel>
          <RadioRow
            name="Share anonymously?"
            value={form.shareAnonymously}
            options={YES_NO}
            onChange={setShareAnonymously}
          />
          <FieldError message={errors.shareAnonymously} />
        </div>

        <div className="space-y-2">
          <FieldLabel required>Happy to share during Sunday service?</FieldLabel>
          <RadioRow
            name="Happy to share during Sunday service?"
            value={form.happyToShareSunday}
            options={YES_NO}
            onChange={(v) => set('happyToShareSunday', v)}
          />
          <FieldError message={errors.happyToShareSunday} />
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={form.acknowledged}
              onChange={(e) => set('acknowledged', e.target.checked)}
              aria-label="Acknowledgement"
            />
            <span className="text-muted-foreground">
              I confirm this testimony is true and I consent to it being recorded.
              <span className="ml-0.5 text-destructive">*</span>
            </span>
          </label>
          <FieldError message={errors.acknowledged} />
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
