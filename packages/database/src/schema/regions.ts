import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';

export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionName: varchar('region_name', { length: 100 }).notNull().unique(),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const regionsRelations = relations(regions, ({ many }) => ({
  branches: many(branches),
}));
