import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  memberReferenceState,
  declaredFieldIds,
  initialFormValues,
  validateForm,
  buildFormPayload,
  FIRST_TIME_VISITOR_FORM,
  ALTAR_CALL_FORM,
  BAPTISM_FORM,
  TESTIMONY_FORM,
  BABY_NAMING_FORM,
  BABY_DEDICATION_FORM,
  FORM_DEFINITIONS,
  type FormConditionDef,
} from './form-engine';

// Fixed reference date so age math is deterministic.
const NOW = new Date('2026-05-23T12:00:00Z');

describe('evaluateCondition', () => {
  describe('equals', () => {
    it('matches when the field equals the value', () => {
      const cond: FormConditionDef = { field: 'isUnder16', op: 'equals', value: 'Yes' };
      expect(evaluateCondition(cond, { isUnder16: 'Yes' }, NOW)).toBe(true);
    });
    it('does not match when the field differs', () => {
      const cond: FormConditionDef = { field: 'isUnder16', op: 'equals', value: 'Yes' };
      expect(evaluateCondition(cond, { isUnder16: 'No' }, NOW)).toBe(false);
    });
    it('does not match when the field is absent', () => {
      const cond: FormConditionDef = { field: 'isUnder16', op: 'equals', value: 'Yes' };
      expect(evaluateCondition(cond, {}, NOW)).toBe(false);
    });
  });

  describe('notEquals', () => {
    it('matches when the field differs from the value', () => {
      const cond: FormConditionDef = { field: 'isUnder16', op: 'notEquals', value: 'Yes' };
      expect(evaluateCondition(cond, { isUnder16: 'No' }, NOW)).toBe(true);
    });
    it('does not match when the field equals the value', () => {
      const cond: FormConditionDef = { field: 'isUnder16', op: 'notEquals', value: 'Yes' };
      expect(evaluateCondition(cond, { isUnder16: 'Yes' }, NOW)).toBe(false);
    });
    it('matches an absent field (undefined !== value)', () => {
      const cond: FormConditionDef = { field: 'isUnder16', op: 'notEquals', value: 'Yes' };
      expect(evaluateCondition(cond, {}, NOW)).toBe(true);
    });
  });

  describe('isTruthy', () => {
    it('matches a truthy value', () => {
      const cond: FormConditionDef = { field: 'broughtChildren', op: 'isTruthy' };
      expect(evaluateCondition(cond, { broughtChildren: true }, NOW)).toBe(true);
    });
    it('matches a non-empty string', () => {
      const cond: FormConditionDef = { field: 'broughtChildren', op: 'isTruthy' };
      expect(evaluateCondition(cond, { broughtChildren: 'yes' }, NOW)).toBe(true);
    });
    it('does not match false / empty / absent', () => {
      const cond: FormConditionDef = { field: 'broughtChildren', op: 'isTruthy' };
      expect(evaluateCondition(cond, { broughtChildren: false }, NOW)).toBe(false);
      expect(evaluateCondition(cond, { broughtChildren: '' }, NOW)).toBe(false);
      expect(evaluateCondition(cond, {}, NOW)).toBe(false);
    });
  });

  describe('and / or combinators', () => {
    it('and requires every sub-condition', () => {
      const cond: FormConditionDef = {
        op: 'and',
        conditions: [
          { field: 'a', op: 'equals', value: 1 },
          { field: 'b', op: 'isTruthy' },
        ],
      };
      expect(evaluateCondition(cond, { a: 1, b: true }, NOW)).toBe(true);
      expect(evaluateCondition(cond, { a: 1, b: false }, NOW)).toBe(false);
      expect(evaluateCondition(cond, { a: 2, b: true }, NOW)).toBe(false);
    });

    it('or requires at least one sub-condition', () => {
      const cond: FormConditionDef = {
        op: 'or',
        conditions: [
          { field: 'a', op: 'equals', value: 1 },
          { field: 'b', op: 'isTruthy' },
        ],
      };
      expect(evaluateCondition(cond, { a: 1, b: false }, NOW)).toBe(true);
      expect(evaluateCondition(cond, { a: 2, b: true }, NOW)).toBe(true);
      expect(evaluateCondition(cond, { a: 2, b: false }, NOW)).toBe(false);
    });

    it('nests combinators', () => {
      const cond: FormConditionDef = {
        op: 'or',
        conditions: [
          { field: 'isUnder16', op: 'equals', value: 'Yes' },
          { field: 'dateOfBirth', op: 'ageUnder', value: 16 },
        ],
      };
      // self-report yes, dob over → matches via first arm
      expect(evaluateCondition(cond, { isUnder16: 'Yes', dateOfBirth: '1990-01-01' }, NOW)).toBe(true);
      // self-report no, dob under → matches via second arm
      expect(evaluateCondition(cond, { isUnder16: 'No', dateOfBirth: '2020-01-01' }, NOW)).toBe(true);
      // neither
      expect(evaluateCondition(cond, { isUnder16: 'No', dateOfBirth: '1990-01-01' }, NOW)).toBe(false);
    });
  });

  describe('ageUnder', () => {
    const cond: FormConditionDef = { field: 'dateOfBirth', op: 'ageUnder', value: 16 };

    it('is true when clearly under the threshold', () => {
      expect(evaluateCondition(cond, { dateOfBirth: '2020-05-23' }, NOW)).toBe(true);
    });

    it('is false when clearly over the threshold', () => {
      expect(evaluateCondition(cond, { dateOfBirth: '1990-05-23' }, NOW)).toBe(false);
    });

    it('boundary: exactly 16 today is NOT under 16', () => {
      // born exactly 16 years before NOW
      expect(evaluateCondition(cond, { dateOfBirth: '2010-05-23' }, NOW)).toBe(false);
    });

    it('boundary: one day shy of 16 IS under 16', () => {
      // 16th birthday is tomorrow → still 15
      expect(evaluateCondition(cond, { dateOfBirth: '2010-05-24' }, NOW)).toBe(true);
    });

    it('boundary: one day past 16 is NOT under 16', () => {
      // turned 16 yesterday
      expect(evaluateCondition(cond, { dateOfBirth: '2010-05-22' }, NOW)).toBe(false);
    });

    it('accepts a Date value as well as a string', () => {
      expect(evaluateCondition(cond, { dateOfBirth: new Date('2020-05-23') }, NOW)).toBe(true);
    });

    it('returns false for an unparseable / missing date', () => {
      expect(evaluateCondition(cond, { dateOfBirth: 'not-a-date' }, NOW)).toBe(false);
      expect(evaluateCondition(cond, {}, NOW)).toBe(false);
    });

    it('returns false when the threshold is not a number', () => {
      const bad: FormConditionDef = { field: 'dateOfBirth', op: 'ageUnder', value: 'sixteen' };
      expect(evaluateCondition(bad, { dateOfBirth: '2020-05-23' }, NOW)).toBe(false);
    });
  });
});

