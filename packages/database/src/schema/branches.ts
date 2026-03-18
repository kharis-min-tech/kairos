import { pgTable, uuid, varchar, text, date, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { regions } from './regions';
import { members } from './members';
import { fellowships } from './fellowships';
import { branchLeadership } from './branch-leadership';

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchName: varchar('branch_name', { length: 150 }).notNull(),
  regionId: uuid('region_id').notNull().references(() => regions.id, { onDelete: 'restrict' }),
  branchType: varchar('branch_type', { length: 50 }).notNull().default('Main'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  establishedDate: date('established_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_branches_name_region').on(table.branchName, table.regionId),
  sql`CHECK (branch_type IN ('Main', 'Satellite', 'Cell', 'Campus', 'Online'))`,
]);

export const branchesRelations = relations(branches, ({ one, many }) => ({
  region: one(regions, { fields: [branches.regionId], references: [regions.id] }),
  members: many(members),
  fellowships: many(fellowships),
  leadership: many(branchLeadership),
}));
