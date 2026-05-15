import type { NewBelieverStageValue } from '@kairos/types';

/**
 * Shape consumed by the Kanban card / column UIs. A trimmed-down projection of
 * `NewBelieverEnrollmentWithMember` that includes only what the cards render.
 */
export interface EnrollmentCardData {
  id: string;
  memberId: string;
  stage: NewBelieverStageValue;
  memberFirstName: string;
  memberLastName: string;
  teacherId?: string | null;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
  mentorId?: string | null;
  mentorFirstName?: string | null;
  mentorLastName?: string | null;
  enrolledAt: string | Date;
  updatedAt: string | Date;
}
