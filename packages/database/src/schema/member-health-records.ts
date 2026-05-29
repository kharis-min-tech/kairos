import { pgTable, uuid, text, boolean, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

/**
 * member_health_records — sensitive, 1:1 with a member.
 *
 * Holds safeguarding / health information for minors (under-16) and the
 * consent flags governing how their data may be used. A member has at most
 * one health record (enforced by a unique index on member_id).
 *
 * Consent flags are nullable boolean WITHOUT a default so that NULL means
 * "not yet recorded" — distinct from an explicit true/false answer.
 */
export const memberHealthRecords = pgTable('member_health_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),

  medicalConditions: text('medical_conditions'),
  allergies: text('allergies'),
  medications: text('medications'),
  dietaryNeeds: text('dietary_needs'),
  additionalNotes: text('additional_notes'),

  // NULL = not yet recorded; explicit true/false = a recorded decision.
  photoMediaConsent: boolean('photo_media_consent'),
  medicalTreatmentConsent: boolean('medical_treatment_consent'),
  dataProcessingConsent: boolean('data_processing_consent'),

  consentRecordedBy: uuid('consent_recorded_by').references(() => members.id, { onDelete: 'set null' }),
  consentDate: date('consent_date'),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_member_health_records_member_id').on(table.memberId),
  index('idx_member_health_records_branch_id').on(table.branchId),
  index('idx_member_health_records_consent_recorded_by').on(table.consentRecordedBy),
  index('idx_member_health_records_is_active').on(table.isActive),
]);

export const memberHealthRecordsRelations = relations(memberHealthRecords, ({ one }) => ({
  member: one(members, {
    fields: [memberHealthRecords.memberId],
    references: [members.id],
    relationName: 'memberHealthRecordSubject',
  }),
  branch: one(branches, {
    fields: [memberHealthRecords.branchId],
    references: [branches.id],
  }),
  consentRecorder: one(members, {
    fields: [memberHealthRecords.consentRecordedBy],
    references: [members.id],
    relationName: 'memberHealthRecordConsentRecorder',
  }),
}));

export type MemberHealthRecord = typeof memberHealthRecords.$inferSelect;
export type NewMemberHealthRecord = typeof memberHealthRecords.$inferInsert;
