// ── Declarative Form Engine ────────────────────────────────
//
// Pure, serializable form-definition spec + condition evaluator.
// No React, no I/O, no app dependencies — imported by BOTH the web
// renderer and the API validator. Keep it that way.
//
// A `FormDefinition` is authored as data (see FIRST_TIME_VISITOR_FORM)
// and keyed by `FormType`. The engine is intentionally minimal-but-real:
// only what the first-timer form needs today, but cleanly generalizable.

import type { FormType } from './enums';

// ── Field types ────────────────────────────────────────────

export const FormFieldType = {
  Text: 'text',
  Tel: 'tel',
  Email: 'email',
  Date: 'date',
  Number: 'number',
  Select: 'select',
  Radio: 'radio',
  Checkbox: 'checkbox',
  Textarea: 'textarea',
  /**
   * A reference to an existing member, picked by search. The submitted value
   * is that member's id, not their typed name — so the person can actually be
   * routed to, which free text never allowed.
   */
  Member: 'member',
  /**
   * An explicit yes/no that submits a boolean.
   *
   * Distinct from `Checkbox`, which cannot tell "answered no" from "never
   * looked" — it submits `false` either way. Where the answer is a preference
   * the person must actually make, such as whether a testimony is shared
   * anonymously, that difference is the whole point: an unanswered `Boolean`
   * field fails validation, so the `false` on the wire always means somebody
   * chose it.
   */
  Boolean: 'boolean',
} as const;
export type FormFieldType = (typeof FormFieldType)[keyof typeof FormFieldType];

export interface FormFieldOption {
  value: string;
  label: string;
}

// ── Conditions (visibleWhen) ───────────────────────────────
//
// A small, serializable predicate language expressed over other field
// values. `evaluateCondition` is the single source of truth for how
// these are interpreted, on both the client and the server.

/** Compares a single field's value against `value`. */
export interface FormFieldCondition {
  field: string;
  op: 'equals' | 'notEquals' | 'isTruthy' | 'ageUnder';
  /**
   * Comparand. Omitted for `isTruthy`. For `ageUnder` this is the age
   * threshold in years; the field is expected to hold a date string.
   */
  value?: unknown;
}

/** Boolean combinator over nested conditions. */
export interface FormCombinatorCondition {
  op: 'and' | 'or';
  conditions: FormConditionDef[];
}

export type FormConditionDef = FormFieldCondition | FormCombinatorCondition;

// ── Fields, groups, sections ───────────────────────────────

export interface FormFieldDef {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** For `select` / `radio` (and multi-select via `select`). */
  options?: FormFieldOption[];
  /**
   * For `member` fields only. Names a companion text field the renderer
   * writes to when the person typed isn't in the directory — a visiting
   * child's guardian or a baby's parent is often not a member yet, so
   * requiring a pick would block the form.
   *
   * The two keys are mutually exclusive: picking a member sets this field's
   * id and clears the companion; typing a name does the reverse. A reference
   * where one exists, a name where one doesn't, and never an ambiguous value
   * under a single key.
   */
  freeTextFieldId?: string;
  helpText?: string;
  /**
   * Value the field starts with. For date fields, the magic string
   * `'today'` resolves to the current ISO date at renderer boot time.
   */
  defaultValue?: string | boolean;
  /** Field is rendered/validated only when this condition holds. */
  visibleWhen?: FormConditionDef;
}

/**
 * A named, repeatable array of sub-fields (e.g. "children brought").
 * Submitted as an array of records keyed by the sub-field ids.
 */
export interface RepeatableGroupDef {
  kind: 'repeatable';
  id: string;
  label: string;
  fields: FormFieldDef[];
  min?: number;
  max?: number;
  /** Item label / singular noun, e.g. "Child". */
  itemLabel?: string;
  visibleWhen?: FormConditionDef;
}

/** A flat grouping of fields under a heading. */
export interface FormSectionDef {
  kind: 'section';
  id: string;
  title: string;
  description?: string;
  fields: FormFieldDef[];
  visibleWhen?: FormConditionDef;
}

/** Ordered block within a form: either a section or a repeatable group. */
export type FormBlockDef = FormSectionDef | RepeatableGroupDef;

