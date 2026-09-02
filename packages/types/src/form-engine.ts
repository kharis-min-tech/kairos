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

export interface FormDefinition {
  formType: FormType;
  title: string;
  description?: string;
  blocks: FormBlockDef[];
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

// ── First-time-visitor form definition (authored as data) ──

export const FIRST_TIME_VISITOR_FORM: FormDefinition = {
  formType: 'first_time_visitor',
  title: 'First-Time Visitor',
  description: 'Welcome! Tell us a little about yourself so we can follow up.',
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
        { id: 'guardianName', type: 'text', label: 'Guardian name', required: true },
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
          id: 'invitedBy',
          type: 'text',
          label: 'Who invited you?',
          placeholder: 'Name of the person who invited you',
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
        {
          id: 'shareAnonymously',
          type: 'checkbox',
          label: 'Share anonymously (don’t use my name if published)',
        },
        {
          id: 'happyToShareSunday',
          type: 'checkbox',
          label: 'I’d be happy to share this on a Sunday',
        },
        {
          id: 'acknowledged',
          type: 'checkbox',
          required: true,
          label: 'I confirm this is my testimony and Kharis may follow up with me.',
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
          { id: 'fathersName', type: 'text', label: 'Father’s name', required: true },
          { id: 'mothersName', type: 'text', label: 'Mother’s name', required: true },
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