describe('FIRST_TIME_VISITOR_FORM', () => {
  it('is keyed to the first_time_visitor form type', () => {
    expect(FIRST_TIME_VISITOR_FORM.formType).toBe('first_time_visitor');
  });

  it('includes a repeatable children group gated on broughtChildren', () => {
    const children = FIRST_TIME_VISITOR_FORM.blocks.find(
      (b) => b.kind === 'repeatable' && b.id === 'children',
    );
    expect(children).toBeDefined();
    expect(children?.visibleWhen).toEqual({ field: 'broughtChildren', op: 'isTruthy' });
  });

  it('shows the guardian section for an under-16 date of birth', () => {
    const guardian = FIRST_TIME_VISITOR_FORM.blocks.find(
      (b) => b.kind === 'section' && b.id === 'guardian',
    );
    expect(guardian?.visibleWhen).toBeDefined();
    expect(evaluateCondition(guardian!.visibleWhen!, { dateOfBirth: '2020-01-01' }, NOW)).toBe(true);
    expect(evaluateCondition(guardian!.visibleWhen!, { dateOfBirth: '1990-01-01' }, NOW)).toBe(false);
  });
});

describe('memberReferenceState', () => {
  const guardian = { id: 'guardianMemberId', freeTextFieldId: 'guardianName' };

  it('is empty when neither key is set', () => {
    expect(memberReferenceState(guardian, {})).toBe('empty');
    expect(memberReferenceState(guardian, { guardianMemberId: '', guardianName: '' })).toBe(
      'empty',
    );
  });

  it('is empty when the typed name is only whitespace', () => {
    expect(memberReferenceState(guardian, { guardianName: '   ' })).toBe('empty');
  });

  it('is linked when the member id is set', () => {
    expect(memberReferenceState(guardian, { guardianMemberId: 'm-7' })).toBe('linked');
  });

  it('is named when only the free-text companion is set', () => {
    expect(memberReferenceState(guardian, { guardianName: 'Grace Adeyemi' })).toBe('named');
  });

  // Mutual exclusion is enforced on write, but reads must still be total:
  // legacy rows can carry both. The reference wins — it is the stronger claim
  // and it is the one a reviewer can open.
  it('prefers the reference when a legacy payload carries both', () => {
    expect(
      memberReferenceState(guardian, {
        guardianMemberId: 'm-7',
        guardianName: 'Grace Adeyemi',
      }),
    ).toBe('linked');
  });

  it('never reports named for a field with no free-text companion', () => {
    const invitedBy = { id: 'invitedByMemberId' };
    expect(memberReferenceState(invitedBy, { invitedBy: 'A friend' })).toBe('empty');
    expect(memberReferenceState(invitedBy, { invitedByMemberId: 'm-3' })).toBe('linked');
  });
});

