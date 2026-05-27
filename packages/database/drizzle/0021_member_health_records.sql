-- 0021_member_health_records
-- Phase 1 of the minor (under-16) data protection feature: persistence only.
--   1. Create member_health_records (sensitive, 1:1 with a member).
--   2. Register the updated_at trigger.
-- All statements are idempotent so this is safe to re-apply on any DB.

-- 1. Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "member_health_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"medical_conditions" text,
	"allergies" text,
	"medications" text,
	"dietary_needs" text,
	"additional_notes" text,
	"photo_media_consent" boolean,
	"medical_treatment_consent" boolean,
	"data_processing_consent" boolean,
	"consent_recorded_by" uuid,
	"consent_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 2. Foreign keys ------------------------------------------------------------
DO $$ BEGIN
	ALTER TABLE "member_health_records" ADD CONSTRAINT "member_health_records_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "member_health_records" ADD CONSTRAINT "member_health_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "member_health_records" ADD CONSTRAINT "member_health_records_consent_recorded_by_members_id_fk" FOREIGN KEY ("consent_recorded_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 3. Indexes -----------------------------------------------------------------
-- 1:1 with member: a member has at most one health record.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_member_health_records_member_id" ON "member_health_records" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_member_health_records_branch_id" ON "member_health_records" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_member_health_records_consent_recorded_by" ON "member_health_records" USING btree ("consent_recorded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_member_health_records_is_active" ON "member_health_records" USING btree ("is_active");--> statement-breakpoint

-- 4. updated_at trigger ------------------------------------------------------
-- Ensure the shared trigger function exists, then attach it to this table.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS set_member_health_records_updated_at ON "member_health_records";--> statement-breakpoint
CREATE TRIGGER set_member_health_records_updated_at
	BEFORE UPDATE ON "member_health_records"
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
