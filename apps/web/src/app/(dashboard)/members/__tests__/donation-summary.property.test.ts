// Feature: members-module, Property 3: Donation summary correctly computes totals by purpose
// Feature: members-module, Property 4: Donation date range filtering
// **Validates: Requirements 2.3, 2.5**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pure functions under test ---

interface DonationRecord {
  donationDate: string;
  amount: number;
  donationPurpose: string;
  paymentMethod: string;
}

function computeDonationSummary(donations: DonationRecord[]): {
  total: number;
  byPurpose: Record<string, number>;
} {
  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  const byPurpose: Record<string, number> = {};
  for (const d of donations) {
    byPurpose[d.donationPurpose] = (byPurpose[d.donationPurpose] ?? 0) + d.amount;
  }
  return { total, byPurpose };
}

function filterDonationsByDateRange(
  donations: DonationRecord[],
  startDate: string,
  endDate: string
): DonationRecord[] {
  return donations.filter((d) => {
    const date = d.donationDate;
    return date >= startDate && date <= endDate;
  });
}

// --- Generators ---

const PURPOSES = ['Offering', 'Tithe', 'Building Fund', 'Other'] as const;
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online'] as const;

/** Generate a valid YYYY-MM-DD date string within 2020–2026 */
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2026 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }) // 28 avoids invalid month-end issues
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const donationRecordArb: fc.Arbitrary<DonationRecord> = fc.record({
  donationDate: dateStringArb,
  amount: fc.integer({ min: 1, max: 100000 }).map((n) => n / 100), // 0.01 to 1000.00
  donationPurpose: fc.constantFrom(...PURPOSES),
  paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
});

const donationListArb = fc.array(donationRecordArb, { minLength: 0, maxLength: 50 });

// --- Property 3: Donation summary correctly computes totals by purpose ---

describe('Property 3: Donation summary correctly computes totals by purpose', () => {
  it('total equals sum of all amounts', () => {
    fc.assert(
      fc.property(donationListArb, (donations) => {
        const summary = computeDonationSummary(donations);
        const expectedTotal = donations.reduce((sum, d) => sum + d.amount, 0);
        expect(summary.total).toBeCloseTo(expectedTotal, 10);
      }),
      { numRuns: 100 }
    );
  });

  it('sum of byPurpose values equals total', () => {
    fc.assert(
      fc.property(donationListArb, (donations) => {
        const summary = computeDonationSummary(donations);
        const purposeSum = Object.values(summary.byPurpose).reduce((s, v) => s + v, 0);
        expect(purposeSum).toBeCloseTo(summary.total, 10);
      }),
      { numRuns: 100 }
    );
  });

  it('each purpose total equals sum of amounts for that purpose', () => {
    fc.assert(
      fc.property(donationListArb, (donations) => {
        const summary = computeDonationSummary(donations);
        for (const purpose of PURPOSES) {
          const expected = donations
            .filter((d) => d.donationPurpose === purpose)
            .reduce((sum, d) => sum + d.amount, 0);
          expect(summary.byPurpose[purpose] ?? 0).toBeCloseTo(expected, 10);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 4: Donation date range filtering ---

describe('Property 4: Donation date range filtering', () => {
  const dateRangeArb = fc
    .tuple(dateStringArb, dateStringArb)
    .map(([a, b]) => {
      const sorted = [a, b].sort();
      return { startDate: sorted[0], endDate: sorted[1] };
    });

  it('all filtered donations have dates within the range', () => {
    fc.assert(
      fc.property(donationListArb, dateRangeArb, (donations, { startDate, endDate }) => {
        const filtered = filterDonationsByDateRange(donations, startDate, endDate);
        for (const d of filtered) {
          expect(d.donationDate >= startDate).toBe(true);
          expect(d.donationDate <= endDate).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no donations outside the range are included', () => {
    fc.assert(
      fc.property(donationListArb, dateRangeArb, (donations, { startDate, endDate }) => {
        const filtered = filterDonationsByDateRange(donations, startDate, endDate);
        const outsideRange = donations.filter(
          (d) => d.donationDate < startDate || d.donationDate > endDate
        );
        for (const outside of outsideRange) {
          expect(filtered).not.toContain(outside);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('empty range returns empty results', () => {
    fc.assert(
      fc.property(donationListArb, (donations) => {
        // Use a date range where endDate < startDate (impossible range)
        const filtered = filterDonationsByDateRange(donations, '2026-12-31', '2020-01-01');
        expect(filtered).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});
