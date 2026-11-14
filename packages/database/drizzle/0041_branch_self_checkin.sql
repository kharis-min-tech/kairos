-- Self-check-in configuration lives on the branch. All four knobs are per-branch
-- because different cultures + service lengths call for different windows —
-- BranchAdmin tunes them from the mobile My-Branch screen with no code change.
--
-- Defaults are opt-in ON to force the culture change; branches that don't want
-- self-check-in flip `self_check_in_enabled` to false. Window math is
-- start-time relative: `[start − openBefore, start + closeAfter]`; anyone
-- checking in past `start + lateAfter` is stamped as Late instead of Present.

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS self_check_in_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS self_check_in_open_minutes_before INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS self_check_in_close_minutes_after INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS self_check_in_late_after_minutes INTEGER NOT NULL DEFAULT 30;

-- Sanity constraints — no negative windows, no absurd values. Wrapped in a
-- DO block so the migration is safe to re-run against a partially-applied
-- database (PG has no IF NOT EXISTS for ADD CONSTRAINT).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_self_check_in_open_before_nonneg'
  ) THEN
    ALTER TABLE branches
      ADD CONSTRAINT chk_self_check_in_open_before_nonneg CHECK (self_check_in_open_minutes_before >= 0),
      ADD CONSTRAINT chk_self_check_in_close_after_nonneg CHECK (self_check_in_close_minutes_after >= 0),
      ADD CONSTRAINT chk_self_check_in_late_after_nonneg CHECK (self_check_in_late_after_minutes >= 0),
      ADD CONSTRAINT chk_self_check_in_open_before_max CHECK (self_check_in_open_minutes_before <= 240),
      ADD CONSTRAINT chk_self_check_in_close_after_max CHECK (self_check_in_close_minutes_after <= 480);
  END IF;
END$$;