/**
 * The "find an existing person" control that sits above every form.
 *
 * It answers a different question from a `member` field: not "who is the
 * guardian" but "is this submission about somebody we already hold?", and the
 * answer becomes `subjectMemberId`, which is what lets the server update a
 * record instead of minting a duplicate.
 *
 * It lives in the definition rather than in each renderer because the copy is
 * form-specific and load-bearing — on a baby form the linked person is recorded
 * as the baby's guardian, so "Find an existing person" would be actively
 * misleading — and because web and mobile must say the same thing and pre-fill
 * the same fields. Both used to hardcode their own.
 */
export interface FormSubjectLinkDef {
  /** Label above the search control. */
  label: string;
  /** Helper line under the label. */
  helpText?: string;
  /** Confirmation line shown once somebody is linked. */
  linkedNote?: string;
  /**
   * Which payload fields to pre-fill from the picked person, by attribute.
   * Each value is a field id: a form that doesn't declare that id is left
   * alone, so pre-fill can never invent a key the form never asked for.
   */
  prefill?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

/**
 * What the person sees once the form is in.
 *
 * Here rather than at each call site because mobile had no way to reach it: it
 * showed "Submission received / Thank you. A leader will follow up with you
 * soon." for all six forms while web gave each its own wording.
 */
export interface FormSuccessDef {
  title: string;
  message: string;
  /** Used instead of `message` when the submission was linked to an existing person. */
  linkedMessage?: string;
}

export interface FormDefinition {
  formType: FormType;
  title: string;
  description?: string;
  /** Omit to render the form with no subject link at all. */
  subjectLink?: FormSubjectLinkDef;
  success?: FormSuccessDef;
  blocks: FormBlockDef[];
}

/** Every field id the definition declares, including repeatable sub-fields. */
export function declaredFieldIds(def: FormDefinition): Set<string> {
  const ids = new Set<string>();
  for (const block of def.blocks) {
    for (const field of block.fields) {
      ids.add(field.id);
      if (field.freeTextFieldId) ids.add(field.freeTextFieldId);
    }
  }
  return ids;
}

// ── Member references ──────────────────────────────────────

/**
 * How a `member` field has been answered.
 *
 * - `linked` — a directory record was picked; the value is a member id and the
 *   person can actually be followed up.
 * - `named`  — only a name was given, into the field's `freeTextFieldId`.
 * - `empty`  — neither.
 */
export type MemberReferenceState = 'linked' | 'named' | 'empty';

/**
 * The one place that reads a member field's pair of keys.
 *
 * The renderers keep the two keys mutually exclusive when writing, but reading
 * must still be total: legacy submissions and hand-edited payloads can carry
 * both. `linked` wins in that case — a reference is the stronger claim, and
 * showing the record a reviewer can open is the safe read.
 *
 * Shared deliberately: the web renderer, the mobile renderer and validation all
 * call this, so "is this field answered?" cannot drift between them. Mobile used
 * to omit the free-text half and so rejected a typed name on a required field.
 */
export function memberReferenceState(
  field: Pick<FormFieldDef, 'id' | 'freeTextFieldId'>,
  values: Record<string, unknown>,
): MemberReferenceState {
  if (isNonEmptyString(values[field.id])) return 'linked';
  if (field.freeTextFieldId && isNonEmptyString(values[field.freeTextFieldId])) {
    return 'named';
  }
  return 'empty';
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

// ── Evaluator ──────────────────────────────────────────────

function isCombinator(cond: FormConditionDef): cond is FormCombinatorCondition {
  return cond.op === 'and' || cond.op === 'or';
}

/**
 * Compute whole years elapsed from an ISO-ish date string to `now`.
 * Returns `null` when the value is not a parseable date.
 */
export function ageInYears(value: unknown, now: Date): number | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const dob = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dob.getTime())) return null;

  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Pure evaluation of a `visibleWhen` condition against a flat bag of
 * field values. No React, no I/O. `now` is injectable for testability;
 * defaults to the current date.
 */
export function evaluateCondition(
  cond: FormConditionDef,
  values: Record<string, unknown>,
  now: Date = new Date(),
): boolean {
  if (isCombinator(cond)) {
    if (cond.op === 'and') {
      return cond.conditions.every((c) => evaluateCondition(c, values, now));
    }
    return cond.conditions.some((c) => evaluateCondition(c, values, now));
  }

  const actual = values[cond.field];

  switch (cond.op) {
    case 'equals':
      return actual === cond.value;
    case 'notEquals':
      return actual !== cond.value;
    case 'isTruthy':
      return Boolean(actual);
    case 'ageUnder': {
      const threshold = typeof cond.value === 'number' ? cond.value : Number(cond.value);
      if (Number.isNaN(threshold)) return false;
      const age = ageInYears(actual, now);
      if (age === null) return false;
      return age < threshold;
    }
    default: {
      // Exhaustiveness guard — unknown operators never match.
      return false;
    }
  }
}

