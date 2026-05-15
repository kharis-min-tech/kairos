CREATE TABLE IF NOT EXISTS "new_believer_attendance" (
	"session_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	CONSTRAINT "new_believer_attendance_session_id_enrollment_id_pk" PRIMARY KEY("session_id","enrollment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "new_believer_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"teacher_id" uuid,
	"mentor_id" uuid,
	"stage" varchar(30) DEFAULT 'enrolled' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"session_completed_at" jsonb,
	"session_feedback" jsonb,
	"joined_department_id" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "new_believer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"teacher_id" uuid,
	"session_date" timestamp NOT NULL,
	"topic" varchar(200) NOT NULL,
	"notes" text,
	"feedback" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "uq_department_join_requests_pending";--> statement-breakpoint
ALTER TABLE "department_join_requests" ALTER COLUMN "status" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "department_join_requests" ALTER COLUMN "status" SET DEFAULT 'applied';--> statement-breakpoint
ALTER TABLE "branch_departments" ADD COLUMN IF NOT EXISTS "probation_days" integer DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interview_scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interview_format" varchar(20);--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interview_location" varchar(500);--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interviewer_one_id" uuid;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interviewer_two_id" uuid;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interview_outcome" varchar(20);--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "interview_notes" text;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "offered_at" timestamp;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "offer_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "offer_message" text;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "offer_responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "offer_response" varchar(20);--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "probation_days" integer;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "probation_start_date" date;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "probation_end_date" date;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "probation_outcome" varchar(20);--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD COLUMN IF NOT EXISTS "probation_notes" text;--> statement-breakpoint
ALTER TABLE "department_members" ADD COLUMN IF NOT EXISTS "membership_status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "department_members" ADD COLUMN IF NOT EXISTS "probation_end_date" date;--> statement-breakpoint
ALTER TABLE "new_believer_attendance" DROP CONSTRAINT IF EXISTS "new_believer_attendance_session_id_new_believer_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_attendance" ADD CONSTRAINT "new_believer_attendance_session_id_new_believer_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."new_believer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_attendance" DROP CONSTRAINT IF EXISTS "new_believer_attendance_enrollment_id_new_believer_enrollments_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_attendance" ADD CONSTRAINT "new_believer_attendance_enrollment_id_new_believer_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."new_believer_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_attendance" DROP CONSTRAINT IF EXISTS "new_believer_attendance_recorded_by_members_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_attendance" ADD CONSTRAINT "new_believer_attendance_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" DROP CONSTRAINT IF EXISTS "new_believer_enrollments_member_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" DROP CONSTRAINT IF EXISTS "new_believer_enrollments_branch_id_branches_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" DROP CONSTRAINT IF EXISTS "new_believer_enrollments_teacher_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_teacher_id_members_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" DROP CONSTRAINT IF EXISTS "new_believer_enrollments_mentor_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_mentor_id_members_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_sessions" DROP CONSTRAINT IF EXISTS "new_believer_sessions_branch_id_branches_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_sessions" ADD CONSTRAINT "new_believer_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_sessions" DROP CONSTRAINT IF EXISTS "new_believer_sessions_teacher_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_sessions" ADD CONSTRAINT "new_believer_sessions_teacher_id_members_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_sessions" DROP CONSTRAINT IF EXISTS "new_believer_sessions_created_by_members_id_fk";--> statement-breakpoint
ALTER TABLE "new_believer_sessions" ADD CONSTRAINT "new_believer_sessions_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_attendance_session_id" ON "new_believer_attendance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_attendance_enrollment_id" ON "new_believer_attendance" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_enrollments_member_id" ON "new_believer_enrollments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_enrollments_branch_id" ON "new_believer_enrollments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_enrollments_teacher_id" ON "new_believer_enrollments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_enrollments_mentor_id" ON "new_believer_enrollments" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_enrollments_stage" ON "new_believer_enrollments" USING btree ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_enrollments_is_active" ON "new_believer_enrollments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_sessions_branch_id" ON "new_believer_sessions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_sessions_teacher_id" ON "new_believer_sessions" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nb_sessions_session_date" ON "new_believer_sessions" USING btree ("session_date");--> statement-breakpoint
ALTER TABLE "department_join_requests" DROP CONSTRAINT IF EXISTS "department_join_requests_interviewer_one_id_fkey";--> statement-breakpoint
ALTER TABLE "department_join_requests" DROP CONSTRAINT IF EXISTS "department_join_requests_interviewer_one_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD CONSTRAINT "department_join_requests_interviewer_one_id_members_id_fk" FOREIGN KEY ("interviewer_one_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_join_requests" DROP CONSTRAINT IF EXISTS "department_join_requests_interviewer_two_id_fkey";--> statement-breakpoint
ALTER TABLE "department_join_requests" DROP CONSTRAINT IF EXISTS "department_join_requests_interviewer_two_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD CONSTRAINT "department_join_requests_interviewer_two_id_members_id_fk" FOREIGN KEY ("interviewer_two_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_department_join_requests_open" ON "department_join_requests" USING btree ("branch_department_id","member_id") WHERE status IN ('applied', 'interview_scheduled', 'interviewed', 'offered', 'probation');--> statement-breakpoint
ALTER TABLE "rota_pool_members" DROP COLUMN IF EXISTS "weight";
