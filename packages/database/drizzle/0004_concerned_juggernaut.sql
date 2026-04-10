CREATE TABLE "new_believer_attendance" (
	"session_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	CONSTRAINT "new_believer_attendance_session_id_enrollment_id_pk" PRIMARY KEY("session_id","enrollment_id")
);
--> statement-breakpoint
CREATE TABLE "new_believer_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"teacher_id" uuid,
	"stage" varchar(30) DEFAULT 'enrolled' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_nb_enrollments_active_member_branch" UNIQUE("member_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "new_believer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"teacher_id" uuid,
	"session_date" timestamp NOT NULL,
	"topic" varchar(200) NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "new_believer_attendance" ADD CONSTRAINT "new_believer_attendance_session_id_new_believer_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."new_believer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_attendance" ADD CONSTRAINT "new_believer_attendance_enrollment_id_new_believer_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."new_believer_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_attendance" ADD CONSTRAINT "new_believer_attendance_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_enrollments" ADD CONSTRAINT "new_believer_enrollments_teacher_id_members_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_sessions" ADD CONSTRAINT "new_believer_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_sessions" ADD CONSTRAINT "new_believer_sessions_teacher_id_members_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_believer_sessions" ADD CONSTRAINT "new_believer_sessions_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_nb_attendance_session_id" ON "new_believer_attendance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_nb_attendance_enrollment_id" ON "new_believer_attendance" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_nb_enrollments_member_id" ON "new_believer_enrollments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_nb_enrollments_branch_id" ON "new_believer_enrollments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_nb_enrollments_teacher_id" ON "new_believer_enrollments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_nb_enrollments_stage" ON "new_believer_enrollments" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_nb_enrollments_is_active" ON "new_believer_enrollments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_nb_sessions_branch_id" ON "new_believer_sessions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_nb_sessions_teacher_id" ON "new_believer_sessions" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_nb_sessions_session_date" ON "new_believer_sessions" USING btree ("session_date");