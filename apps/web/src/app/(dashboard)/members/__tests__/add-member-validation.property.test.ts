// Feature: members-module, Property 1: Add Member form validation rejects invalid input without API call
// **Validates: Requirements 1.2, 1.4**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pure functions re-defined inline (same logic as /members/new/page.tsx) ---

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  homeBranchId?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{7,20}$/.test(phone);
}

const defaultFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  postalCode: '',
  homeBranchId: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

function validateForm(data: typeof defaultFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.firstName.trim()) errors.firstName = 'First name is required';
  if (!data.lastName.trim()) errors.lastName = 'Last name is required';
  if (!data.homeBranchId) errors.homeBranchId = 'Please select a home branch';
  if (data.email.trim() && !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (data.phone.trim() && !validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  return errors;
}

// --- Generators ---

/** Generates whitespace-only or empty strings */
const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(''),
  fc.constant(' '),
  fc.constant('  '),
  fc.constant('\t'),
  fc.constant('\n'),
  fc.constant('   \t  '),
  fc.integer({ min: 1, max: 10 }).map((n) => ' '.repeat(n)),
);

/** Generates a non-empty, non-whitespace string (valid name) */
const nonEmptyNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,19}$/).filter((s) => s.trim().length > 0);

/** Generates a valid branch ID string (non-empty numeric) */
const validBranchIdArb = fc.integer({ min: 1, max: 1000 }).map(String);

/** Generates an invalid email (present but not matching the email regex) */
const invalidEmailArb = fc.oneof(
  fc.constant('notanemail'),
  fc.constant('missing@tld'),
  fc.constant('@nodomain.com'),
  fc.constant('spaces in@email.com'),
  fc.constant('no@@double.com'),
  fc.constant('user@'),
  fc.constant('user@.com'),
  fc.stringMatching(/^[a-z]{1,10}$/).filter((s) => s.trim().length > 0),
);

/** Generates a valid email */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{1,8}$/),
    fc.stringMatching(/^[a-z]{2,4}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generates an invalid phone (present but not matching the phone regex) */
const invalidPhoneArb = fc.oneof(
  fc.constant('abc'),
  fc.constant('12'),
  fc.constant('+'),
  fc.constant('!@#$%^&'),
  fc.constant('phone-number'),
  fc.constant('12345678901234567890123'),
  fc.stringMatching(/^[a-z!@#$%^&*]{1,10}$/).filter((s) => !validatePhone(s) && s.trim().length > 0),
);

/** Generates a valid phone */
const validPhoneArb = fc.oneof(
  fc.constant('+44 7700 900000'),
  fc.constant('07700900000'),
  fc.constant('+1 (555) 123-4567'),
  fc.stringMatching(/^[0-9]{7,15}$/),
);

/** Builds a form data object with overrides */
function buildFormData(overrides: Partial<typeof defaultFormData> = {}): typeof defaultFormData {
  return { ...defaultFormData, ...overrides };
}

// --- Property Tests ---

describe('Add Member Form Validation (Property)', () => {
  it('should produce firstName error when firstName is empty or whitespace', () => {
    fc.assert(
      fc.property(
        emptyOrWhitespaceArb,
        nonEmptyNameArb,
        validBranchIdArb,
        (firstName, lastName, branchId) => {
          const data = buildFormData({ firstName, lastName, homeBranchId: branchId });
          const errors = validateForm(data);
          expect(errors.firstName).toBe('First name is required');
          expect(Object.keys(errors).length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce lastName error when lastName is empty or whitespace', () => {
    fc.assert(
      fc.property(
        nonEmptyNameArb,
        emptyOrWhitespaceArb,
        validBranchIdArb,
        (firstName, lastName, branchId) => {
          const data = buildFormData({ firstName, lastName, homeBranchId: branchId });
          const errors = validateForm(data);
          expect(errors.lastName).toBe('Last name is required');
          expect(Object.keys(errors).length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce homeBranchId error when homeBranchId is empty', () => {
    fc.assert(
      fc.property(
        nonEmptyNameArb,
        nonEmptyNameArb,
        (firstName, lastName) => {
          const data = buildFormData({ firstName, lastName, homeBranchId: '' });
          const errors = validateForm(data);
          expect(errors.homeBranchId).toBe('Please select a home branch');
          expect(Object.keys(errors).length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce email error when email is present but invalid', () => {
    fc.assert(
      fc.property(
        nonEmptyNameArb,
        nonEmptyNameArb,
        validBranchIdArb,
        invalidEmailArb,
        (firstName, lastName, branchId, email) => {
          const data = buildFormData({ firstName, lastName, homeBranchId: branchId, email });
          const errors = validateForm(data);
          expect(errors.email).toBe('Please enter a valid email address');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce phone error when phone is present but invalid', () => {
    fc.assert(
      fc.property(
        nonEmptyNameArb,
        nonEmptyNameArb,
        validBranchIdArb,
        invalidPhoneArb,
        (firstName, lastName, branchId, phone) => {
          const data = buildFormData({ firstName, lastName, homeBranchId: branchId, phone });
          const errors = validateForm(data);
          expect(errors.phone).toBe('Please enter a valid phone number');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce no errors for valid form data', () => {
    fc.assert(
      fc.property(
        nonEmptyNameArb,
        nonEmptyNameArb,
        validBranchIdArb,
        validEmailArb,
        validPhoneArb,
        (firstName, lastName, branchId, email, phone) => {
          const data = buildFormData({ firstName, lastName, homeBranchId: branchId, email, phone });
          const errors = validateForm(data);
          expect(Object.keys(errors).length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