// ── Renderer core: seed, validate, build ───────────────────
//
// These three were hand-copied into the web renderer and the mobile renderer,
// which is how they came to disagree: mobile honoured a field's `defaultValue`
// and web didn't, and web learned that a typed name satisfies a member field
// while mobile still rejected it. They are pure, so they belong here, and both
// platforms now emit the same payload from the same values by construction
// rather than by inspection.

export type FormFieldValue = string | boolean | undefined;
export type FormRowValues = Record<string, FormFieldValue>;

/** A form in progress: the flat bag of top-level answers plus repeatable rows. */
export interface FormValues {
  values: Record<string, FormFieldValue>;
  rows: Record<string, FormRowValues[]>;
}

/** Error keys are field ids, plus `${groupId}.${index}.${fieldId}` for rows. */
export type FormErrors = Record<string, string>;

function seedValue(field: FormFieldDef, today: string): FormFieldValue {
  if (field.defaultValue !== undefined) {
    if (field.type === 'date' && field.defaultValue === 'today') return today;
    if (field.type === 'checkbox' || field.type === 'boolean') {
      return Boolean(field.defaultValue);
    }
    return typeof field.defaultValue === 'string' ? field.defaultValue : '';
  }
  if (field.type === 'checkbox') return false;
  // A boolean starts unanswered, which is what makes "no" meaningful.
  if (field.type === 'boolean') return undefined;
  return '';
}

export function emptyFormRow(group: RepeatableGroupDef, now: Date = new Date()): FormRowValues {
  const today = now.toISOString().slice(0, 10);
  const row: FormRowValues = {};
  for (const f of group.fields) row[f.id] = seedValue(f, today);
  return row;
}

/** Starting values for a definition, honouring each field's `defaultValue`. */
export function initialFormValues(def: FormDefinition, now: Date = new Date()): FormValues {
  const today = now.toISOString().slice(0, 10);
  const values: Record<string, FormFieldValue> = {};
  const rows: Record<string, FormRowValues[]> = {};
  for (const block of def.blocks) {
    if (block.kind === 'section') {
      for (const f of block.fields) values[f.id] = seedValue(f, today);
    } else {
      const min = block.min ?? 0;
      rows[block.id] = Array.from({ length: min }, () => emptyFormRow(block, now));
    }
  }
  return { values, rows };
}

function isVisible(
  field: FormFieldDef,
  blockVisible: boolean,
  values: Record<string, unknown>,
  now: Date,
): boolean {
  if (!blockVisible) return false;
  if (!field.visibleWhen) return true;
  return evaluateCondition(field.visibleWhen, values, now);
}

