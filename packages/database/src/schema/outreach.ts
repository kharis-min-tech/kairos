import {
  pgTable,
  serial,
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
import { sql } from 'drizzle-orm';
import { branches, members } from './core';

// ============================================================================
// OUTREACH_PROGRAMS
// Purpose: Store outreach program information and activities
// ============================================================================
export const outreachPrograms = pgTable(
  'outreach_programs',
  {
    outreachId: serial('outreach_id').primaryKey(),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'cascade' }),
    programName: varchar('program_name', { length: 200 }).notNull(),
    programDate: date('program_date').notNull(),
    location: varchar('location', { length: 300 }).notNull(),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    description: text('description'),
    coordinatorId: integer('coordinator_id').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    totalSoulsReached: integer('total_souls_reached').default(0),
    notes: text('notes'),
    isCompleted: boolean('is_completed').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
    outreachId: integer('outreach_id')
      .notNull()
      .references(() => outreachPrograms.outreachId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
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
    soulId: serial('soul_id').primaryKey(),
    outreachId: integer('outreach_id').references(
      () => outreachPrograms.outreachId,
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
    assignedMemberId: integer('assigned_member_id').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    convertedToMemberId: integer('converted_to_member_id').references(
      () => members.memberId,
      { onDelete: 'set null' }
    ),
    status: varchar('status', { length: 30 }).default('New'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
    followUpId: serial('follow_up_id').primaryKey(),
    soulId: integer('soul_id')
      .notNull()
      .references(() => souls.soulId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    followUpDate: timestamp('follow_up_date').notNull().defaultNow(),
    contactMethod: varchar('contact_method', { length: 30 }),
    contactStatus: varchar('contact_status', { length: 30 }).notNull(),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    nextFollowUpDate: date('next_follow_up_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
