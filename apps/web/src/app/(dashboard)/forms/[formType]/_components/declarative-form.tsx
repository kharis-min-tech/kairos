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
import { Search, X, Plus, Trash2 } from 'lucide-react';
import { DateSelect } from '@/components/date-select';
import { useAuthStore } from '@/lib/auth-store';
import { useSubmitForm, useFormMemberSearch } from '@/hooks/use-forms';
import {
  evaluateCondition,
  type FormDefinition,
  type FormFieldDef,
  type FormSectionDef,
  type RepeatableGroupDef,
} from '@kairos/types';
import { FormShell } from './form-shell';
import { FieldError, FieldLabel, RadioRow } from './field';
import { DisclaimerConsent, CONSENT_POLICY_VERSION } from './disclaimer-consent';
import { BranchPicker } from './branch-picker';

// ── Value model ─────────────────────────────────────────────
//
// Top-level fields are keyed by their field id in a flat `values` bag.
// Repeatable groups store an array of per-row value bags under the
// group id. The flat bag is exactly what `evaluateCondition` reads,
// so visibility branches resolve reactively as the user types.

type FieldValue = string | boolean | undefined;
type RowValues = Record<string, FieldValue>;

interface FormState {
  values: Record<string, FieldValue>;
  rows: Record<string, RowValues[]>; // repeatable group id → rows
}

function emptyRow(group: RepeatableGroupDef): RowValues {
  const row: RowValues = {};
  for (const f of group.fields) {
    row[f.id] = f.type === 'checkbox' ? false : '';
  }
  return row;
}

function initialState(def: FormDefinition): FormState {
  const values: Record<string, FieldValue> = {};
  const rows: Record<string, RowValues[]> = {};
  for (const block of def.blocks) {
    if (block.kind === 'section') {
      for (const f of block.fields) {
        values[f.id] = f.type === 'checkbox' ? false : '';
      }
    } else {
      const min = block.min ?? 0;
      rows[block.id] = Array.from({ length: min }, () => emptyRow(block));
    }
  }
  return { values, rows };
}

// ── Validation ──────────────────────────────────────────────
//
// Required only when visible. We reuse `evaluateCondition` for both the
// field's own `visibleWhen` and its containing block's — mirroring the
// API so the client and server agree on the under-16 / brought-children
// branches.

function isFieldVisible(
  field: FormFieldDef,
  blockVisible: boolean,
  values: Record<string, unknown>,
  now: Date,
): boolean {
  if (!blockVisible) return false;
  if (!field.visibleWhen) return true;
  return evaluateCondition(field.visibleWhen, values, now);
}

function isFilled(v: FieldValue): boolean {
  if (typeof v === 'boolean') return v;
  return typeof v === 'string' && v.trim().length > 0;
}

export interface DeclarativeFormProps {
  definition: FormDefinition;
  successTitle?: string;
  successMessage?: string;
}

