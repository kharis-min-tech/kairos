-- Task #33 Phase 2: cut over to the real Membership signifier.
--
-- Three steps in one migration:
--
--   1. BACKFILL — every existing row tagged member_type='member' (i.e. created
--      via signup or admin-add before Phase 1) is treated as "yes, they're a
--      confirmed Member" by stamping membership_class_completed_at from their
--      existing membership_date. After this step, the directory + reports
--      filter sweep (also in this PR) won't accidentally hide existing rows.
--
--   2. RENAME — the member_type='prospect' value is replaced by 'attendee'.
--      'prospect' was sales-funnel language for someone who attends faithfully
--      and may even serve in a department but hasn't done the 4-week class.
--      'attendee' is a neutral, accurate descriptor for that population AND
--      for soul-capture rows minted by the forms pipeline.
--
--   3. DEFAULT FLIP + CHECK — the column default flips from 'member' to
--      'attendee' so self-signup no longer auto-promotes to confirmed Member.
--      The CHECK constraint is updated to drop 'prospect' and add 'attendee'.
--
-- See docs/domain-model.md §0 for the full domain motivation.

-- Step 1: Backfill the new authoritative timestamp from membership_date for
-- everyone already tagged as a 'member'. membership_date is a DATE; cast to
-- TIMESTAMP at midnight UTC.
UPDATE members
SET membership_class_completed_at = membership_date::timestamp
WHERE membership_class_completed_at IS NULL
  AND member_type = 'member';

-- Step 2: Rename 'prospect' → 'attendee'. Done BEFORE the CHECK tightening
-- below so the rewritten constraint doesn't refuse the in-flight rename.
UPDATE members SET member_type = 'attendee' WHERE member_type = 'prospect';

-- Step 3a: Flip the column default. Future self-signups land as 'attendee'
-- (not-yet-a-Member) instead of 'member'. The signup service also explicitly
-- mints 'attendee' so this is belt-and-braces.
ALTER TABLE members ALTER COLUMN member_type SET DEFAULT 'attendee';

-- Step 3b: Tighten the CHECK to the new value set. 'prospect' is removed.
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_member_type_check;
ALTER TABLE members ADD CONSTRAINT members_member_type_check
  CHECK (member_type IN ('member', 'attendee', 'visitor', 'child'));
