import { z } from 'zod';
import { PILOT_BRANCHES, PILOT_EMAIL_MAX, PILOT_NAME_MAX } from '@kairos/types';

/**
 * A pilot submission.
 *
 * Nothing here is stored, so this schema is the only thing standing between a
 * public form and an email we act on. The branch is checked against the fixed
 * list rather than accepted as free text: the form offers a dropdown, so
 * anything else arrived from something other than the form.
 */
export const submitPilotInterestSchema = z.object({
  firstName: z.string().trim().min(1, 'Your first name is required').max(PILOT_NAME_MAX),
  lastName: z.string().trim().min(1, 'Your last name is required').max(PILOT_NAME_MAX),
  email: z.string().trim().email('A valid email address is required').max(PILOT_EMAIL_MAX),

  branchName: z.enum(PILOT_BRANCHES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Please choose your branch' }),
  }),

  // Genuinely optional: the plan is explicit that it is not choosing on size.
  approxMembers: z.coerce.number().int().min(0).max(100000).optional(),
});

export type SubmitPilotInterestInput = z.infer<typeof submitPilotInterestSchema>;
