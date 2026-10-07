'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Textarea,
  CustomSelect,
  Card,
  CardContent,
  cn,
} from '@kairos/ui';
import { Plus, Trash2 } from 'lucide-react';
import { DateSelect } from '@/components/date-select';
import { MemberCombobox, MemberPickOrType } from './member-combobox';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitForm } from '@/hooks/use-forms';
import {
  buildFormPayload,
  declaredFieldIds,
  emptyFormRow,
  evaluateCondition,
  initialFormValues,
  validateForm,
  type FormDefinition,
  type FormFieldDef,
  type FormFieldValue,
  type FormMemberSearchResult,
  type FormRowValues,
  type FormSectionDef,
  type FormValues,
  type RepeatableGroupDef,
} from '@kairos/types';
import { FormShell } from './form-shell';
import { FieldError, FieldLabel, RadioRow } from './field';
import { DisclaimerConsent, CONSENT_POLICY_VERSION } from './disclaimer-consent';

// ── Value model ─────────────────────────────────────────────
//
// Top-level fields are keyed by their field id in a flat `values` bag.
// Repeatable groups store an array of per-row value bags under the group id.
// The flat bag is exactly what `evaluateCondition` reads, so visibility
// branches resolve reactively as the user types.
//
// Seeding, validation and payload assembly are all pure, and they live in
// `@kairos/types/form-engine` so this renderer and the mobile one cannot
// disagree about what a given set of answers submits. They had already drifted
// apart twice before they moved there.

const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

type FieldValue = FormFieldValue;
type RowValues = FormRowValues;
type FormState = FormValues;

export interface DeclarativeFormProps {
  definition: FormDefinition;
  /** Overrides `definition.success`. Rarely needed — the copy belongs in the definition. */
  successTitle?: string;
  successMessage?: string;
}

