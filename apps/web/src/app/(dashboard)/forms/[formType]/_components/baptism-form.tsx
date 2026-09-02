'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Input } from '@kairos/ui';
import type { FormMemberSearchResult } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitForm } from '@/hooks/use-forms';
import { FORM_META } from '../../_lib/form-meta';
import { FormShell } from './form-shell';
import { FieldError, FieldLabel } from './field';
import { MemberSearchLink } from './member-search-link';
import { DisclaimerConsent, CONSENT_POLICY_VERSION } from './disclaimer-consent';
import { BranchPicker } from './branch-picker';

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
});

export function BaptismForm() {
  const meta = FORM_META.baptism;
  const user = useAuthStore((s) => s.user);
  const submitForm = useSubmitForm();

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [consentAck, setConsentAck] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  function set(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => {
      const next = { ...p };
      delete next[field];
      return next;
    });
  }

  function selectExisting(r: FormMemberSearchResult) {
    setSubjectMemberId(r.id);
    setForm({ firstName: r.firstName, lastName: r.lastName, phone: r.phone ?? '' });
    setErrors({});
  }

  function clearExisting() {
    setSubjectMemberId(undefined);
    setForm({ firstName: '', lastName: '', phone: '' });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    try {
      await submitForm.mutateAsync({
        formType: 'baptism',
        data: {
          subjectMemberId,
          branchId: selectedBranchId,
          payload: parsed.data,
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
    setForm({ firstName: '', lastName: '', phone: '' });
  }

  return (
    <FormShell
      title={meta.title}
      description={meta.description}
      branchName={(user as { branchName?: string | null })?.branchName}
      submitted={submitted}
      successTitle="Baptism request submitted"
      successMessage="Your baptism request has been recorded. A leader will be in touch."
      onSubmitAnother={reset}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <BranchPicker value={selectedBranchId} onChange={setSelectedBranchId} />

        <MemberSearchLink
          value={subjectMemberId}
          onSelect={selectExisting}
          onClear={clearExisting}
          label="Find the baptism candidate"
          helpText="Search by name or phone. Leave blank to create a new contact."
          linkedNote="Linked to an existing person. Their record will be used."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="firstName" required>
              First name
            </FieldLabel>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
            />
            <FieldError message={errors.firstName} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="lastName" required>
              Last name
            </FieldLabel>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
            />
            <FieldError message={errors.lastName} />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="phone" required>
            Phone
          </FieldLabel>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <FieldError message={errors.phone} />
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
