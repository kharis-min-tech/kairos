import { describe, it, expect } from 'vitest';
import { isMinorMember, MINOR_AGE_THRESHOLD } from './minor';

const NOW = new Date('2026-05-26T00:00:00Z');

describe('isMinorMember', () => {
  it('treats memberType "child" as a minor regardless of DOB', () => {
    expect(isMinorMember({ memberType: 'child' }, NOW)).toBe(true);
    expect(isMinorMember({ memberType: 'child', dateOfBirth: '1990-01-01' }, NOW)).toBe(true);
  });

  it('is false for a member with no type and no DOB', () => {
    expect(isMinorMember({}, NOW)).toBe(false);
    expect(isMinorMember({ memberType: 'member' }, NOW)).toBe(false);
  });

  it('derives minor status from DOB when under the threshold', () => {
    // age 10
    expect(isMinorMember({ dateOfBirth: '2016-01-01' }, NOW)).toBe(true);
    // age 15 — still a minor
    expect(isMinorMember({ memberType: 'visitor', dateOfBirth: '2010-06-01' }, NOW)).toBe(true);
  });

  it('is false at and above the threshold', () => {
    // turned 16 a year ago
    expect(isMinorMember({ dateOfBirth: '2009-01-01' }, NOW)).toBe(false);
    expect(isMinorMember({ memberType: 'member', dateOfBirth: '1980-01-01' }, NOW)).toBe(false);
  });

  it('handles the threshold birthday boundary (exactly 16 today is NOT a minor)', () => {
    expect(isMinorMember({ dateOfBirth: '2010-05-26' }, NOW)).toBe(false); // exactly 16
    expect(isMinorMember({ dateOfBirth: '2010-05-27' }, NOW)).toBe(true); // 15, turns 16 tomorrow
  });

  it('ignores unparseable DOB', () => {
    expect(isMinorMember({ dateOfBirth: 'not-a-date' }, NOW)).toBe(false);
    expect(isMinorMember({ dateOfBirth: null }, NOW)).toBe(false);
  });

  it('exposes the threshold as 16', () => {
    expect(MINOR_AGE_THRESHOLD).toBe(16);
  });
});
