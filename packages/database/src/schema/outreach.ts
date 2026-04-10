import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  unique,
  uniqueIndex,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

// ============================================================================
// OUTREACH_PROGRAMS
// Purpose: Store outreach program information and activities
// ============================================================================
export const outreachPrograms = pgTable(
  'outreach_programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    programName: varchar('program_name', { length: 200 }).notNull(),
    programDate: date('program_date').notNull(),
    location: varchar('location', { length: 300 }).notNull(),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    description: text('description'),
    coordinatorId: uuid('coordinator_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    totalSoulsReached: integer('total_souls_reached').default(0).notNull(),
    notes: text('notes'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_outreach_programs_branch_id').on(table.branchId),
    index('idx_outreach_programs_coordinator_id').on(table.coordinatorId),
    index('idx_outreach_programs_program_date').on(table.programDate),
    index('idx_outreach_programs_is_completed').on(table.isCompleted),
    unique('uq_outreach_programs_unique').on(
      table.branchId,
      table.programName,
      table.programDate,
      table.location
    ),
    check(
      'chk_outreach_programs_souls',
      sql`${table.totalSoulsReached} >= 0`
    ),
  ]
);

// ============================================================================
// OUTREACH_PARTICIPANTS
// Purpose: Store member participation in outreach programs
// ============================================================================
export const outreachParticipants = pgTable(
  'outreach_participants',
  {
    outreachId: uuid('outreach_id')
      .notNull()
      .references(() => outreachPrograms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.outreachId, table.memberId] }),
    index('idx_outreach_participants_outreach_id').on(table.outreachId),
    index('idx_outreach_participants_member_id').on(table.memberId),
  ]
);

// ============================================================================
// SOULS
// Purpose: Store information about new individuals reached through outreach
// ============================================================================
export const souls = pgTable(
  'souls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    outreachId: uuid('outreach_id').references(
      () => outreachPrograms.id,
      { onDelete: 'cascade' }
    ),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    gender: varchar('gender', { length: 10 }),
    ageRange: varchar('age_range', { length: 20 }),
    assignedMemberId: uuid('assigned_member_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    convertedToMemberId: uuid('converted_to_member_id').references(
      () => members.id,
      { onDelete: 'set null' }
    ),
    status: varchar('status', { length: 30 }).default('New').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_souls_outreach_id').on(table.outreachId),
    index('idx_souls_assigned_member_id').on(table.assignedMemberId),
    index('idx_souls_converted_to_member_id').on(table.convertedToMemberId),
    index('idx_souls_status').on(table.status),
    index('idx_souls_phone').on(table.phone),
    index('idx_souls_email').on(table.email),
    // Partial index for efficient ad-hoc soul queries (souls without an outreach program)
    index('idx_souls_assigned_adhoc')
      .on(table.assignedMemberId)
      .where(sql`outreach_id IS NULL`),
    // Unique phone per outreach program (when program-linked)
    uniqueIndex('idx_souls_phone_outreach')
      .on(table.phone, table.outreachId)
      .where(sql`phone IS NOT NULL AND outreach_id IS NOT NULL`),
    // Unique email per outreach program (when program-linked)
    uniqueIndex('idx_souls_email_outreach')
      .on(table.email, table.outreachId)
      .where(sql`email IS NOT NULL AND outreach_id IS NOT NULL`),
    check(
      'chk_souls_gender',
      sql`${table.gender} IS NULL OR ${table.gender} IN ('Male', 'Female')`
    ),
    check(
      'chk_souls_status',
      sql`${table.status} IN ('New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact')`
    ),
  ]
);

// ============================================================================
// FOLLOW_UPS
// Purpose: Store follow-up activities for souls
// ============================================================================
export const followUps = pgTable(
  'follow_ups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    soulId: uuid('soul_id')
      .notNull()
      .references(() => souls.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    followUpDate: timestamp('follow_up_date').notNull().defaultNow(),
    contactMethod: varchar('contact_method', { length: 30 }),
    contactStatus: varchar('contact_status', { length: 30 }).notNull(),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    nextFollowUpDate: date('next_follow_up_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_follow_ups_soul_id').on(table.soulId),
    index('idx_follow_ups_member_id').on(table.memberId),
    index('idx_follow_ups_follow_up_date').on(table.followUpDate),
    index('idx_follow_ups_contact_status').on(table.contactStatus),
    index('idx_follow_ups_next_follow_up_date').on(table.nextFollowUpDate),
    check(
      'chk_follow_ups_contact_method',
      sql`${table.contactMethod} IS NULL OR ${table.contactMethod} IN ('Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other')`
    ),
    check(
      'chk_follow_ups_contact_status',
      sql`${table.contactStatus} IN ('Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested')`
    ),
    check(
      'chk_follow_ups_duration',
      sql`${table.durationMinutes} IS NULL OR ${table.durationMinutes} > 0`
    ),
  ]
);

// ── Relations ──────────────────────────────────────────────

export const outreachProgramsRelations = relations(outreachPrograms, ({ one, many }) => ({
  branch: one(branches, { fields: [outreachPrograms.branchId], references: [branches.id] }),
  coordinator: one(members, { fields: [outreachPrograms.coordinatorId], references: [members.id] }),
  participants: many(outreachParticipants),
  souls: many(souls),
}));

export const outreachParticipantsRelations = relations(outreachParticipants, ({ one }) => ({
  outreachProgram: one(outreachPrograms, { fields: [outreachParticipants.outreachId], references: [outreachPrograms.id] }),
  member: one(members, { fields: [outreachParticipants.memberId], references: [members.id] }),
}));

export const soulsRelations = relations(souls, ({ one, many }) => ({
  outreachProgram: one(outreachPrograms, { fields: [souls.outreachId], references: [outreachPrograms.id] }),
  assignedMember: one(members, { fields: [souls.assignedMemberId], references: [members.id], relationName: 'assignedSouls' }),
  convertedToMember: one(members, { fields: [souls.convertedToMemberId], references: [members.id], relationName: 'convertedSouls' }),
  followUps: many(followUps),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  soul: one(souls, { fields: [followUps.soulId], references: [souls.id] }),
  member: one(members, { fields: [followUps.memberId], references: [members.id] }),
}));

