import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  FIRST_TIME_VISITOR_FORM,
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
