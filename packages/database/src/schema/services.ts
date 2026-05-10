import { pgTable, uuid, varchar, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';
import { serviceAttendance } from './service-attendance';

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
  serviceDate: timestamp('service_date').notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(),
  serviceTitle: varchar('service_title', { length: 200 }),
  preacherId: uuid('preacher_id').references(() => members.id, { onDelete: 'set null' }),
  topic: varchar('topic', { length: 200 }),
  expectedAttendance: integer('expected_attendance'),
  createdBy: uuid('created_by').notNull().references(() => members.id, { onDelete: 'restrict' }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => members.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_services_branch_id').on(table.branchId),
  index('idx_services_service_date').on(table.serviceDate),
  index('idx_services_service_type').on(table.serviceType),
  index('idx_services_preacher_id').on(table.preacherId),
  uniqueIndex('uq_services_branch_date_type').on(table.branchId, table.serviceDate, table.serviceType),
  sql`CHECK (service_type IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other'))`,
  sql`CHECK (expected_attendance IS NULL OR expected_attendance >= 0)`,
]);

export const servicesRelations = relations(services, ({ one, many }) => ({
  branch: one(branches, { fields: [services.branchId], references: [branches.id] }),
  preacher: one(members, { fields: [services.preacherId], references: [members.id] }),
  creator: one(members, { fields: [services.createdBy], references: [members.id], relationName: 'serviceCreator' }),
  attendance: many(serviceAttendance),
}));
