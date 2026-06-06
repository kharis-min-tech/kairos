-- 0018_forms_data_capture
-- Forms & Data Capture module: enum-driven form submissions + member_type on members.

-- Members: classify rows as full members vs. prospects (e.g. altar-call shells).
ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "member_type" varchar(20) DEFAULT 'member' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_member_type_check'
  ) THEN
    ALTER TABLE "members"
      ADD CONSTRAINT "members_member_type_check"
      CHECK ("member_type" IN ('member', 'prospect'));
  END IF;
END $$;
--> statement-breakpoint

-- Form submissions: per-formType data capture.
CREATE TABLE IF NOT EXISTS "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_type" varchar(30) NOT NULL,
	"branch_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"subject_member_id" uuid,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"linked_entity_type" varchar(50),
	"linked_entity_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_submissions_form_type_check" CHECK ("form_type" IN ('altar_call', 'baptism', 'testimony', 'baby_naming', 'baby_dedication')),
	CONSTRAINT "form_submissions_status_check" CHECK ("status" IN ('new', 'reviewed', 'converted', 'dismissed'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_submitted_by_members_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_subject_member_id_members_id_fk" FOREIGN KEY ("subject_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_form_submissions_type_branch_created" ON "form_submissions" USING btree ("form_type", "branch_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_form_submissions_status" ON "form_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_form_submissions_subject_member_id" ON "form_submissions" USING btree ("subject_member_id");
