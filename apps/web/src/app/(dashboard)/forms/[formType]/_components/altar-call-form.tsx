'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, Card, CardContent } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { Search, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitForm, useFormMemberSearch } from '@/hooks/use-forms';
import { FORM_META } from '../../_lib/form-meta';
import { FormShell } from './form-shell';
import { FieldError, FieldLabel } from './field';

const schema = z.object({
  todaysDate: z.string().min(1, 'Today’s date is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
});

const today = () => new Date().toISOString().slice(0, 10);

export function AltarCallForm() {
  const meta = FORM_META.altar_call;
  const user = useAuthStore((s) => s.user);
  const submitForm = useSubmitForm();

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [form, setForm] = useState({
    todaysDate: today(),
    firstName: '',
    lastName: '',
    phone: '',
  });

  const { data: searchResults, isFetching: searching } = useFormMemberSearch(
    { q: searchTerm, branchId: user?.homeBranchId },
    { enabled: searchOpen && searchTerm.trim().length >= 2 },
  );

  function set(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => {
      const next = { ...p };
      delete next[field];
      return next;
    });
  }

  function selectExisting(r: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  }) {
    setSubjectMemberId(r.id);
    setForm((p) => ({
      ...p,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone ?? '',
    }));
    setSearchOpen(false);
    setSearchTerm(`${r.firstName} ${r.lastName}`);
  }

  function clearExisting() {
    setSubjectMemberId(undefined);
    setSearchTerm('');
    setForm({ todaysDate: today(), firstName: '', lastName: '', phone: '' });
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
        formType: 'altar_call',
        data: { subjectMemberId, payload: parsed.data },
      });
      setSubmitted(true);
    } catch {
      // surfaced below via submitForm.isError
    }
  }

  function reset() {
    setSubmitted(false);
    setSubjectMemberId(undefined);
    setSearchTerm('');
    setErrors({});
    setForm({ todaysDate: today(), firstName: '', lastName: '', phone: '' });
  }

  return (
    <FormShell
      title={meta.title}
      description={meta.description}
      branchName={(user as { branchName?: string | null })?.branchName}
      submitted={submitted}
      successTitle="Enrollment created"
      successMessage={
        subjectMemberId
          ? 'This person was linked and enrolled in the New Believers programme.'
          : 'A new contact was created and enrolled in the New Believers programme.'
      }
      onSubmitAnother={reset}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Find existing person */}
        <Card>
          <CardContent className="space-y-3 py-5">
            <FieldLabel htmlFor="member-search">Find an existing person</FieldLabel>
            <p className="text-xs text-muted-foreground">
              Search by name or phone. Leave blank to create a new contact.
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="member-search"
                className="pl-9 pr-9"
                placeholder="Search by name or phone…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                  if (subjectMemberId) setSubjectMemberId(undefined);
                }}
                onFocus={() => setSearchOpen(true)}
              />
              {(searchTerm || subjectMemberId) && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearExisting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {subjectMemberId ? (
              <p className="text-xs font-medium text-[#16A34A]">
                Linked to an existing person — submitting will enrol them.
              </p>
            ) : null}

            {searchOpen && searchTerm.trim().length >= 2 && !subjectMemberId ? (
              <div className="rounded-lg border border-input/15">
                {searching ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                ) : searchResults && searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => selectExisting(r)}
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-foreground/5"
                        >
                          <span className="font-medium text-foreground">
                            {r.firstName} {r.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {r.phone ?? 'No phone'} · {r.memberType}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No matches — a new contact will be created.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <FieldLabel required>Today’s date</FieldLabel>
          <DateSelect value={form.todaysDate} onChange={(v) => set('todaysDate', v)} />
          <FieldError message={errors.todaysDate} />
        </div>

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

        {submitForm.isError ? (
          <p className="text-sm text-destructive">
            {submitForm.error instanceof Error
              ? submitForm.error.message
              : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={submitForm.isPending}
          className="w-full bg-[#5D3FD3] hover:bg-[#451ebb]"
        >
          {submitForm.isPending ? 'Submitting…' : 'Submit'}
        </Button>
      </form>
    </FormShell>
  );
}
