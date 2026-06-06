import { describe, expect, it } from 'vitest';
import { formatDate, formatShortDate, formatShortDateTime } from './date-format';

describe('date-format', () => {
  it('formats short dates in UK day/month/year order', () => {
    expect(formatShortDate('2026-05-21')).toBe('21/05/2026');
  });

  it('formats short datetimes in UK day/month/year order', () => {
    expect(formatShortDateTime('2026-05-21T14:30:00.000Z')).toMatch(/^21\/05\/2026, 1[45]:30$/);
  });

  it('formats month-name dates with UK ordering', () => {
    expect(formatDate('2026-05-21', { month: 'short', day: 'numeric' })).toBe('21 May');
  });
});
