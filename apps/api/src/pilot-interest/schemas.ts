import { z } from 'zod';
import {
  PILOT_EMAIL_MAX,
  PILOT_INTEREST_STATUS_VALUES,
  PILOT_NAME_MAX,
  PILOT_ROLE_VALUES,
} from '@kairos/types';

export const submitPilotInterestSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Your name is required').max(PILOT_NAME_MAX),
    roleAtBranch: z.enum(PILOT_ROLE_VALUES),
    roleOther: z.string().trim().max(120).optional(),
    email: z.string().trim().email('A valid email address is required').max(PILOT_EMAIL_MAX),
    phone: z.string().trim().max(40).optional(),

    // The branch may not be seeded yet, so the name is required and the id is
    // not. Sending an id that does not resolve is not an error either: the
    // name is what gets stored.
    branchId: z.string().uuid().optional(),
    branchName: z.string().trim().min(1, 'Please name your branch').max(PILOT_NAME_MAX),
    // Required, unlike the member count. The plan chooses on "a normal mix of
    // fellowships and departments, so the pilot exercises the parts every
    // other branch will use", and a blank here is the one answer that cannot
    // be read either way -- it could be none, or it could be unanswered.
    fellowshipCount: z.coerce
      .number({ required_error: 'How many fellowships does your branch have?' })
      .int()
      .min(0)
      .max(500),
    departmentCount: z.coerce
      .number({ required_error: 'How many departments does your branch have?' })
      .int()
      .min(0)
      .max(500),
    // Genuinely optional: the plan is explicit that it is not choosing on size.
    approxMembers: z.coerce.number().int().min(0).max(100000).optional(),

    headOfAdminName: z.string().trim().max(PILOT_NAME_MAX).optional(),
    headOfAdminEmail: z.string().trim().email().max(PILOT_EMAIL_MAX).optional().or(z.literal('')),
    safeguardingLeadInPost: z.boolean(),
    safeguardingLeadName: z.string().trim().max(PILOT_NAME_MAX).optional(),
    earliestStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),


    whyThisBranch: z.string().trim().max(4000).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .superRefine((v, ctx) => {
    // 'other' without saying what leaves the admin queue guessing who wrote in.
    if (v.roleAtBranch === 'other' && !v.roleOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roleOther'],
        message: 'Please say what your role at the branch is',
      });
    }
    // The plan wants a safeguarding lead "already in post", so claiming one
    // has to come with a name. Saying there is none is a perfectly valid
    // answer and is left alone.
    if (v.safeguardingLeadInPost && !v.safeguardingLeadName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['safeguardingLeadName'],
        message: 'Please name your safeguarding lead',
      });
    }
  });

export type SubmitPilotInterestInput = z.infer<typeof submitPilotInterestSchema>;

export const listPilotInterestSchema = z.object({
  status: z.enum(PILOT_INTEREST_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updatePilotInterestSchema = z.object({
  status: z.enum(PILOT_INTEREST_STATUS_VALUES),
  reviewNotes: z.string().trim().max(4000).optional(),
});
