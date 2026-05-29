-- 0020_first_time_visitor_form
-- First-time visitor form support for the Forms module:
--   1. Extend members.member_type CHECK to allow 'visitor' and 'child'.
--   2. Add members.guardian_member_id self-FK (child -> parent/guardian who brought them).
--   3. Extend form_submissions.form_type CHECK to allow 'first_time_visitor'.
-- All statements are idempotent so this is safe to re-apply on any DB.

-- 1. members.member_type: 'member' | 'prospect' | 'visitor' | 'child'
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_member_type_check";
--> statement-breakpoint
ALTER TABLE "members"
  ADD CONSTRAINT "members_member_type_check"
  CHECK ("member_type" IN ('member', 'prospect', 'visitor', 'child'));
--> statement-breakpoint

-- 2. members.guardian_member_id: nullable self-FK, ON DELETE SET NULL.
ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "guardian_member_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "members"
    ADD CONSTRAINT "members_guardian_member_id_members_id_fk"
    FOREIGN KEY ("guardian_member_id") REFERENCES "public"."members"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_members_guardian_member_id" ON "members" USING btree ("guardian_member_id");
--> statement-breakpoint

-- 3. form_submissions.form_type: add 'first_time_visitor'.
ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_form_type_check";
--> statement-breakpoint
ALTER TABLE "form_submissions"
  ADD CONSTRAINT "form_submissions_form_type_check"
  CHECK ("form_type" IN ('altar_call', 'baptism', 'testimony', 'baby_naming', 'baby_dedication', 'first_time_visitor'));
