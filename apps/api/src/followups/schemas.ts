import { z } from 'zod';

/**
 * Branch-context follow-ups and the queues that feed them.
 *
 * Fellowship- and department-context writes keep their own module routes
 * (`/api/fellowships/:id/followups`, `/api/departments/:id/followups`) — the
 * context is implicit in the route you called, which is what keeps attribution
 * unambiguous. This module owns the context those two can't express.
 */

export const createBranchFollowupSchema = z.object({
  memberId: z.string().uuid(),
  /** Optional — a branch admin can hand the follow-up to someone to action. */
  assignedToId: z.string().uuid().optional().nullable(),
  contactedAt: z.string().datetime().optional(),
  contactMethod: z.string().min(1).max(30),
  contactStatus: z.string().min(1).max(30),
  type: z.enum(['contact', 'visit']).default('contact'),
  methods: z.array(z.string().max(30)).max(6).optional(),
  contactReached: z.boolean().optional(),
  interestLevel: z.enum(['interested', 'not_interested', 'undecided']).optional(),
  visitKind: z.enum(['in_person', 'virtual']).optional(),
  visitAnnounced: z.boolean().optional(),
  visitArrivalAt: z.string().datetime().optional(),
  visitDepartureAt: z.string().datetime().optional(),
  visitOutcome: z.enum(['present', 'not_present', 'rescheduled']).optional(),
  companionMemberIds: z.array(z.string().uuid()).max(10).optional(),
  welfareConcern: z.boolean().optional(),
  safeguardingConcern: z.boolean().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().max(5000).optional(),
  nextFollowUpDate: z.string().optional(),
});
export type CreateBranchFollowupInput = z.infer<typeof createBranchFollowupSchema>;

/** Both queues are branch-scoped; admins may name a branch, others may not. */
export const followupQueueQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type FollowupQueueQuery = z.infer<typeof followupQueueQuerySchema>;
