-- New Believers enhancements
-- Adds per-stage session completion tracking (JSONB) and optional department linkage.

ALTER TABLE "new_believer_enrollments"
  ADD COLUMN "session_completed_at" jsonb;
--> statement-breakpoint

ALTER TABLE "new_believer_enrollments"
  ADD COLUMN "joined_department_id" uuid REFERENCES "branch_departments"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX "idx_nb_enrollments_joined_department_id"
  ON "new_believer_enrollments" USING btree ("joined_department_id");