export function DeclarativeForm({
  definition,
  successTitle,
  successMessage,
}: DeclarativeFormProps) {
  const user = useAuthStore((s) => s.user);
  const submitForm = useSubmitForm();

  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<FormState>(() => initialFormValues(definition));
  // Field error keys are top-level field ids, plus `${groupId}.${index}.${fieldId}`.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rowsOf = (groupId: string): RowValues[] => state.rows[groupId] ?? [];

  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  // What the subject pre-fill wrote, so unlinking can take back exactly those
  // values — and only where the person hasn't since edited them.
  const [prefilled, setPrefilled] = useState<Record<string, string>>({});
  const [consentAck, setConsentAck] = useState(false);

  // `now` is stable for one render of the form so age-based branches don't
  // flicker between keystrokes.
  const now = useMemo(() => new Date(), []);

  // A submission shared anonymously must not carry the subject link. The
  // bespoke testimony form has always dropped it; read it off the answer rather
  // than the form type so any definition asking the same question inherits the
  // rule, and so the mobile renderer can mirror it exactly.
  const isAnonymous = state.values.shareAnonymously === true;

  function setValue(id: string, value: FieldValue) {
    // Ticking anonymity retracts the link rather than leaving one on screen
    // that submit would silently discard.
    if (id === 'shareAnonymously' && value === true) setSubjectMemberId(undefined);
    setState((p) => ({ ...p, values: { ...p.values, [id]: value } }));
    setErrors((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }

  function setRowValue(groupId: string, index: number, fieldId: string, value: FieldValue) {
    setState((p) => {
      const rows = (p.rows[groupId] ?? []).map((r, i) =>
        i === index ? { ...r, [fieldId]: value } : r,
      );
      return { ...p, rows: { ...p.rows, [groupId]: rows } };
    });
    setErrors((p) => {
      const next = { ...p };
      delete next[`${groupId}.${index}.${fieldId}`];
      return next;
    });
  }

  function addRow(group: RepeatableGroupDef) {
    setState((p) => {
      const current = p.rows[group.id] ?? [];
      if (group.max !== undefined && current.length >= group.max) return p;
      return { ...p, rows: { ...p.rows, [group.id]: [...current, emptyFormRow(group)] } };
    });
  }

  function removeRow(group: RepeatableGroupDef, index: number) {
    setState((p) => {
      const current = p.rows[group.id] ?? [];
      const min = group.min ?? 0;
      if (current.length <= min) return p;
      return {
        ...p,
        rows: { ...p.rows, [group.id]: current.filter((_, i) => i !== index) },
      };
    });
  }

  // ── Subject link (is this submission about somebody we already hold?) ──
  //
  // The copy and the pre-fill targets come from `definition.subjectLink`, so a
  // baby form says "Find the parent/guardian" and fills the parent's phone,
  // while a first-timer says "Find an existing person" and fills name + phone.
  // Both renderers read the same descriptor; neither hardcodes either one.

  const subjectLink = definition.subjectLink;

  function setSubject(member: FormMemberSearchResult | null) {
    if (!member) {
      setSubjectMemberId(undefined);
      // Take back exactly what pre-fill wrote, and only where it is still
      // untouched — a value the person has since edited is theirs, not ours.
      setState((p) => {
        const values = { ...p.values };
        for (const [id, written] of Object.entries(prefilled)) {
          if (values[id] === written) values[id] = '';
        }
        return { ...p, values };
      });
      setPrefilled({});
      return;
    }

    setSubjectMemberId(member.id);
    const targets: Record<string, string | undefined> = subjectLink?.prefill ?? {};
    const declared = declaredFieldIds(definition);
    const writes: Record<string, string> = {};
    const copy: Record<string, string> = {
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone ?? '',
    };
    for (const [attribute, fieldId] of Object.entries(targets)) {
      // Never invent a key the form didn't ask for.
      if (fieldId && declared.has(fieldId)) writes[fieldId] = copy[attribute] ?? '';
    }
    setPrefilled(writes);
    setState((p) => ({ ...p, values: { ...p.values, ...writes } }));
    setErrors((p) => {
      const next = { ...p };
      for (const id of Object.keys(writes)) delete next[id];
      return next;
    });
  }

  // ── Submit ─────────────────────────────────────────────────

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateForm(definition, state, now);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    try {
      await submitForm.mutateAsync({
        formType: definition.formType,
        data: {
          subjectMemberId: isAnonymous ? undefined : subjectMemberId,
          payload: buildFormPayload(definition, state, now),
          consentGivenAt: new Date().toISOString(),
          consentPolicyVersion: CONSENT_POLICY_VERSION,
        },
      });
      setSubmitted(true);
    } catch {
      // surfaced below via submitForm.isError
    }
  }

  function reset() {
    setSubmitted(false);
    setErrors({});
    setState(initialFormValues(definition));
    setSubjectMemberId(undefined);
    setPrefilled({});
    setConsentAck(false);
  }

  const values = state.values as Record<string, unknown>;

  // ── Field renderer ─────────────────────────────────────────

  function renderField(
    field: FormFieldDef,
    value: FieldValue,
    onChange: (v: FieldValue) => void,
    errorKey: string,
    // Writes a sibling field in the SAME bag as `onChange` — the top-level
    // values for a section, the row's own values inside a repeatable group.
    // Only member fields use it, to clear their free-text twin.
    setSibling: (fieldId: string, v: FieldValue) => void = setValue,
    siblingValues: Record<string, FieldValue> = state.values,
  ) {
    const errorMsg = errors[errorKey];

    if (field.type === 'checkbox') {
      return (
        <div className="space-y-2">
          <label
            className={cn(
              'group flex cursor-pointer items-start gap-3 rounded-lg border border-input/15 bg-background/70 p-3 text-sm font-medium text-foreground transition-colors',
              'hover:border-[#5D3FD3]/35 hover:bg-[#5D3FD3]/5',
              'dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#5D3FD3]/45 dark:hover:bg-[#5D3FD3]/10',
            )}
          >
            <Checkbox
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="leading-5">{field.label}</span>
          </label>
          <FieldError message={errorMsg} />
        </div>
      );
    }

    if (field.type === 'member') {
      // The stored value is a member id, so the picked person can actually be
      // routed to — a typed name never could be. The control owns its own
      // label, help text and error line: it is one question with one answer,
      // and the generic wrapper below would print the label a second time.
      const companionId = field.freeTextFieldId;
      const companionValue = companionId ? siblingValues[companionId] : undefined;
      return (
        <MemberPickOrType
          field={field}
          memberId={typeof value === 'string' ? value : ''}
          typedName={typeof companionValue === 'string' ? companionValue : ''}
          errorMessage={errorMsg}
          onPickMember={(m) => {
            onChange(m ? m.id : '');
            if (companionId) setSibling(companionId, '');
          }}
          onTypeName={
            companionId
              ? (name) => {
                  setSibling(companionId, name);
                  onChange('');
                }
              : undefined
          }
        />
      );
    }

    const control = (() => {
      switch (field.type) {
        case 'date':
          return (
            <DateSelect
              value={typeof value === 'string' ? value : ''}
              onChange={(v) => onChange(v)}
            />
          );
        case 'select':
          return (
            <CustomSelect
              value={typeof value === 'string' ? value : ''}
              onValueChange={(v) => onChange(v)}
              options={field.options ?? []}
              placeholder={field.placeholder ?? 'Select an option'}
            />
          );
        case 'radio':
          return (
            <RadioRow
              name={field.label}
              value={typeof value === 'string' ? value : ''}
              options={field.options ?? []}
              onChange={(v) => onChange(v)}
            />
          );
        case 'boolean':
          // Yes/No on screen, a boolean in the payload. Unanswered renders as
          // neither pill selected, which is what makes "No" mean something.
          return (
            <RadioRow
              name={field.label}
              value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : ''}
              options={YES_NO}
              onChange={(v) => onChange(v === 'Yes')}
            />
          );
        case 'textarea':
          return (
            <Textarea
              id={errorKey}
              rows={4}
              placeholder={field.placeholder}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
            />
          );
        default:
          return (
            <Input
              id={errorKey}
              type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
            />
          );
      }
    })();

    return (
      <div className="space-y-2">
        <FieldLabel htmlFor={errorKey} required={field.required}>
          {field.label}
        </FieldLabel>
        {control}
        {field.helpText ? (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        ) : null}
        <FieldError message={errorMsg} />
      </div>
    );
  }

  function renderSection(block: FormSectionDef) {
    const visibleFields = block.fields.filter((f) =>
      f.visibleWhen ? evaluateCondition(f.visibleWhen, values, now) : true,
    );
    if (visibleFields.length === 0) return null;
    return (
      <section key={block.id} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{block.title}</h2>
          {block.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{block.description}</p>
          ) : null}
        </div>
        <div className="space-y-4">
          {visibleFields.map((field) => (
            <div key={field.id}>
              {renderField(
                field,
                state.values[field.id],
                (v) => setValue(field.id, v),
                field.id,
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderRepeatable(block: RepeatableGroupDef) {
    const rows = rowsOf(block.id);
    const min = block.min ?? 0;
    const itemLabel = block.itemLabel ?? 'Item';
    const canAdd = block.max === undefined || rows.length < block.max;
    return (
      <section key={block.id} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{block.label}</h2>
        <div className="space-y-4">
          {rows.map((row, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {itemLabel} {index + 1}
                  </h3>
                  {rows.length > min ? (
                    <button
                      type="button"
                      aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                      onClick={() => removeRow(block, index)}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  ) : null}
                </div>
                {block.fields
                  .filter((f) =>
                    f.visibleWhen
                      ? evaluateCondition(f.visibleWhen, row as Record<string, unknown>, now)
                      : true,
                  )
                  .map((field) => (
                    <div key={field.id}>
                      {renderField(
                        field,
                        row[field.id],
                        (v) => setRowValue(block.id, index, field.id, v),
                        `${block.id}.${index}.${field.id}`,
                        (fieldId, v) => setRowValue(block.id, index, fieldId, v),
                        row,
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
        {canAdd ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => addRow(block)}
            className="border-[#5D3FD3]/30 text-[#5D3FD3] hover:bg-[#5D3FD3]/5"
          >
            <Plus className="mr-1 h-4 w-4" /> Add {itemLabel.toLowerCase()}
          </Button>
        ) : null}
      </section>
    );
  }

  return (
    <FormShell
      title={definition.title}
      description={definition.description ?? ''}
      branchName={(user as { branchName?: string | null })?.branchName}
      submitted={submitted}
      successTitle={successTitle ?? definition.success?.title ?? 'Submission received'}
      successMessage={
        successMessage ??
        (subjectMemberId && !isAnonymous
          ? definition.success?.linkedMessage
          : undefined) ??
        definition.success?.message ??
        'Thank you. A leader will follow up with you soon.'
      }
      onSubmitAnother={reset}
    >
      <form onSubmit={onSubmit} className="space-y-8">

        {/* The subject link. Withheld entirely when the definition declares none,
            and withdrawn for an anonymous submission, which by construction isn't
            tied to anybody's record. */}
        {subjectLink ? (
          <Card>
            <CardContent className="py-5">
              <MemberCombobox
                id="member-search"
                label={subjectLink.label}
                helpText={subjectLink.helpText}
                memberId={subjectMemberId ?? ''}
                onPick={setSubject}
                linkedNote={subjectLink.linkedNote}
                disabled={isAnonymous}
                disabledHint="An anonymous submission won’t be linked to anyone’s record."
              />
            </CardContent>
          </Card>
        ) : null}

        {definition.blocks.map((block) => {
          const blockVisible = block.visibleWhen
            ? evaluateCondition(block.visibleWhen, values, now)
            : true;
          if (!blockVisible) return null;
          return block.kind === 'section'
            ? renderSection(block)
            : renderRepeatable(block);
        })}

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
