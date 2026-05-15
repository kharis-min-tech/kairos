import type { NewBelieverEnrollmentWithMember, NewBelieverStageValue } from '@kairos/types';

/**
 * Shape consumed by the Kanban card / column UIs. A trimmed-down projection of
 * `NewBelieverEnrollmentWithMember` that includes only what the cards render.
 * Wire DTOs are always strings — `Date` is materialised at the boundary.
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
  enrolledAt: string;
  updatedAt: string;
}

export interface AttendanceLogItem {
  sessionId: string;
  sessionDate: string;
  topic?: string | null;
  attended: boolean;
  notes?: string | null;
}

/**
 * View-model for the enrollment-detail surfaces (drawer + [id] page).
 * Extends the list-row shape with the two fields only present on the
 * `getEnrollment` response.
 */
export type EnrollmentDetail = NewBelieverEnrollmentWithMember & {
  sessionFeedback?: Record<string, string> | null;
  attendanceHistory?: AttendanceLogItem[];
};
