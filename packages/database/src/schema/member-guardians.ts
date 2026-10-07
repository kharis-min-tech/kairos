import { pgTable, uuid, varchar, boolean, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';

/**
 * Who is responsible for a member.
 *
 * This replaced `members.guardian_member_id`, a single nullable self-FK, which
 * could only ever express one guardian. Children routinely have two parents,
 * and plenty have a parent plus a grandparent or a carer — the old column made
 * the system pick one of them and silently forget the rest, including on the
 * baby forms, which ask for both parents by name and then had nowhere to put
 * the second.
 *
 * The column is gone rather than kept as a denormalised "primary" pointer.
 * Two places holding the same fact is the failure this codebase keeps paying
 * for, so primary-ness is a flag on the row and there is one source of truth.
 */
export const memberGuardians = pgTable('member_guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** The person being looked after. */
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  /** The adult responsible for them. */
  guardianMemberId: uuid('guardian_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  /**
   * What this adult is to this member — Mother, Father, Grandparent, Carer,
   * Other. Deliberately a label rather than an enum: families do not fit a
   * closed list, and the safeguarding review page needs to show the reader
   * something truthful rather than the word "guardian" five times.
   */
  relationship: varchar('relationship', { length: 40 }),
  /** Who to contact first. At most one per member, enforced below. */
  isPrimary: boolean('is_primary').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_member_guardians_member_id').on(table.memberId),
  // The access-control path asks "which members is this person a guardian of",
  // so the reverse direction is indexed too.
  index('idx_member_guardians_guardian_member_id').on(table.guardianMemberId),
  index('idx_member_guardians_is_active').on(table.isActive),
  // One live link per pair — re-adding a guardian you removed should revive
  // the row, not stack a duplicate beside it.
  uniqueIndex('uq_member_guardians_link')
    .on(table.memberId, table.guardianMemberId)
    .where(sql`is_active = true`),
  // At most one primary guardian per member.
  uniqueIndex('uq_member_guardians_primary')
    .on(table.memberId)
    .where(sql`is_primary = true AND is_active = true`),
  sql`CHECK (member_id <> guardian_member_id)`,
]);

export const memberGuardiansRelations = relations(memberGuardians, ({ one }) => ({
  member: one(members, {
    fields: [memberGuardians.memberId],
    references: [members.id],
    relationName: 'guardedMember',
  }),
  guardian: one(members, {
    fields: [memberGuardians.guardianMemberId],
    references: [members.id],
    relationName: 'guardianOf',
  }),
}));
