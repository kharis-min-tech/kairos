import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from './members';
import { newBelieverEnrollments } from './new-believers';

export const mentorFollowups = pgTable(
  'mentor_followups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => newBelieverEnrollments.id, { onDelete: 'cascade' }),
    mentorMemberId: uuid('mentor_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    note: text('note').notNull(),
    contactedAt: timestamp('contacted_at').defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_mentor_followups_enrollment_id').on(table.enrollmentId),
    index('idx_mentor_followups_mentor_member_id').on(table.mentorMemberId),
    index('idx_mentor_followups_contacted_at').on(table.contactedAt),
    index('idx_mentor_followups_is_active').on(table.isActive),
  ],
);

export const mentorFollowupsRelations = relations(mentorFollowups, ({ one }) => ({
  enrollment: one(newBelieverEnrollments, {
    fields: [mentorFollowups.enrollmentId],
    references: [newBelieverEnrollments.id],
  }),
  mentor: one(members, {
    fields: [mentorFollowups.mentorMemberId],
    references: [members.id],
    relationName: 'mentorFollowupsAuthored',
  }),
  createdByMember: one(members, {
    fields: [mentorFollowups.createdBy],
    references: [members.id],
    relationName: 'mentorFollowupsCreated',
  }),
}));

export type MentorFollowup = typeof mentorFollowups.$inferSelect;
export type NewMentorFollowup = typeof mentorFollowups.$inferInsert;
