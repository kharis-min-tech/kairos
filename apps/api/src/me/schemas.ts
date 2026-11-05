import { z } from 'zod';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  CONSENT_TYPES,
  type ConsentType,
} from '@kairos/types';

/**
 * Response shape for GET /api/me/leadership — echoes the branch-admin
 * authority lists from the caller's AuthContext alongside the
 * fellowships and branch-departments they lead or co-/deputy-lead.
 */
export const meLeadershipResponseSchema = z.object({
  branchSystemAdminBranchIds: z.array(z.string().uuid()),
  branchDataAdminBranchIds: z.array(z.string().uuid()),
  leadFellowships: z.array(
    z.object({
      id: z.string().uuid(),
      fellowshipName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
  coLeadFellowships: z.array(
    z.object({
      id: z.string().uuid(),
      fellowshipName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
  leadDepartments: z.array(
    z.object({
      id: z.string().uuid(),
      departmentName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
  deputyDepartments: z.array(
    z.object({
      id: z.string().uuid(),
      departmentName: z.string(),
      branchId: z.string().uuid(),
    }),
  ),
});

export type MeLeadershipResponseShape = z.infer<typeof meLeadershipResponseSchema>;

const categoryValues = NOTIFICATION_CATEGORIES as readonly [NotificationCategory, ...NotificationCategory[]];

export const updateNotificationPreferenceSchema = z.object({
  category: z.enum(categoryValues),
  enabled: z.boolean(),
  cadence: z.enum(['immediate', 'digest_daily'] as const),
});

const consentTypeValues = CONSENT_TYPES as readonly [ConsentType, ...ConsentType[]];

export const recordConsentSchema = z.object({
  consentType: z.enum(consentTypeValues),
  granted: z.boolean(),
});

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, 'Password is required'),
});

// ── My children ───────────────────────────────────────────
// Date of birth is required, not optional: the record is typed `child` and
// every U16 protection keys off the age, so a child with no date of birth is
// a minor the system cannot recognise as one.
export const addMyChildSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date'),
  gender: z.enum(['Male', 'Female']).optional(),
  relationship: z
    .enum(['Mother', 'Father', 'Grandparent', 'Guardian', 'Carer', 'Other'])
    .optional(),
});
