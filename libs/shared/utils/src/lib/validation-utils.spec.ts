import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePasswordStrength,
  validateUrl,
  validateNumberRange,
} from './validation-utils';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user..double.dot@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1 (555) 123-4567')).toBe(true);
      expect(validatePhone('555.123.4567')).toBe(true);
      expect(validatePhone('+44 20 7946 0958')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false); // Too short
      expect(validatePhone('12345678901234567890')).toBe(false); // Too long
      expect(validatePhone('abc123def456')).toBe(false); // Contains letters
      expect(validatePhone('')).toBe(false);
      expect(validatePhone(null as any)).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty strings', () => {
      expect(validateRequired('hello')).toBe(true);
      expect(validateRequired('  hello  ')).toBe(true);
    });

    it('should reject empty or whitespace strings', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired('\t\n')).toBe(false);
      expect(validateRequired(null as any)).toBe(false);
    });
  });

  describe('validateMinLength', () => {
    it('should validate strings meeting minimum length', () => {
      expect(validateMinLength('hello', 3)).toBe(true);
      expect(validateMinLength('hello', 5)).toBe(true);
      expect(validateMinLength('  hello  ', 5)).toBe(true); // Trimmed length
    });

    it('should reject strings below minimum length', () => {
      expect(validateMinLength('hi', 3)).toBe(false);
      expect(validateMinLength('', 1)).toBe(false);
      expect(validateMinLength(null as any, 1)).toBe(false);
    });
  });

  describe('validateMaxLength', () => {
    it('should validate strings within maximum length', () => {
      expect(validateMaxLength('hello', 10)).toBe(true);
      expect(validateMaxLength('hello', 5)).toBe(true);
      expect(validateMaxLength('', 5)).toBe(true);
    });

    it('should reject strings exceeding maximum length', () => {
      expect(validateMaxLength('hello world', 5)).toBe(false);
    });

    it('should handle null/undefined values', () => {
      expect(validateMaxLength(null as any, 5)).toBe(true);
      expect(validateMaxLength(undefined as any, 5)).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      expect(validatePasswordStrength('password123')).toBe(true);
      expect(validatePasswordStrength('MySecure1Pass')).toBe(true);
      expect(validatePasswordStrength('abc12345')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePasswordStrength('short1')).toBe(false); // Too short
      expect(validatePasswordStrength('onlyletters')).toBe(false); // No numbers
      expect(validatePasswordStrength('12345678')).toBe(false); // No letters
      expect(validatePasswordStrength('')).toBe(false);
      expect(validatePasswordStrength(null as any)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://test.org/path?query=1')).toBe(true);
      expect(validateUrl('ftp://files.example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('http://')).toBe(false);
      expect(validateUrl('')).toBe(false);
      expect(validateUrl(null as any)).toBe(false);
    });
  });

  describe('validateNumberRange', () => {
    it('should validate numbers within range', () => {
      expect(validateNumberRange(5, 1, 10)).toBe(true);
      expect(validateNumberRange(1, 1, 10)).toBe(true); // Min boundary
      expect(validateNumberRange(10, 1, 10)).toBe(true); // Max boundary
      expect(validateNumberRange(0, -5, 5)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(validateNumberRange(0, 1, 10)).toBe(false);
      expect(validateNumberRange(11, 1, 10)).toBe(false);
      expect(validateNumberRange(-1, 0, 10)).toBe(false);
    });

    it('should reject invalid numbers', () => {
      expect(validateNumberRange(NaN, 1, 10)).toBe(false);
      expect(validateNumberRange(null as any, 1, 10)).toBe(false);
      expect(validateNumberRange('5' as any, 1, 10)).toBe(false);
    });
  });
});
