import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { outreachPrograms } from './outreach-programs';
import { members } from './members';
import { followUps } from './follow-ups';
import { fellowships } from './fellowships';

export const souls = pgTable('souls', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Source categorization
  sourceType: varchar('source_type', { length: 30 }).notNull().default('Ad Hoc'), // 'Outreach', 'Fellowship', 'Department', 'Ad Hoc'
  outreachId: uuid('outreach_id').references(() => outreachPrograms.id, { onDelete: 'set null' }),
  fellowshipId: uuid('fellowship_id').references(() => fellowships.id, { onDelete: 'set null' }),
  departmentName: varchar('department_name', { length: 100 }), // For department-based evangelism
  // Personal information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  gender: varchar('gender', { length: 10 }),
  ageRange: varchar('age_range', { length: 20 }),
  // Assignment and conversion
  assignedMemberId: uuid('assigned_member_id').references(() => members.id, { onDelete: 'set null' }),
  convertedToMemberId: uuid('converted_to_member_id').references(() => members.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 30 }).default('New').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceTypeIdx: index('idx_souls_source_type').on(table.sourceType),
  outreachIdIdx: index('idx_souls_outreach_id').on(table.outreachId),
  fellowshipIdIdx: index('idx_souls_fellowship_id').on(table.fellowshipId),
  assignedMemberIdIdx: index('idx_souls_assigned_member_id').on(table.assignedMemberId),
  convertedToMemberIdIdx: index('idx_souls_converted_to_member_id').on(table.convertedToMemberId),
  statusIdx: index('idx_souls_status').on(table.status),
  phoneIdx: index('idx_souls_phone').on(table.phone),
  emailIdx: index('idx_souls_email').on(table.email),
}));

export const soulsRelations = relations(souls, ({ one, many }) => ({
  outreachProgram: one(outreachPrograms, {
    fields: [souls.outreachId],
    references: [outreachPrograms.id],
  }),
  fellowship: one(fellowships, {
    fields: [souls.fellowshipId],
    references: [fellowships.id],
  }),
  assignedMember: one(members, {
    fields: [souls.assignedMemberId],
    references: [members.id],
    relationName: 'assignedSouls',
  }),
  convertedToMember: one(members, {
    fields: [souls.convertedToMemberId],
    references: [members.id],
    relationName: 'convertedSouls',
  }),
  followUps: many(followUps),
}));
