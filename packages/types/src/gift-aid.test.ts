import { describe, it, expect } from 'vitest';
import {
  GIFT_AID_CHARITY_NAME,
  GIFT_AID_PERIOD_END_DAY,
  GIFT_AID_PERIOD_END_MONTH,
  accountingPeriodEnd,
  backdateFloor,
  claimDeadlineFor,
  fitsScheduleNameColumn,
  isUkPostcode,
  normalisePostcode,
  renderDeclarationText,
  requiresPostcode,
  retentionReviewDateFor,
} from './gift-aid';

const iso = (d: Date) => d.toISOString().slice(0, 10);

// ── The accounting period ─────────────────────────────────
//
// Both the claim deadline and the retention clock hang off the period end,
// so an off-by-one here is a year of exposure in either direction. The
// period runs June to May, ending 31 May.

describe('accountingPeriodEnd', () => {
  it('is configured to the stated June-to-May period', () => {
    expect(GIFT_AID_PERIOD_END_MONTH).toBe(5);
    expect(GIFT_AID_PERIOD_END_DAY).toBe(31);
  });

  it('puts a mid-period gift in the period ending the following May', () => {
    expect(iso(accountingPeriodEnd(new Date('2026-10-30T00:00:00Z')))).toBe('2027-05-31');
  });

  it('puts a gift early in the calendar year in that May', () => {
    expect(iso(accountingPeriodEnd(new Date('2027-01-15T00:00:00Z')))).toBe('2027-05-31');
  });

  it('keeps a gift received ON the last day inside that period', () => {
    // The boundary case. Comparing timestamps rather than dates used to push
    // an afternoon gift on 31 May into the next period.
    expect(iso(accountingPeriodEnd(new Date('2027-05-31T00:00:00Z')))).toBe('2027-05-31');
    expect(iso(accountingPeriodEnd(new Date('2027-05-31T14:30:00Z')))).toBe('2027-05-31');
    expect(iso(accountingPeriodEnd(new Date('2027-05-31T23:59:59Z')))).toBe('2027-05-31');
  });

  it('rolls the first day of a new period into the next May', () => {
    expect(iso(accountingPeriodEnd(new Date('2027-06-01T00:00:00Z')))).toBe('2028-05-31');
  });
});

describe('claimDeadlineFor', () => {
  it('is four years after the end of the period the gift fell in', () => {
    expect(iso(claimDeadlineFor(new Date('2026-10-30T00:00:00Z')))).toBe('2031-05-31');
  });

  it('gives a gift on the last day of a period the shorter window', () => {
    // 31 May 2027 and 1 June 2027 are one day apart and a year apart in
    // deadline. This is the pair worth getting right.
    expect(iso(claimDeadlineFor(new Date('2027-05-31T12:00:00Z')))).toBe('2031-05-31');
    expect(iso(claimDeadlineFor(new Date('2027-06-01T12:00:00Z')))).toBe('2032-05-31');
  });
});

describe('retentionReviewDateFor', () => {
  it('is six years after the end of the period the gift fell in', () => {
    expect(iso(retentionReviewDateFor(new Date('2026-10-30T00:00:00Z')))).toBe('2033-05-31');
  });

  it('always falls after the claim deadline for the same gift', () => {
    const on = new Date('2026-10-30T00:00:00Z');
    expect(retentionReviewDateFor(on).getTime()).toBeGreaterThan(claimDeadlineFor(on).getTime());
  });
});

describe('backdateFloor', () => {
  it('reaches exactly four years back from the declaration date', () => {
    expect(iso(backdateFloor(new Date('2026-10-30T00:00:00Z')))).toBe('2022-10-30');
  });

  it('does not depend on the accounting period', () => {
    // Backdating is a fixed four years from the donor's declaration, not a
    // period boundary, so a 31 May and a 1 June declaration differ by a day.
    expect(iso(backdateFloor(new Date('2027-05-31T00:00:00Z')))).toBe('2023-05-31');
    expect(iso(backdateFloor(new Date('2027-06-01T00:00:00Z')))).toBe('2023-06-01');
  });
});

