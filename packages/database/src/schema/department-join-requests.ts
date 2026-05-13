import { pgTable, uuid, varchar, text, timestamp, date, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { members } from './members';

export const departmentJoinRequests = pgTable('department_join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 30 }).default('applied').notNull(),
  notes: text('notes'),
  reviewedBy: uuid('reviewed_by').references(() => members.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  // Interview stage
  interviewScheduledAt: timestamp('interview_scheduled_at'),
  interviewFormat: varchar('interview_format', { length: 20 }), // in_person | virtual
  interviewLocation: varchar('interview_location', { length: 500 }),
  interviewerOneId: uuid('interviewer_one_id').references(() => members.id, { onDelete: 'set null' }),
  interviewerTwoId: uuid('interviewer_two_id').references(() => members.id, { onDelete: 'set null' }),
  interviewOutcome: varchar('interview_outcome', { length: 20 }), // pass | fail | pending
  interviewNotes: text('interview_notes'),
  // Offer stage
  offeredAt: timestamp('offered_at'),
  offerExpiresAt: timestamp('offer_expires_at'),
  offerMessage: text('offer_message'),
  offerRespondedAt: timestamp('offer_responded_at'),
  offerResponse: varchar('offer_response', { length: 20 }), // accepted | declined
  // Probation stage
  probationDays: integer('probation_days'),
  probationStartDate: date('probation_start_date'),
  probationEndDate: date('probation_end_date'),
  probationOutcome: varchar('probation_outcome', { length: 20 }), // passed | failed | pending
  probationNotes: text('probation_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_department_join_requests_branch_department_id').on(table.branchDepartmentId),
  index('idx_department_join_requests_member_id').on(table.memberId),
  index('idx_department_join_requests_status').on(table.status),
  uniqueIndex('uq_department_join_requests_open')
    .on(table.branchDepartmentId, table.memberId)
    .where(sql`status IN ('applied', 'interview_scheduled', 'interviewed', 'offered', 'probation')`),
  sql`CHECK (status IN ('applied', 'interview_scheduled', 'interviewed', 'offered', 'rejected', 'withdrawn', 'probation', 'active', 'probation_failed'))`,
  sql`CHECK (interview_format IS NULL OR interview_format IN ('in_person', 'virtual'))`,
  sql`CHECK (interview_outcome IS NULL OR interview_outcome IN ('pass', 'fail', 'pending'))`,
  sql`CHECK (offer_response IS NULL OR offer_response IN ('accepted', 'declined'))`,
  sql`CHECK (probation_outcome IS NULL OR probation_outcome IN ('passed', 'failed', 'pending'))`,
  sql`CHECK (interviewer_one_id IS NULL OR interviewer_two_id IS NULL OR interviewer_one_id != interviewer_two_id)`,
  sql`CHECK (probation_end_date IS NULL OR probation_start_date IS NULL OR probation_end_date >= probation_start_date)`,
]);

export const departmentJoinRequestsRelations = relations(departmentJoinRequests, ({ one }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentJoinRequests.branchDepartmentId], references: [branchDepartments.id] }),
  member: one(members, { fields: [departmentJoinRequests.memberId], references: [members.id] }),
  reviewer: one(members, { fields: [departmentJoinRequests.reviewedBy], references: [members.id], relationName: 'joinRequestReviewer' }),
  interviewerOne: one(members, { fields: [departmentJoinRequests.interviewerOneId], references: [members.id], relationName: 'joinRequestInterviewerOne' }),
  interviewerTwo: one(members, { fields: [departmentJoinRequests.interviewerTwoId], references: [members.id], relationName: 'joinRequestInterviewerTwo' }),
}));
