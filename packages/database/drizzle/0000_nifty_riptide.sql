CREATE TABLE "branch_leadership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"end_date" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_name" varchar(150) NOT NULL,
	"region_id" uuid NOT NULL,
	"branch_type" varchar(50) DEFAULT 'Main' NOT NULL,
	"address" text,
	"city" varchar(100),
	"postal_code" varchar(20),
	"phone" varchar(20),
	"email" varchar(100),
	"established_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fellowship_meeting_attendance" (
	"meeting_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"attendance_status" varchar(20) DEFAULT 'Present' NOT NULL,
	"arrival_time" timestamp,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	CONSTRAINT "fellowship_meeting_attendance_meeting_id_member_id_pk" PRIMARY KEY("meeting_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "fellowship_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fellowship_id" uuid NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"meeting_title" varchar(200),
	"meeting_topic" varchar(200),
	"meeting_notes" text,
	"location" varchar(200),
	"duration_minutes" integer,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fellowship_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fellowship_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"join_date" date DEFAULT now() NOT NULL,
	"leave_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fellowships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fellowship_name" varchar(150) NOT NULL,
	"branch_id" uuid NOT NULL,
	"fellowship_type" varchar(50) NOT NULL,
	"description" text,
	"leader_id" uuid,
	"co_leader_id" uuid,
	"meeting_schedule" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"assigned_date" date DEFAULT now() NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"date_of_birth" date,
	"gender" varchar(10),
	"email" varchar(100) NOT NULL,
	"phone" varchar(20),
	"address" text,
	"city" varchar(100),
	"postal_code" varchar(20),
	"home_branch_id" uuid NOT NULL,
	"membership_date" date DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"photo_url" varchar(255),
	"emergency_contact_name" varchar(150),
	"emergency_contact_phone" varchar(20),
	"password_hash" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"approval_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"system_role" varchar(20) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_name" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "regions_region_name_unique" UNIQUE("region_name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
ALTER TABLE "branch_leadership" ADD CONSTRAINT "branch_leadership_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_leadership" ADD CONSTRAINT "branch_leadership_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meeting_attendance" ADD CONSTRAINT "fellowship_meeting_attendance_meeting_id_fellowship_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."fellowship_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meeting_attendance" ADD CONSTRAINT "fellowship_meeting_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meeting_attendance" ADD CONSTRAINT "fellowship_meeting_attendance_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meetings" ADD CONSTRAINT "fellowship_meetings_fellowship_id_fellowships_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "public"."fellowships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meetings" ADD CONSTRAINT "fellowship_meetings_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_members" ADD CONSTRAINT "fellowship_members_fellowship_id_fellowships_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "public"."fellowships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_members" ADD CONSTRAINT "fellowship_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_leader_id_members_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_co_leader_id_members_id_fk" FOREIGN KEY ("co_leader_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_home_branch_id_branches_id_fk" FOREIGN KEY ("home_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_branch_leadership_branch_id" ON "branch_leadership" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_branch_leadership_member_id" ON "branch_leadership" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_branch_leadership_is_current" ON "branch_leadership" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_branch_leadership_assignment" ON "branch_leadership" USING btree ("branch_id","member_id","role","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_branch_leadership_current_pastor" ON "branch_leadership" USING btree ("branch_id") WHERE role = 'Main Pastor' AND is_current = TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_branch_leadership_current_member_role" ON "branch_leadership" USING btree ("branch_id","member_id","role") WHERE is_current = TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_branches_name_region" ON "branches" USING btree ("branch_name","region_id");--> statement-breakpoint
CREATE INDEX "idx_fma_meeting_id" ON "fellowship_meeting_attendance" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_fma_member_id" ON "fellowship_meeting_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_fma_status" ON "fellowship_meeting_attendance" USING btree ("attendance_status");--> statement-breakpoint
CREATE INDEX "idx_fellowship_meetings_fellowship_id" ON "fellowship_meetings" USING btree ("fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_meetings_meeting_date" ON "fellowship_meetings" USING btree ("meeting_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fellowship_meetings_date" ON "fellowship_meetings" USING btree ("fellowship_id","meeting_date");--> statement-breakpoint
CREATE INDEX "idx_fellowship_members_fellowship_id" ON "fellowship_members" USING btree ("fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_members_member_id" ON "fellowship_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_members_is_active" ON "fellowship_members" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fellowship_members_assignment" ON "fellowship_members" USING btree ("fellowship_id","member_id","join_date");--> statement-breakpoint
CREATE INDEX "idx_fellowships_branch_id" ON "fellowships" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_fellowships_leader_id" ON "fellowships" USING btree ("leader_id");--> statement-breakpoint
CREATE INDEX "idx_fellowships_is_active" ON "fellowships" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fellowships_name_branch" ON "fellowships" USING btree ("fellowship_name","branch_id");--> statement-breakpoint
CREATE INDEX "idx_member_roles_member_id" ON "member_roles" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_member_roles_role_id" ON "member_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_member_roles_branch_id" ON "member_roles" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_member_roles_is_active" ON "member_roles" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_member_roles_assignment" ON "member_roles" USING btree ("member_id","role_id","branch_id","assigned_date");--> statement-breakpoint
CREATE INDEX "idx_members_home_branch_id" ON "members" USING btree ("home_branch_id");--> statement-breakpoint
CREATE INDEX "idx_members_is_active" ON "members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_members_name" ON "members" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_members_phone_active" ON "members" USING btree ("phone") WHERE phone IS NOT NULL AND is_active = TRUE;--> statement-breakpoint
CREATE INDEX "idx_roles_is_active" ON "roles" USING btree ("is_active");