describe('subjectLink', () => {
  // The copy is load-bearing: on a baby form the linked person becomes the
  // baby's GUARDIAN, so a generic "Find an existing person" would describe the
  // wrong relationship. Both renderers read it from here so they cannot drift.
  it('names the parent/guardian on both baby forms and pre-fills only the parent phone', () => {
    for (const def of [BABY_NAMING_FORM, BABY_DEDICATION_FORM]) {
      expect(def.subjectLink?.label).toBe('Find the parent/guardian');
      expect(def.subjectLink?.prefill).toEqual({ phone: 'parentContactPhone' });
    }
  });

  it('pre-fills name and phone on the forms that ask for them', () => {
    for (const def of [FIRST_TIME_VISITOR_FORM, ALTAR_CALL_FORM, BAPTISM_FORM, TESTIMONY_FORM]) {
      expect(def.subjectLink?.prefill).toEqual({
        firstName: 'firstName',
        lastName: 'lastName',
        phone: 'phone',
      });
    }
  });

  it('only ever names fields the form actually declares', () => {
    for (const def of Object.values(FORM_DEFINITIONS)) {
      const declared = declaredFieldIds(def!);
      for (const target of Object.values(def!.subjectLink?.prefill ?? {})) {
        expect(declared.has(target)).toBe(true);
      }
    }
  });
});

describe('declaredFieldIds', () => {
  it('includes repeatable sub-fields and free-text twins', () => {
    const ids = declaredFieldIds(FIRST_TIME_VISITOR_FORM);
    expect(ids.has('guardianMemberId')).toBe(true);
    expect(ids.has('guardianName')).toBe(true); // the twin, which is not a field
    expect(ids.has('broughtChildren')).toBe(true);
    expect(ids.has('dateOfBirth')).toBe(true); // declared on the children group too
    expect(ids.has('nope')).toBe(false);
  });
});

// One implementation, two renderers. These used to be hand-copied into the web
// and mobile form renderers, and they had already drifted apart.
describe('renderer core (shared by web and mobile)', () => {
  const FIXED = new Date('2026-05-23T12:00:00Z');

  describe('initialFormValues', () => {
    it("resolves a date field's 'today' default", () => {
      const { values } = initialFormValues(ALTAR_CALL_FORM, FIXED);
      expect(values.todaysDate).toBe('2026-05-23');
    });

    it('seeds checkboxes false and text empty, and creates `min` repeatable rows', () => {
      const { values, rows } = initialFormValues(FIRST_TIME_VISITOR_FORM, FIXED);
      expect(values.broughtChildren).toBe(false);
      expect(values.firstName).toBe('');
      expect(rows.children).toEqual([]); // min 0
    });
  });

  describe('validateForm', () => {
    const baby = initialFormValues(BABY_NAMING_FORM, FIXED);

    it('requires both parents when neither key is set', () => {
      const errors = validateForm(BABY_NAMING_FORM, baby, FIXED);
      expect(errors.fatherMemberId).toBe('Father is required');
      expect(errors.motherMemberId).toBe('Mother is required');
    });

    it('is satisfied by a reference on one parent and a typed name on the other', () => {
      const errors = validateForm(
        BABY_NAMING_FORM,
        { ...baby, values: { ...baby.values, fatherMemberId: 'm-1', mothersName: 'Jane Doe' } },
        FIXED,
      );
      expect(errors.fatherMemberId).toBeUndefined();
      expect(errors.motherMemberId).toBeUndefined();
    });

    it('skips fields inside a hidden block', () => {
      const ftv = initialFormValues(FIRST_TIME_VISITOR_FORM, FIXED);
      // Guardian section is hidden for an adult, so it imposes nothing.
      const adult = { ...ftv, values: { ...ftv.values, isUnder16: 'No' } };
      expect(validateForm(FIRST_TIME_VISITOR_FORM, adult, FIXED).guardianMemberId).toBeUndefined();

      const minor = { ...ftv, values: { ...ftv.values, isUnder16: 'Yes' } };
      expect(validateForm(FIRST_TIME_VISITOR_FORM, minor, FIXED).guardianMemberId).toBe(
        'Guardian is required',
      );
    });
  });

  describe('buildFormPayload', () => {
    const baby = initialFormValues(BABY_NAMING_FORM, FIXED);

    it('emits the reference for a picked parent and the name for a typed one, never both', () => {
      const payload = buildFormPayload(
        BABY_NAMING_FORM,
        {
          ...baby,
          values: {
            ...baby.values,
            babyFullName: 'Baby Doe',
            fatherMemberId: 'm-1',
            mothersName: ' Jane Doe ',
            parentContactPhone: '0700',
          },
        },
        FIXED,
      );
      expect(payload.fatherMemberId).toBe('m-1');
      expect(payload.fathersName).toBeUndefined();
      expect(payload.mothersName).toBe('Jane Doe'); // trimmed
      expect(payload.motherMemberId).toBeUndefined();
    });

    it('drops a legacy name when a reference is also present', () => {
      const payload = buildFormPayload(
        BABY_NAMING_FORM,
        {
          ...baby,
          values: { ...baby.values, fatherMemberId: 'm-1', fathersName: 'Stale Name' },
        },
        FIXED,
      );
      expect(payload.fatherMemberId).toBe('m-1');
      expect(payload.fathersName).toBeUndefined();
    });

    it('omits hidden blocks and keys repeatable rows under the group id', () => {
      const ftv = initialFormValues(FIRST_TIME_VISITOR_FORM, FIXED);
      const payload = buildFormPayload(
        FIRST_TIME_VISITOR_FORM,
        {
          values: { ...ftv.values, firstName: 'Tunde', isUnder16: 'No', broughtChildren: true },
          rows: { children: [{ firstName: 'Kid', lastName: 'Bakare' }] },
        },
        FIXED,
      );
      expect(payload.firstName).toBe('Tunde');
      expect(payload.guardianName).toBeUndefined(); // guardian section hidden
      expect(payload.children).toEqual([{ firstName: 'Kid', lastName: 'Bakare' }]);
    });
  });
});

