import { pgTable, uuid, varchar, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';
import { serviceAttendance } from './service-attendance';

/**
 * services — a single church service occurrence (Sunday / Midweek / Special).
 *
 * Distinct from fellowship meetings: this is service-level attendance for the
 * whole branch. serviceDate is a timestamp (not a date) so two services on the
 * same calendar day (e.g. 9am + 11am) are distinguishable. The
 * (branchId, serviceDate, serviceType) unique index blocks duplicate entry.
 *
 * serviceTitle is required-when-Special at the API zod layer, NOT the DB.
 */
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  serviceDate: timestamp('service_date').notNull(),
  serviceType: varchar('service_type', { length: 20 }).notNull(),
  serviceTitle: varchar('service_title', { length: 200 }),
  topic: varchar('topic', { length: 200 }),
  preacherId: uuid('preacher_id').references(() => members.id, { onDelete: 'set null' }),
  expectedAttendance: integer('expected_attendance'),
  createdBy: uuid('created_by').notNull().references(() => members.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_services_branch_id').on(table.branchId),
  index('idx_services_service_date').on(table.serviceDate),
  index('idx_services_preacher_id').on(table.preacherId),
  uniqueIndex('uq_services_branch_date_type').on(table.branchId, table.serviceDate, table.serviceType),
  sql`CHECK (service_type IN ('Sunday', 'Midweek', 'Special'))`,
]);

export const servicesRelations = relations(services, ({ one, many }) => ({
  branch: one(branches, { fields: [services.branchId], references: [branches.id] }),
  preacher: one(members, {
    fields: [services.preacherId],
    references: [members.id],
    relationName: 'servicePreacher',
  }),
  createdByMember: one(members, {
    fields: [services.createdBy],
    references: [members.id],
    relationName: 'serviceCreatedBy',
  }),
  attendance: many(serviceAttendance),
}));

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
