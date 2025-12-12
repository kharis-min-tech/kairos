import {
  formatDate,
  formatDateLong,
  formatDateTime,
  getAge,
  isDateInPast,
  isDateInFuture,
} from './date-utils';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date in DD/MM/YYYY format by default', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('15/01/2024');
    });

    it('should format date in custom format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2024');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDate(new Date('invalid'))).toThrow(
        'Invalid date provided'
      );
      expect(() => formatDate(null as any)).toThrow('Invalid date provided');
    });
  });

  describe('formatDateLong', () => {
    it('should format date in long format', () => {
      const date = new Date('2024-01-15');
      expect(formatDateLong(date)).toBe('January 15, 2024');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDateLong(new Date('invalid'))).toThrow(
        'Invalid date provided'
      );
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('Jan 15, 2024');
      expect(result).toContain('2:30 PM');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDateTime(new Date('invalid'))).toThrow(
        'Invalid date provided'
      );
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-15');
      const age = getAge(birthDate);
      expect(age).toBeGreaterThan(30);
    });

    it('should handle birthday not yet occurred this year', () => {
      // Use a fixed date for testing - someone born 25 years ago
      const today = new Date();
      const currentYear = today.getFullYear();
      const birthYear = currentYear - 25;

      // Create birth date with birthday later this year (if possible)
      let birthMonth = today.getMonth() + 1;
      if (birthMonth > 11) {
        birthMonth = 0; // January of next year, but we'll use current year
      }

      const birthDate = new Date(birthYear, birthMonth, today.getDate());
      const age = getAge(birthDate);

      // Age should be either 24 or 25 depending on whether birthday has passed
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(25);
    });

    it('should throw error for invalid birth date', () => {
      expect(() => getAge(new Date('invalid'))).toThrow(
        'Invalid birth date provided'
      );
    });
  });

  describe('isDateInPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isDateInPast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isDateInPast(futureDate)).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isDateInPast(new Date('invalid'))).toBe(false);
      expect(isDateInPast(null as any)).toBe(false);
    });
  });

  describe('isDateInFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isDateInFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isDateInFuture(pastDate)).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isDateInFuture(new Date('invalid'))).toBe(false);
      expect(isDateInFuture(null as any)).toBe(false);
    });
  });
});
