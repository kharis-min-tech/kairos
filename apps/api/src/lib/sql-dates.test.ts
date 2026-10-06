import { describe, it, expect } from 'vitest';
import { toIsoOrNull } from './sql-dates';

/**
 * The point of this helper is that the thing coming back from a raw SQL
 * fragment is not reliably a Date. These cases are the shapes actually seen.
 */
describe('toIsoOrNull', () => {
  it('passes a Date through', () => {
    expect(toIsoOrNull(new Date('2026-10-06T11:30:00Z'))).toBe('2026-10-06T11:30:00.000Z');
  });

  it('accepts the string postgres.js hands back for a raw aggregate', () => {
    expect(toIsoOrNull('2026-10-06 11:30:00')).toBe(new Date('2026-10-06 11:30:00').toISOString());
    expect(toIsoOrNull('2026-10-06')).toBe('2026-10-06T00:00:00.000Z');
  });

  it('returns null for an empty aggregate rather than throwing', () => {
    // MAX(...) over no rows is NULL, which is the common case for a soul
    // nobody has followed up yet.
    expect(toIsoOrNull(null)).toBeNull();
    expect(toIsoOrNull(undefined)).toBeNull();
  });

  it('returns null rather than "Invalid Date" for unparseable input', () => {
    expect(toIsoOrNull('not a date')).toBeNull();
    expect(toIsoOrNull(new Date('nonsense'))).toBeNull();
  });
});
