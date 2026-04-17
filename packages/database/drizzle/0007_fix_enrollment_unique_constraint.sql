-- Fix: replace full unique constraint with a partial unique index
-- The old constraint prevented re-enrolling a member who had a previous
-- (now inactive) enrollment. The correct rule is: only one ACTIVE enrollment
-- per member per branch at a time.

ALTER TABLE "new_believer_enrollments"
  DROP CONSTRAINT IF EXISTS "uq_nb_enrollments_active_member_branch";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_nb_enrollments_active_member_branch"
  ON "new_believer_enrollments" ("member_id", "branch_id")
  WHERE "is_active" = TRUE;
