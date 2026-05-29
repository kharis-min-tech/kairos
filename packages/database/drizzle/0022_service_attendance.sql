-- 0022_service_attendance
-- Net-new service attendance feature (Sunday / Midweek / Special services):
--   1. Create services (one row per service occurrence).
--   2. Create service_attendance (present-only attendance, composite PK).
--   3. Register updated_at triggers on both.
-- All statements are idempotent so this is safe to re-apply on any DB.
-- update_updated_at_column() already exists (added in 0021); we reference it.

-- 1. services ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_date" timestamp NOT NULL,
	"service_type" varchar(20) NOT NULL,
	"service_title" varchar(200),
	"topic" varchar(200),
	"preacher_id" uuid,
	"expected_attendance" integer,
	"created_by" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_service_type_check" CHECK (service_type IN ('Sunday', 'Midweek', 'Special'))
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "services" ADD CONSTRAINT "services_preacher_id_members_id_fk" FOREIGN KEY ("preacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "services" ADD CONSTRAINT "services_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_services_branch_id" ON "services" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_services_service_date" ON "services" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_services_preacher_id" ON "services" USING btree ("preacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_services_branch_date_type" ON "services" USING btree ("branch_id","service_date","service_type");--> statement-breakpoint

-- 2. service_attendance ------------------------------------------------------
-- Present-only: a row exists only for attendees. No 'Absent' status.
CREATE TABLE IF NOT EXISTS "service_attendance" (
	"service_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"attendance_status" varchar(10) NOT NULL,
	"arrival_time" timestamp,
	"is_first_time_visitor" boolean DEFAULT false NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_attendance_service_id_member_id_pk" PRIMARY KEY("service_id","member_id"),
	CONSTRAINT "service_attendance_attendance_status_check" CHECK (attendance_status IN ('Present', 'Late', 'Virtual'))
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_service_attendance_service_id" ON "service_attendance" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_service_attendance_member_id" ON "service_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_service_attendance_recorded_by" ON "service_attendance" USING btree ("recorded_by");--> statement-breakpoint

-- 3. updated_at triggers -----------------------------------------------------
-- update_updated_at_column() exists from 0021; just attach it.
DROP TRIGGER IF EXISTS set_services_updated_at ON "services";--> statement-breakpoint
CREATE TRIGGER set_services_updated_at
	BEFORE UPDATE ON "services"
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
DROP TRIGGER IF EXISTS set_service_attendance_updated_at ON "service_attendance";--> statement-breakpoint
CREATE TRIGGER set_service_attendance_updated_at
	BEFORE UPDATE ON "service_attendance"
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