// ── Claim-schedule shaping ────────────────────────────────

describe('normalisePostcode', () => {
  it('writes HMRC claim format: capitals, single space', () => {
    expect(normalisePostcode('se12ab')).toBe('SE1 2AB');
    expect(normalisePostcode('  sw1a   1aa ')).toBe('SW1A 1AA');
    expect(normalisePostcode('SE1 2AB')).toBe('SE1 2AB');
  });

  it('leaves something too short to split alone rather than mangling it', () => {
    expect(normalisePostcode('AB1')).toBe('AB1');
  });
});

describe('isUkPostcode', () => {
  it('accepts real formats with or without the space', () => {
    for (const pc of ['SE1 2AB', 'se12ab', 'SW1A 1AA', 'M1 1AE', 'B33 8TH', 'CR2 6XH']) {
      expect(isUkPostcode(pc), pc).toBe(true);
    }
  });

  it('rejects what is not a postcode', () => {
    for (const pc of ['NOTAPOSTCODE', '12345', 'SE1', '', 'ABC DEFG']) {
      expect(isUkPostcode(pc), pc).toBe(false);
    }
  });
});

describe('requiresPostcode', () => {
  it('requires one for the UK and not elsewhere', () => {
    expect(requiresPostcode('GB')).toBe(true);
    expect(requiresPostcode('gb')).toBe(true);
    // HMRC rejects Isle of Man and Channel Islands postcodes outright, so
    // those count as overseas and give a full address instead.
    expect(requiresPostcode('IM')).toBe(false);
    expect(requiresPostcode('JE')).toBe(false);
    expect(requiresPostcode('GH')).toBe(false);
  });
});

describe('fitsScheduleNameColumn', () => {
  it('accepts a name that fits HMRC 35-character column', () => {
    expect(fitsScheduleNameColumn('Ade', 'Bolarinwa')).toBe(true);
  });

  it('rejects one that does not', () => {
    expect(fitsScheduleNameColumn('Bartholomew Maximilian', 'Fotheringay-Smythe')).toBe(false);
  });
});

// ── The declaration text ──────────────────────────────────

describe('renderDeclarationText', () => {
  it('names the charity and asks for Gift Aid', () => {
    const text = renderDeclarationText({ coverage: 'past_and_future' });
    expect(text).toContain(GIFT_AID_CHARITY_NAME);
    expect(text).toContain('I want to Gift Aid');
  });

  it('explains the tax liability rather than merely asserting UK taxpayer status', () => {
    // HMRC 3.6.7: "I am a UK taxpayer" alone is NOT sufficient. If this
    // assertion ever fails, every declaration made under the wording is
    // invalid and the tax is repayable with interest.
    const text = renderDeclarationText({ coverage: 'past_and_future' });
    expect(text).toContain('responsibility to pay the difference');
    expect(text).toContain('all my donations to all charities');
  });

  it('says what it covers, unambiguously, per coverage', () => {
    expect(renderDeclarationText({ coverage: 'past_and_future' })).toContain('past 4 years');
    expect(renderDeclarationText({ coverage: 'future' })).not.toContain('past 4 years');
    expect(renderDeclarationText({ coverage: 'future' })).toContain('today and in the future');
  });

  it('names the gift on a single-gift declaration', () => {
    const text = renderDeclarationText({
      coverage: 'single',
      singleGiftDescription: 'the enclosed 50 pounds',
    });
    expect(text).toContain('the enclosed 50 pounds');
  });

  it('asks the donor to tell us about a change of name, address or tax position', () => {
    const text = renderDeclarationText({ coverage: 'past_and_future' });
    expect(text).toContain('change my name or home address');
    expect(text).toContain('stop paying enough tax');
  });
});