// A checkbox submits `false` whether somebody chose "no" or never looked at it.
// For a preference the API declares required — anonymity above all — that
// difference is the whole question, so `boolean` fields start unanswered.
describe('boolean fields (explicit yes/no)', () => {
  const FIXED = new Date('2026-05-23T12:00:00Z');

  it('starts unanswered rather than false', () => {
    const { values } = initialFormValues(TESTIMONY_FORM, FIXED);
    expect(values.shareAnonymously).toBeUndefined();
    expect(values.happyToShareSunday).toBeUndefined();
    // A plain checkbox still starts false — it is an opt-in, not a question.
    expect(initialFormValues(FIRST_TIME_VISITOR_FORM, FIXED).values.broughtChildren).toBe(
      false,
    );
  });

  it('fails validation while unanswered, and passes on either answer', () => {
    const base = initialFormValues(TESTIMONY_FORM, FIXED);
    expect(validateForm(TESTIMONY_FORM, base, FIXED).shareAnonymously).toBe(
      'Share anonymously? is required',
    );

    for (const answer of [true, false]) {
      const answered = {
        ...base,
        values: { ...base.values, shareAnonymously: answer },
      };
      expect(validateForm(TESTIMONY_FORM, answered, FIXED).shareAnonymously).toBeUndefined();
    }
  });

  it('submits the boolean it was given, including false', () => {
    const base = initialFormValues(TESTIMONY_FORM, FIXED);
    const payload = buildFormPayload(
      TESTIMONY_FORM,
      {
        ...base,
        values: { ...base.values, shareAnonymously: false, happyToShareSunday: true },
      },
      FIXED,
    );
    // `false` has to reach the wire: the API schema requires the key.
    expect(payload.shareAnonymously).toBe(false);
    expect(payload.happyToShareSunday).toBe(true);
  });

  it('omits the key entirely while unanswered, rather than guessing false', () => {
    const base = initialFormValues(TESTIMONY_FORM, FIXED);
    const payload = buildFormPayload(TESTIMONY_FORM, base, FIXED);
    expect('shareAnonymously' in payload).toBe(false);
  });
});

describe('success copy', () => {
  it('is defined for every form, so neither platform falls back to generic text', () => {
    for (const def of Object.values(FORM_DEFINITIONS)) {
      expect(def!.success?.title).toBeTruthy();
      expect(def!.success?.message).toBeTruthy();
    }
  });

  it('gives the altar call a different line when the person was linked', () => {
    expect(ALTAR_CALL_FORM.success?.linkedMessage).toMatch(/linked and enrolled/);
    expect(ALTAR_CALL_FORM.success?.message).toMatch(/new contact was created/);
  });

  it('names the ceremony each baby form is actually for', () => {
    expect(BABY_NAMING_FORM.success?.title).toBe('Naming request submitted');
    expect(BABY_DEDICATION_FORM.success?.title).toBe('Dedication request submitted');
  });
});
