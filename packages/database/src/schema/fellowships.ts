import { pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex, doublePrecision } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';
import { fellowshipMembers } from './fellowship-members';
import { fellowshipMeetings } from './fellowship-meetings';
import { fellowshipFollowups } from './fellowship-followups';

export const fellowships = pgTable('fellowships', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowshipName: varchar('fellowship_name', { length: 150 }).notNull(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  fellowshipType: varchar('fellowship_type', { length: 50 }).notNull(),
  description: text('description'),
  leaderId: uuid('leader_id').references(() => members.id, { onDelete: 'set null' }),
  coLeaderId: uuid('co_leader_id').references(() => members.id, { onDelete: 'set null' }),
  meetingSchedule: varchar('meeting_schedule', { length: 200 }),
  meetingDay: varchar('meeting_day', { length: 20 }),
  meetingTime: varchar('meeting_time', { length: 10 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  country: varchar('country', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_fellowships_branch_id').on(table.branchId),
  index('idx_fellowships_leader_id').on(table.leaderId),
  index('idx_fellowships_is_active').on(table.isActive),
  uniqueIndex('uq_fellowships_name_branch').on(table.fellowshipName, table.branchId),
  sql`CHECK (leader_id IS NULL OR co_leader_id IS NULL OR leader_id != co_leader_id)`,
  sql`CHECK (fellowship_type IN ('K-Groups', 'Kharis Express', 'New Breeds', 'Kharis on Campus', 'Kharis on Campus Colleges'))`,
]);

export const fellowshipsRelations = relations(fellowships, ({ one, many }) => ({
  branch: one(branches, { fields: [fellowships.branchId], references: [branches.id] }),
  leader: one(members, { fields: [fellowships.leaderId], references: [members.id], relationName: 'fellowshipLeader' }),
  coLeader: one(members, { fields: [fellowships.coLeaderId], references: [members.id], relationName: 'fellowshipCoLeader' }),
  members: many(fellowshipMembers),
  meetings: many(fellowshipMeetings),
  followups: many(fellowshipFollowups),
}));
