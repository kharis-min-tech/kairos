import {
  capitalizeWords,
  capitalizeFirst,
  toKebabCase,
  toCamelCase,
  toPascalCase,
  truncateString,
  normalizeWhitespace,
  getInitials,
  maskString,
  generateSlug,
  isAlphabetic,
  isNumeric,
  isAlphanumeric,
} from './string-utils';

describe('String Utils', () => {
  describe('capitalizeWords', () => {
    it('should capitalize each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('john doe smith')).toBe('John Doe Smith');
      expect(capitalizeWords('UPPERCASE TEXT')).toBe('Uppercase Text');
    });

    it('should handle edge cases', () => {
      expect(capitalizeWords('')).toBe('');
      expect(capitalizeWords('single')).toBe('Single');
      expect(capitalizeWords(null as any)).toBe('');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize only the first letter', () => {
      expect(capitalizeFirst('hello world')).toBe('Hello world');
      expect(capitalizeFirst('UPPERCASE')).toBe('Uppercase');
      expect(capitalizeFirst('mixedCASE')).toBe('Mixedcase');
    });

    it('should handle edge cases', () => {
      expect(capitalizeFirst('')).toBe('');
      expect(capitalizeFirst('a')).toBe('A');
      expect(capitalizeFirst(null as any)).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase('Hello World')).toBe('hello-world');
      expect(toKebabCase('camelCaseString')).toBe('camel-case-string');
      expect(toKebabCase('PascalCaseString')).toBe('pascal-case-string');
      expect(toKebabCase('snake_case_string')).toBe('snake-case-string');
    });

    it('should handle edge cases', () => {
      expect(toKebabCase('')).toBe('');
      expect(toKebabCase('single')).toBe('single');
      expect(toKebabCase(null as any)).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('should convert to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('Hello World')).toBe('helloWorld');
      expect(toCamelCase('kebab-case-string')).toBe('kebabCaseString');
    });

    it('should handle edge cases', () => {
      expect(toCamelCase('')).toBe('');
      expect(toCamelCase('single')).toBe('single');
      expect(toCamelCase(null as any)).toBe('');
    });
  });

  describe('toPascalCase', () => {
    it('should convert to PascalCase', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
      expect(toPascalCase('camelCase')).toBe('CamelCase');
      expect(toPascalCase('kebab-case-string')).toBe('KebabCaseString');
    });

    it('should handle edge cases', () => {
      expect(toPascalCase('')).toBe('');
      expect(toPascalCase('single')).toBe('Single');
      expect(toPascalCase(null as any)).toBe('');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('This is a long string', 10)).toBe('This is...');
      expect(truncateString('Short', 10)).toBe('Short');
    });

    it('should use custom suffix', () => {
      expect(truncateString('This is a long string', 10, '---')).toBe(
        'This is---'
      );
    });

    it('should handle edge cases', () => {
      expect(truncateString('', 10)).toBe('');
      expect(truncateString(null as any, 10)).toBe('');
      expect(truncateString('test', 4)).toBe('test');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should normalize whitespace', () => {
      expect(normalizeWhitespace('  hello    world  ')).toBe('hello world');
      expect(normalizeWhitespace('text\t\nwith\r\nwhitespace')).toBe(
        'text with whitespace'
      );
    });

    it('should handle edge cases', () => {
      expect(normalizeWhitespace('')).toBe('');
      expect(normalizeWhitespace('   ')).toBe('');
      expect(normalizeWhitespace(null as any)).toBe('');
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('John Michael Doe')).toBe('JM');
      expect(getInitials('John Michael Doe Smith', 3)).toBe('JMD');
    });

    it('should handle edge cases', () => {
      expect(getInitials('')).toBe('');
      expect(getInitials('John')).toBe('J');
      expect(getInitials(null as any)).toBe('');
    });
  });

  describe('maskString', () => {
    it('should mask string with default settings', () => {
      expect(maskString('1234567890')).toBe('12******90');
      expect(maskString('email@domain.com')).toBe('em************om');
    });

    it('should use custom masking parameters', () => {
      expect(maskString('1234567890', 3, 1, '#')).toBe('123######0');
    });

    it('should handle short strings', () => {
      expect(maskString('abc')).toBe('abc');
      expect(maskString('ab', 2, 2)).toBe('ab');
    });

    it('should handle edge cases', () => {
      expect(maskString('')).toBe('');
      expect(maskString(null as any)).toBe('');
    });
  });

  describe('generateSlug', () => {
    it('should generate URL-friendly slugs', () => {
      expect(generateSlug('Hello World!')).toBe('hello-world');
      expect(generateSlug('This is a Test & Example')).toBe(
        'this-is-a-test-example'
      );
      expect(generateSlug('  Spaced   Out  ')).toBe('spaced-out');
    });

    it('should handle edge cases', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug('!!!')).toBe('');
      expect(generateSlug(null as any)).toBe('');
    });
  });

  describe('isAlphabetic', () => {
    it('should validate alphabetic strings', () => {
      expect(isAlphabetic('hello')).toBe(true);
      expect(isAlphabetic('WORLD')).toBe(true);
      expect(isAlphabetic('MixedCase')).toBe(true);
    });

    it('should reject non-alphabetic strings', () => {
      expect(isAlphabetic('hello123')).toBe(false);
      expect(isAlphabetic('hello world')).toBe(false);
      expect(isAlphabetic('hello!')).toBe(false);
      expect(isAlphabetic('')).toBe(false);
      expect(isAlphabetic(null as any)).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should validate numeric strings', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('0')).toBe(true);
      expect(isNumeric('999999')).toBe(true);
    });

    it('should reject non-numeric strings', () => {
      expect(isNumeric('123.45')).toBe(false);
      expect(isNumeric('123a')).toBe(false);
      expect(isNumeric('12 34')).toBe(false);
      expect(isNumeric('')).toBe(false);
      expect(isNumeric(null as any)).toBe(false);
    });
  });

  describe('isAlphanumeric', () => {
    it('should validate alphanumeric strings', () => {
      expect(isAlphanumeric('hello123')).toBe(true);
      expect(isAlphanumeric('ABC123')).toBe(true);
      expect(isAlphanumeric('test')).toBe(true);
      expect(isAlphanumeric('123')).toBe(true);
    });

    it('should reject non-alphanumeric strings', () => {
      expect(isAlphanumeric('hello world')).toBe(false);
      expect(isAlphanumeric('test!')).toBe(false);
      expect(isAlphanumeric('test-123')).toBe(false);
      expect(isAlphanumeric('')).toBe(false);
      expect(isAlphanumeric(null as any)).toBe(false);
    });
  });
});