function isFilled(v: FormFieldValue): boolean {
  if (typeof v === 'boolean') return v;
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Whether a required field has an answer. A `member` field is answered by a
 * reference OR by its free-text twin — the person is identified either way, and
 * demanding the reference would block the form for anyone not in the directory.
 */
export function isFieldAnswered(
  field: FormFieldDef,
  bag: Record<string, FormFieldValue>,
): boolean {
  if (field.type === 'member') return memberReferenceState(field, bag) !== 'empty';
  // Either way round counts — the question is answered, not necessarily agreed to.
  if (field.type === 'boolean') return typeof bag[field.id] === 'boolean';
  return isFilled(bag[field.id]);
}

/**
 * Write a member field's single answer.
 *
 * The free-text twin is not a field of its own in the definition — only
 * `freeTextFieldId` names it — so a generic "emit every field id" loop dropped
 * every typed name, and the server then rejected the submission as missing a
 * guardian or a parent. Emitting exactly one of the two keys makes "a reference
 * or a name, never both" true of the payload itself, not just of the UI that
 * produced it.
 */
function writeMemberAnswer(
  out: Record<string, unknown>,
  field: FormFieldDef,
  bag: Record<string, FormFieldValue>,
): void {
  const state = memberReferenceState(field, bag);
  if (state === 'linked') out[field.id] = String(bag[field.id]).trim();
  else if (state === 'named' && field.freeTextFieldId) {
    out[field.freeTextFieldId] = String(bag[field.freeTextFieldId]).trim();
  }
}

/** Required-field errors, evaluated only against what is actually visible. */
export function validateForm(
  def: FormDefinition,
  state: FormValues,
  now: Date = new Date(),
): FormErrors {
  const found: FormErrors = {};
  const values = state.values as Record<string, unknown>;

  for (const block of def.blocks) {
    const blockVisible = block.visibleWhen
      ? evaluateCondition(block.visibleWhen, values, now)
      : true;
    if (!blockVisible) continue;

    if (block.kind === 'section') {
      for (const field of block.fields) {
        if (!field.required) continue;
        if (!isVisible(field, blockVisible, values, now)) continue;
        if (!isFieldAnswered(field, state.values)) {
          found[field.id] = `${field.label} is required`;
        }
      }
    } else {
      for (const field of block.fields) {
        if (!field.required) continue;
        (state.rows[block.id] ?? []).forEach((row, index) => {
          // Sub-field visibility evaluates against the row's own values.
          const rowVisible = field.visibleWhen
            ? evaluateCondition(field.visibleWhen, row as Record<string, unknown>, now)
            : true;
          if (!rowVisible) return;
          if (!isFieldAnswered(field, row)) {
            found[`${block.id}.${index}.${field.id}`] = `${field.label} is required`;
          }
        });
      }
    }
  }
  return found;
}

/** The submitted payload: visible answers only, keyed by field id. */
export function buildFormPayload(
  def: FormDefinition,
  state: FormValues,
  now: Date = new Date(),
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const values = state.values as Record<string, unknown>;

  for (const block of def.blocks) {
    const blockVisible = block.visibleWhen
      ? evaluateCondition(block.visibleWhen, values, now)
      : true;
    if (!blockVisible) continue;

    if (block.kind === 'section') {
      for (const field of block.fields) {
        if (!isVisible(field, blockVisible, values, now)) continue;
        if (field.type === 'member') {
          writeMemberAnswer(payload, field, state.values);
          continue;
        }
        const v = state.values[field.id];
        if (field.type === 'checkbox') payload[field.id] = Boolean(v);
        else if (field.type === 'boolean') {
          if (typeof v === 'boolean') payload[field.id] = v;
        } else if (typeof v === 'string' && v.trim().length > 0) payload[field.id] = v.trim();
      }
    } else {
      const rows = (state.rows[block.id] ?? [])
        .map((row) => {
          const out: Record<string, unknown> = {};
          for (const field of block.fields) {
            if (field.type === 'member') {
              writeMemberAnswer(out, field, row);
              continue;
            }
            const v = row[field.id];
            if (field.type === 'checkbox') out[field.id] = Boolean(v);
            else if (field.type === 'boolean') {
              if (typeof v === 'boolean') out[field.id] = v;
            } else if (typeof v === 'string' && v.trim().length > 0) out[field.id] = v.trim();
          }
          return out;
        })
        .filter((row) => Object.keys(row).length > 0);
      if (rows.length > 0) payload[block.id] = rows;
    }
  }
  return payload;
}

// ── First-time-visitor form definition (authored as data) ──

export const FIRST_TIME_VISITOR_FORM: FormDefinition = {
  formType: 'first_time_visitor',
  title: 'First-Time Visitor',
  description: 'Welcome! Tell us a little about yourself so we can follow up.',
  subjectLink: {
    label: 'Find an existing person',
    helpText: 'Search by name or phone. Leave blank to create a new contact.',
    linkedNote: 'Linked to an existing person, so submitting will update their record.',
    prefill: { firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  },
  success: {
    title: 'Welcome recorded',
    message: 'Thank you for visiting. A leader will reach out to you soon.',
  },
  blocks: [
    {
      kind: 'section',
      id: 'about-you',
      title: 'About you',
      fields: [
        { id: 'firstName', type: 'text', label: 'First name', required: true },
        { id: 'lastName', type: 'text', label: 'Last name', required: true },
        { id: 'middleName', type: 'text', label: 'Middle name' },
        { id: 'dateOfBirth', type: 'date', label: 'Date of birth', required: true },
        {
          id: 'gender',
          type: 'radio',
          label: 'Gender',
          options: [
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
          ],
        },
        {
          id: 'isUnder16',
          type: 'radio',
          label: 'Are you under 16?',
          helpText: 'We may derive this from your date of birth.',
          options: [
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ],
        },
      ],
    },
    {
      kind: 'section',
      id: 'contact',
      title: 'Contact details',
      fields: [
        // Contact details are relaxed (not required) for under-16 visitors;
        // guardian details below carry the contact burden in that case.
        {
          id: 'email',
          type: 'email',
          label: 'Email',
          required: true,
          visibleWhen: { field: 'isUnder16', op: 'notEquals', value: 'Yes' },
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email',
          visibleWhen: { field: 'isUnder16', op: 'equals', value: 'Yes' },
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Phone',
          required: true,
          visibleWhen: { field: 'isUnder16', op: 'notEquals', value: 'Yes' },
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Phone',
          visibleWhen: { field: 'isUnder16', op: 'equals', value: 'Yes' },
        },
        { id: 'address', type: 'text', label: 'Address' },
        { id: 'city', type: 'text', label: 'City' },
        { id: 'postalCode', type: 'text', label: 'Postal code' },
      ],
    },
    {
      kind: 'section',
      id: 'guardian',
      title: 'Parent / guardian',
      description: 'Required for visitors under 16.',
      // Shown when the visitor self-reports under 16, OR when their date of
      // birth implies they are under 16.
      visibleWhen: {
        op: 'or',
        conditions: [
          { field: 'isUnder16', op: 'equals', value: 'Yes' },
          { field: 'dateOfBirth', op: 'ageUnder', value: 16 },
        ],
      },
      fields: [
        // Reuses the member emergency-contact shape (name/phone/relationship).
        {
          id: 'guardianMemberId',
          type: 'member',
          label: 'Guardian',
          placeholder: 'Search, or type their name if they’re new',
          freeTextFieldId: 'guardianName',
          required: true,
        },
        { id: 'guardianPhone', type: 'tel', label: 'Guardian phone', required: true },
        {
          id: 'guardianRelationship',
          type: 'text',
          label: 'Relationship to you',
          placeholder: 'e.g. Mother, Father, Carer',
        },
      ],
    },
    {
      kind: 'section',
      id: 'children-with-you',
      title: 'Did you come with children?',
      fields: [
        {
          id: 'broughtChildren',
          type: 'checkbox',
          label: 'I came with one or more children',
        },
      ],
    },
    {
      kind: 'repeatable',
      id: 'children',
      label: 'Children with you',
      itemLabel: 'Child',
      min: 0,
      max: 12,
      visibleWhen: { field: 'broughtChildren', op: 'isTruthy' },
      fields: [
        { id: 'firstName', type: 'text', label: 'First name', required: true },
        { id: 'lastName', type: 'text', label: 'Last name', required: true },
        { id: 'dateOfBirth', type: 'date', label: 'Date of birth' },
        {
          id: 'gender',
          type: 'radio',
          label: 'Gender',
          options: [
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
          ],
        },
      ],
    },
    {
      kind: 'section',
      id: 'getting-involved',
      title: 'Getting involved',
      fields: [
        {
          id: 'interest',
          type: 'select',
          label: 'What are you interested in?',
          helpText: 'Tell us where you would like to plug in.',
          options: [
            { value: 'fellowship', label: 'Joining a fellowship' },
            { value: 'department', label: 'Serving in a department' },
            { value: 'new_believers', label: 'New Believers programme' },
            { value: 'just_visiting', label: 'Just visiting for now' },
          ],
        },
        {
          id: 'howDidYouHear',
          type: 'text',
          label: 'How did you hear about us?',
          placeholder: 'e.g. A friend, social media, walked past',
        },
        {
          // A real reference rather than a typed name: an invited first-timer
          // is owned by the Follow-Up Team, and knowing WHO brought them is
          // only actionable if that person can be reached. Legacy submissions
          // keep their free-text `invitedBy`; the queue reads whichever is
          // present.
          id: 'invitedByMemberId',
          type: 'member',
          label: 'Who invited you?',
          placeholder: 'Search for the person who invited you',
        },
      ],
    },
  ],
};

// ── New Believers class (altar-call) — captures phone + name for follow-up ──

export const ALTAR_CALL_FORM: FormDefinition = {
  formType: 'altar_call',
  title: 'New Believers Class',
  description:
    'Enrol someone into the New Believers programme. We’ll follow up to arrange the four-week class.',
  subjectLink: {
    label: 'Find an existing person',
    helpText: 'Search by name or phone. Leave blank to create a new contact.',
    linkedNote: 'Linked to an existing person, so submitting will enrol them.',
    prefill: { firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  },
  success: {
    title: 'Enrollment created',
    message: 'A new contact was created and enrolled in the New Believers programme.',
    linkedMessage: 'This person was linked and enrolled in the New Believers programme.',
  },
  blocks: [
    {
      kind: 'section',
      id: 'details',
      title: 'Their details',
      fields: [
        {
          id: 'todaysDate',
          type: 'date',
          label: 'Today’s date',
          required: true,
          defaultValue: 'today',
        },
        { id: 'firstName', type: 'text', label: 'First name', required: true },
        { id: 'lastName', type: 'text', label: 'Last name', required: true },
        { id: 'phone', type: 'tel', label: 'Phone', required: true },
      ],
    },
  ],
};

// ── Baptism request ─────────────────────────────────────────

export const BAPTISM_FORM: FormDefinition = {
  formType: 'baptism',
  title: 'Baptism',
  description:
    'Request baptism. A leader will get in touch to talk through timing and next steps.',
  subjectLink: {
    label: 'Find the baptism candidate',
    helpText: 'Search by name or phone. Leave blank to create a new contact.',
    linkedNote: 'Linked to an existing person. Their record will be used.',
    prefill: { firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  },
  success: {
    title: 'Baptism request submitted',
    message: 'Your baptism request has been recorded. A leader will be in touch.',
  },
  blocks: [
    {
      kind: 'section',
      id: 'details',
      title: 'Your details',
      fields: [
        { id: 'firstName', type: 'text', label: 'First name', required: true },
        { id: 'lastName', type: 'text', label: 'Last name', required: true },
        { id: 'phone', type: 'tel', label: 'Phone', required: true },
      ],
    },
  ],
};

// ── Testimony share ────────────────────────────────────────

export const TESTIMONY_FORM: FormDefinition = {
  formType: 'testimony',
  title: 'Testimony',
  description:
    'Share what God has done. Leaders may reach out to celebrate with you or ask if you’d share it on a Sunday.',
  subjectLink: {
    label: 'Find the person giving the testimony',
    helpText: 'Search by name or phone. Leave blank to create a new contact.',
    linkedNote: 'Linked to an existing person, so this testimony will be tied to their record.',
    prefill: { firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  },
  success: {
    title: 'Testimony shared',
    message: 'Thank you for sharing your testimony. To God be the glory!',
  },
  blocks: [
    {
      kind: 'section',
      id: 'about-you',
      title: 'About you',
      fields: [
        { id: 'firstName', type: 'text', label: 'First name', required: true },
        { id: 'lastName', type: 'text', label: 'Last name', required: true },
        { id: 'phone', type: 'tel', label: 'Phone', required: true },
        {
          id: 'todaysDate',
          type: 'date',
          label: 'Today’s date',
          required: true,
          defaultValue: 'today',
        },
      ],
    },
    {
      kind: 'section',
      id: 'testimony',
      title: 'Your testimony',
      fields: [
        {
          id: 'dateOfTestimony',
          type: 'date',
          label: 'Date this happened',
          required: true,
        },
        {
          id: 'category',
          type: 'select',
          label: 'Category',
          required: true,
          placeholder: 'Choose a category',
          options: [
            { value: 'Business', label: 'Business' },
            { value: 'Career/Job', label: 'Career / Job' },
            { value: 'Deliverance', label: 'Deliverance' },
            { value: 'Education', label: 'Education' },
            { value: 'Financial', label: 'Financial' },
            { value: 'Health/Healing', label: 'Health / Healing' },
            { value: 'Marriage/Family', label: 'Marriage / Family' },
            { value: 'Salvation', label: 'Salvation' },
            { value: 'Unusual Favour', label: 'Unusual Favour' },
            { value: 'Other', label: 'Other' },
          ],
        },
        {
          id: 'details',
          type: 'textarea',
          label: 'What happened?',
          required: true,
          placeholder: 'Tell us in your own words.',
        },
      ],
    },
    {
      kind: 'section',
      id: 'sharing',
      title: 'Sharing preferences',
      fields: [
        // Explicit yes/no rather than a checkbox. An untouched checkbox submits
        // `false`, which for an anonymity preference would record a decision
        // nobody made — and the API declares the key required, so it should
        // carry an answer somebody actually gave.
        {
          id: 'shareAnonymously',
          type: 'boolean',
          label: 'Share anonymously?',
          required: true,
          helpText: 'We won’t use your name if this is published.',
        },
        {
          id: 'happyToShareSunday',
          type: 'boolean',
          label: 'Happy to share during Sunday service?',
          required: true,
        },
      ],
    },
  ],
};

// ── Baby naming / dedication (share the same shell) ──────────────────

function babyForm(
  formType: 'baby_naming' | 'baby_dedication',
  title: string,
  description: string,
): FormDefinition {
  const preferredDateFieldId =
    formType === 'baby_dedication' ? 'preferredDedicationDate' : 'preferredCeremonyDate';
  const preferredDateLabel =
    formType === 'baby_dedication' ? 'Preferred dedication date' : 'Preferred ceremony date';
  return {
    formType,
    title,
    description,
    // The linked person is recorded as the baby's guardian, not as the subject
    // of the submission — the baby is. Hence the label, and hence a pre-fill
    // that touches the parent's phone and nothing else.
    subjectLink: {
      label: 'Find the parent/guardian',
      helpText: 'Search by name or phone to link an existing member. Leave blank otherwise.',
      linkedNote:
        'Linked to an existing member. They’ll be recorded as the parent/guardian.',
      prefill: { phone: 'parentContactPhone' },
    },
    success: {
      title: formType === 'baby_dedication' ? 'Dedication request submitted' : 'Naming request submitted',
      message: 'Your request has been recorded. A leader will follow up to confirm a date.',
    },
    blocks: [
      {
        kind: 'section',
        id: 'baby',
        title: 'About the baby',
        fields: [
          {
            id: 'babyFullName',
            type: 'text',
            label: 'Baby’s full name',
            required: true,
          },
          {
            id: 'dateOfBirth',
            type: 'date',
            label: 'Date of birth',
            required: true,
          },
          {
            id: 'gender',
            type: 'radio',
            label: 'Gender',
            options: [
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
            ],
          },
        ],
      },
      {
        kind: 'section',
        id: 'parents',
        title: 'Parents',
        fields: [
          {
            id: 'fatherMemberId',
            type: 'member',
            label: 'Father',
            placeholder: 'Search, or type their name if they’re not a member',
            freeTextFieldId: 'fathersName',
            required: true,
          },
          {
            id: 'motherMemberId',
            type: 'member',
            label: 'Mother',
            placeholder: 'Search, or type their name if they’re not a member',
            freeTextFieldId: 'mothersName',
            required: true,
          },
          ...(formType === 'baby_dedication'
            ? [
                {
                  id: 'parentsAreMembers',
                  type: 'checkbox' as const,
                  label: 'One or both parents are members of Kharis',
                },
              ]
            : []),
          {
            id: 'parentContactPhone',
            type: 'tel',
            label: 'Parent contact phone',
            required: true,
          },
          {
            id: 'parentContactEmail',
            type: 'email',
            label: 'Parent contact email',
          },
        ],
      },
      {
        kind: 'section',
        id: 'preferences',
        title: 'Preferences',
        fields: [
          {
            id: preferredDateFieldId,
            type: 'date',
            label: preferredDateLabel,
            helpText: 'Leaders will confirm the actual date.',
          },
          {
            id: 'additionalNotes',
            type: 'textarea',
            label: 'Anything else?',
            placeholder: 'Special requests, sponsors, etc.',
          },
        ],
      },
    ],
  };
}

export const BABY_NAMING_FORM = babyForm(
  'baby_naming',
  'Baby Naming',
  'Request a baby naming ceremony.',
);

export const BABY_DEDICATION_FORM = babyForm(
  'baby_dedication',
  'Baby Dedication',
  'Request a baby dedication.',
);

/** Registry of declarative form definitions, keyed by `FormType`. */
export const FORM_DEFINITIONS: Partial<Record<FormType, FormDefinition>> = {
  first_time_visitor: FIRST_TIME_VISITOR_FORM,
  altar_call: ALTAR_CALL_FORM,
  baptism: BAPTISM_FORM,
  testimony: TESTIMONY_FORM,
  baby_naming: BABY_NAMING_FORM,
  baby_dedication: BABY_DEDICATION_FORM,
};
