-- 0050_membership_interest_isactive.sql
-- Reconcile membership_interest with the schema-wide convention that every
-- table uses `is_active` for soft-archive state. 0049 introduced an
-- `archived_at TIMESTAMP` for the same purpose; this brings the shape back
-- in line with new_believer_enrollments, members, fellowships, and every
-- other table under packages/database/CLAUDE.md.
--
-- The transition:
--   1. Add `is_active` default TRUE so every existing row (which under 0049
--      was distinguished only by NULL archived_at) reads as live.
--   2. Backfill `is_active = FALSE` for rows the 0049 sweep had already
--      archived.
--   3. Drop `archived_at` and its partial index.
--   4. Add a partial index over active waiting entries so the pool page
--      stays fast (matches the pattern used on other soft-delete tables).
--
-- WHEN was a row archived is now inferred from `updated_at`, mirroring
-- new_believer_enrollments::removeFromPipeline. If we ever need a
-- guaranteed-immutable archive timestamp, the audit_log table
-- (packages/database/src/schema/audit-log.ts) is a better home: emit an
-- action='membership_interest_archived' row per archived id, and the
-- timestamp lives there. ~30 min of work if the need arises.

ALTER TABLE membership_interest
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE membership_interest
  SET is_active = FALSE
  WHERE archived_at IS NOT NULL;

DROP INDEX IF EXISTS idx_membership_interest_archived_at;

ALTER TABLE membership_interest
  DROP COLUMN IF EXISTS archived_at;

CREATE INDEX IF NOT EXISTS idx_membership_interest_active
  ON membership_interest (member_id, expressed_at)
  WHERE is_active = TRUE;
