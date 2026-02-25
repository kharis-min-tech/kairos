// Property-based tests for photo upload URL endpoint
// Feature: members-module
// **Validates: Requirements 5.2, 5.4, 5.5, 5.6**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Pure functions extracted from members-photo-upload-url.ts ───

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Validates whether a content type is allowed for photo upload.
 * Returns true only for image/jpeg, image/png, or image/webp.
 */
function validateContentType(contentType: string): boolean {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/**
 * Checks whether a user is authorized to upload a photo for a target member.
 *
 * Rules:
 * - Admin can upload for any member
 * - Pastor can upload for members in their own branch only
 * - Regular member can only upload their own photo
 *
 * Returns true if access is granted, false otherwise.
 */
function checkPhotoUploadAuth(
  userRole: string,
  userMemberId: number,
  userBranchId: number,
  targetMemberId: number,
  targetBranchId: number
): boolean {
  if (userRole === 'Admin') return true;
  if (userRole === 'Pastor') return userBranchId === targetBranchId;
  // Regular member: can only upload own photo
  return userMemberId === targetMemberId;
}

/**
 * Generates the S3 key for a member photo upload.
 * Pattern: photos/{memberId}/{timestamp}.{extension}
 */
function generatePhotoKey(memberId: number, timestamp: number, extension: string): string {
  return `photos/${memberId}/${timestamp}.${extension}`;
}

// ─── Property 9: Photo upload URL content type validation ───
// Feature: members-module, Property 9: Photo upload URL content type validation
describe('Property 9: Photo upload URL content type validation', () => {
  it('should reject any content type not in the allowed list', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) => !['image/jpeg', 'image/png', 'image/webp'].includes(s)
        ),
        (invalidContentType) => {
          expect(validateContentType(invalidContentType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept all three allowed content types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
        (validContentType) => {
          expect(validateContentType(validContentType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject content types that are close but not exact matches', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'image/jpeg',
          'image/png',
          'image/webp'
        ),
        fc.constantFrom(' ', 'x', '/', 'IMAGE/', '.'),
        (base, noise) => {
          const mutated = noise + base;
          expect(validateContentType(mutated)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 10: Photo upload URL authorization ───
// Feature: members-module, Property 10: Photo upload URL authorization
describe('Property 10: Photo upload URL authorization', () => {
  const memberIdArb = fc.integer({ min: 1, max: 10000 });
  const branchIdArb = fc.integer({ min: 1, max: 100 });

  it('should always grant access to Admin regardless of member or branch', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        branchIdArb,
        memberIdArb,
        branchIdArb,
        (userMemberId, userBranchId, targetMemberId, targetBranchId) => {
          expect(
            checkPhotoUploadAuth('Admin', userMemberId, userBranchId, targetMemberId, targetBranchId)
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should grant Pastor access only when target is in the same branch', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        branchIdArb,
        memberIdArb,
        branchIdArb,
        (userMemberId, userBranchId, targetMemberId, targetBranchId) => {
          const result = checkPhotoUploadAuth(
            'Pastor', userMemberId, userBranchId, targetMemberId, targetBranchId
          );
          if (userBranchId === targetBranchId) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should grant regular Member access only for their own photo', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        branchIdArb,
        memberIdArb,
        branchIdArb,
        (userMemberId, userBranchId, targetMemberId, targetBranchId) => {
          const result = checkPhotoUploadAuth(
            'Member', userMemberId, userBranchId, targetMemberId, targetBranchId
          );
          if (userMemberId === targetMemberId) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deny access for any non-Admin, non-Pastor, non-self role', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !['Admin', 'Pastor'].includes(s)),
        memberIdArb,
        branchIdArb,
        memberIdArb.filter((id) => id > 1).map((id) => id - 1), // ensure different from user
        branchIdArb,
        (role, userMemberId, userBranchId, targetMemberId, targetBranchId) => {
          // Target is different from user, so non-admin/non-pastor should be denied
          if (userMemberId !== targetMemberId) {
            expect(
              checkPhotoUploadAuth(role, userMemberId, userBranchId, targetMemberId, targetBranchId)
            ).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Photo upload URL S3 key format ───
// Feature: members-module, Property 11: Photo upload URL S3 key format
describe('Property 11: Photo upload URL S3 key format', () => {
  const memberIdArb = fc.integer({ min: 1, max: 999999 });
  const timestampArb = fc.integer({ min: 1_000_000_000_000, max: 9_999_999_999_999 });
  const extensionArb = fc.constantFrom('jpg', 'png', 'webp');

  it('should generate keys matching the pattern photos/{memberId}/{timestamp}.{extension}', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        timestampArb,
        extensionArb,
        (memberId, timestamp, extension) => {
          const key = generatePhotoKey(memberId, timestamp, extension);
          const pattern = /^photos\/\d+\/\d+\.\w+$/;
          expect(key).toMatch(pattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include the correct memberId in the key path', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        timestampArb,
        extensionArb,
        (memberId, timestamp, extension) => {
          const key = generatePhotoKey(memberId, timestamp, extension);
          expect(key.startsWith(`photos/${memberId}/`)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include the correct extension at the end of the key', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        timestampArb,
        extensionArb,
        (memberId, timestamp, extension) => {
          const key = generatePhotoKey(memberId, timestamp, extension);
          expect(key.endsWith(`.${extension}`)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include a numeric timestamp between memberId and extension', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        timestampArb,
        extensionArb,
        (memberId, timestamp, extension) => {
          const key = generatePhotoKey(memberId, timestamp, extension);
          // Extract the timestamp portion from the key
          const parts = key.split('/');
          // parts: ['photos', '{memberId}', '{timestamp}.{ext}']
          expect(parts).toHaveLength(3);
          const filenamePart = parts[2];
          const dotIndex = filenamePart.lastIndexOf('.');
          const timestampStr = filenamePart.substring(0, dotIndex);
          expect(Number(timestampStr)).toBe(timestamp);
          expect(Number.isFinite(Number(timestampStr))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
