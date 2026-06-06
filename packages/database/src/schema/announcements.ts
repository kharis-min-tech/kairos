import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  /** 'branch' | 'fellowship' | 'department' */
  target: varchar('target', { length: 20 }).notNull().default('branch'),
  /** ID of the fellowship or department when target !== 'branch' */
  targetEntityId: uuid('target_entity_id'),
  title: varchar('title', { length: 200 }),
  message: text('message').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  branchIdIdx: index('idx_announcements_branch_id').on(table.branchId),
  authorIdIdx: index('idx_announcements_author_id').on(table.authorId),
  createdAtIdx: index('idx_announcements_created_at').on(table.createdAt),
  targetIdx: index('idx_announcements_target').on(table.target),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  branch: one(branches, {
    fields: [announcements.branchId],
    references: [branches.id],
  }),
  author: one(members, {
    fields: [announcements.authorId],
    references: [members.id],
  }),
}));