export function DeclarativeForm({
  definition,
  successTitle = 'Submission received',
  successMessage = 'Thank you. A leader will follow up with you soon.',
}: DeclarativeFormProps) {
  const user = useAuthStore((s) => s.user);
  const submitForm = useSubmitForm();

  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<FormState>(() => initialState(definition));
  // Field error keys are top-level field ids, plus `${groupId}.${index}.${fieldId}`.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rowsOf = (groupId: string): RowValues[] => state.rows[groupId] ?? [];

  const [subjectMemberId, setSubjectMemberId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [consentAck, setConsentAck] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  // `now` is stable for one render of the form so age-based branches don't
  // flicker between keystrokes.
  const now = useMemo(() => new Date(), []);

  const { data: searchResults, isFetching: searching } = useFormMemberSearch(
    { q: searchTerm, branchId: user?.homeBranchId },
    { enabled: searchOpen && searchTerm.trim().length >= 2 },
  );

  function setValue(id: string, value: FieldValue) {
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
      return { ...p, rows: { ...p.rows, [group.id]: [...current, emptyRow(group)] } };
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

  // ── Member typeahead (returning/known person) ──────────────

  function selectExisting(r: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  }) {
    setSubjectMemberId(r.id);
    setState((p) => ({
      ...p,
      values: {
        ...p.values,
        firstName: r.firstName,
        lastName: r.lastName,
        ...(p.values.phone !== undefined ? { phone: r.phone ?? '' } : {}),
      },
    }));
    setSearchOpen(false);
    setSearchTerm(`${r.firstName} ${r.lastName}`);
  }

  function clearExisting() {
    setSubjectMemberId(undefined);
    setSearchTerm('');
  }

  // ── Submit ─────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    const values = state.values as Record<string, unknown>;

    for (const block of definition.blocks) {
      const blockVisible = block.visibleWhen
        ? evaluateCondition(block.visibleWhen, values, now)
        : true;
      if (!blockVisible) continue;

      if (block.kind === 'section') {
        for (const field of block.fields) {
          if (!field.required) continue;
          if (!isFieldVisible(field, blockVisible, values, now)) continue;
          if (!isFilled(state.values[field.id])) {
            found[field.id] = `${field.label} is required`;
          }
        }
      } else {
        block.fields.forEach((field) => {
          if (!field.required) return;
          rowsOf(block.id).forEach((row, index) => {
            // Sub-field visibility evaluates against the row's own values.
            const rowVisible = field.visibleWhen
              ? evaluateCondition(field.visibleWhen, row as Record<string, unknown>, now)
              : true;
            if (!rowVisible) return;
            if (!isFilled(row[field.id])) {
              found[`${block.id}.${index}.${field.id}`] =
                `${field.label} is required`;
            }
          });
        });
      }
    }
    return found;
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const values = state.values as Record<string, unknown>;

    for (const block of definition.blocks) {
      const blockVisible = block.visibleWhen
        ? evaluateCondition(block.visibleWhen, values, now)
        : true;
      if (!blockVisible) continue;

      if (block.kind === 'section') {
        for (const field of block.fields) {
          if (!isFieldVisible(field, blockVisible, values, now)) continue;
          const v = state.values[field.id];
          if (field.type === 'checkbox') {
            payload[field.id] = Boolean(v);
          } else if (typeof v === 'string' && v.trim().length > 0) {
            payload[field.id] = v.trim();
          }
        }
      } else {
        const rows = rowsOf(block.id)
          .map((row) => {
            const out: Record<string, unknown> = {};
            for (const field of block.fields) {
              const v = row[field.id];
              if (field.type === 'checkbox') out[field.id] = Boolean(v);
              else if (typeof v === 'string' && v.trim().length > 0)
                out[field.id] = v.trim();
            }
            return out;
          })
          .filter((row) => Object.keys(row).length > 0);
        if (rows.length > 0) payload[block.id] = rows;
      }
    }
    return payload;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    try {
      await submitForm.mutateAsync({
        formType: definition.formType,
        data: {
          subjectMemberId,
          branchId: selectedBranchId,
          payload: buildPayload(),
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
    setState(initialState(definition));
    setSubjectMemberId(undefined);
    setSearchTerm('');
    setSearchOpen(false);
    setConsentAck(false);
    setSelectedBranchId(undefined);
  }

  const values = state.values as Record<string, unknown>;

  // ── Field renderer ─────────────────────────────────────────

  function renderField(
    field: FormFieldDef,
    value: FieldValue,
    onChange: (v: FieldValue) => void,
    errorKey: string,
  ) {
    const errorMsg = errors[errorKey];

    if (field.type === 'checkbox') {
      return (
        <div className="space-y-2">
          <label
            className={cn(
              'group flex cursor-pointer items-start gap-3 rounded-lg border border-input/15 bg-background/70 p-3 text-sm font-medium text-foreground transition-colors',
              'hover:border-[#6D28D9]/35 hover:bg-[#6D28D9]/5',
              'dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#6D28D9]/45 dark:hover:bg-[#6D28D9]/10',
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
      successTitle={successTitle}
      successMessage={successMessage}
      onSubmitAnother={reset}
    >
      <form onSubmit={onSubmit} className="space-y-8">
        <BranchPicker value={selectedBranchId} onChange={setSelectedBranchId} />

        {/* Find existing person — link a returning/known visitor. */}
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
                Linked to an existing person — submitting will update their record.
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
