import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';

export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionName: varchar('region_name', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Composite unique so 'Europe / UK' and 'Europe / France' can coexist.
  // The prior single-column UNIQUE(region_name) — dropped in 0040 — locked
  // out any second region in the same continent.
  unique('regions_region_name_country_key').on(table.regionName, table.country),
]);

export const regionsRelations = relations(regions, ({ many }) => ({
  branches: many(branches),
}));
