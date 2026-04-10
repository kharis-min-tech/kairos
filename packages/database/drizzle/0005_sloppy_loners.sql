CREATE TABLE "branch_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"lead_member_id" uuid NOT NULL,
	"deputy_member_id" uuid,
	"start_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_branch_departments_dates" CHECK ("branch_departments"."end_date" IS NULL OR "branch_departments"."end_date" >= "branch_departments"."start_date"),
	CONSTRAINT "chk_branch_departments_leaders_different" CHECK ("branch_departments"."deputy_member_id" IS NULL OR "branch_departments"."lead_member_id" != "branch_departments"."deputy_member_id")
);
--> statement-breakpoint
CREATE TABLE "department_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"join_date" date DEFAULT CURRENT_DATE NOT NULL,
	"leave_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_department_members_assignment" UNIQUE("branch_department_id","member_id","join_date"),
	CONSTRAINT "chk_department_members_dates" CHECK ("department_members"."leave_date" IS NULL OR "department_members"."leave_date" >= "department_members"."join_date")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_department_name_unique" UNIQUE("department_name")
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid,
	"branch_id" uuid NOT NULL,
	"donation_date" date DEFAULT CURRENT_DATE NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP',
	"donation_purpose" varchar(30) NOT NULL,
	"description" text,
	"payment_method" varchar(30),
	"reference_number" varchar(100),
	"stripe_payment_id" varchar(255),
	"status" varchar(20) DEFAULT 'completed',
	"is_anonymous" boolean DEFAULT false,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_donations_amount" CHECK ("donations"."amount" > 0),
	CONSTRAINT "chk_donations_purpose" CHECK ("donations"."donation_purpose" IN ('Offering', 'Tithe', 'Building Fund', 'Other')),
	CONSTRAINT "chk_donations_payment_method" CHECK ("donations"."payment_method" IS NULL OR "donations"."payment_method" IN ('Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Card', 'Online', 'Other')),
	CONSTRAINT "chk_donations_description" CHECK (("donations"."donation_purpose" != 'Other') OR ("donations"."donation_purpose" = 'Other' AND "donations"."description" IS NOT NULL AND "donations"."description" != ''))
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"soul_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"follow_up_date" timestamp DEFAULT now() NOT NULL,
	"contact_method" varchar(30),
	"contact_status" varchar(30) NOT NULL,
	"duration_minutes" integer,
	"notes" text,
	"next_follow_up_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_follow_ups_contact_method" CHECK ("follow_ups"."contact_method" IS NULL OR "follow_ups"."contact_method" IN ('Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other')),
	CONSTRAINT "chk_follow_ups_contact_status" CHECK ("follow_ups"."contact_status" IN ('Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested')),
	CONSTRAINT "chk_follow_ups_duration" CHECK ("follow_ups"."duration_minutes" IS NULL OR "follow_ups"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"member_id" uuid,
	"submission_data" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_name" varchar(200) NOT NULL,
	"form_description" text,
	"form_definition" jsonb NOT NULL,
	"scope" varchar(30) NOT NULL,
	"target_branch_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_forms_scope" CHECK ("forms"."scope" IN ('Church-wide', 'Branch-specific')),
	CONSTRAINT "chk_forms_target_consistency" CHECK (("forms"."scope" = 'Church-wide' AND "forms"."target_branch_id" IS NULL) OR ("forms"."scope" = 'Branch-specific' AND "forms"."target_branch_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "outreach_participants" (
	"outreach_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_participants_outreach_id_member_id_pk" PRIMARY KEY("outreach_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "outreach_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"program_name" varchar(200) NOT NULL,
	"program_date" date NOT NULL,
	"location" varchar(300) NOT NULL,
	"address" text,
	"city" varchar(100),
	"description" text,
	"coordinator_id" uuid,
	"total_souls_reached" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_outreach_programs_unique" UNIQUE("branch_id","program_name","program_date","location"),
	CONSTRAINT "chk_outreach_programs_souls" CHECK ("outreach_programs"."total_souls_reached" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_attendance" (
	"service_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"attendance_status" varchar(20) NOT NULL,
	"arrival_time" timestamp,
	"is_first_time_visitor" boolean DEFAULT false,
	"notes" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	CONSTRAINT "service_attendance_service_id_member_id_pk" PRIMARY KEY("service_id","member_id"),
	CONSTRAINT "chk_service_attendance_status" CHECK ("service_attendance"."attendance_status" IN ('Present', 'Absent', 'Virtual'))
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_date" timestamp NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"service_title" varchar(200),
	"preacher_id" uuid,
	"topic" varchar(200),
	"notes" text,
	"expected_attendance" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_services_unique" UNIQUE("branch_id","service_date","service_type"),
	CONSTRAINT "chk_services_type" CHECK ("services"."service_type" IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other')),
	CONSTRAINT "chk_services_expected_attendance" CHECK ("services"."expected_attendance" IS NULL OR "services"."expected_attendance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "souls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outreach_id" uuid,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(100),
	"address" text,
	"city" varchar(100),
	"gender" varchar(10),
	"age_range" varchar(20),
	"assigned_member_id" uuid,
	"converted_to_member_id" uuid,
	"status" varchar(30) DEFAULT 'New' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_souls_gender" CHECK ("souls"."gender" IS NULL OR "souls"."gender" IN ('Male', 'Female')),
	CONSTRAINT "chk_souls_status" CHECK ("souls"."status" IN ('New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'))
);
--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_lead_member_id_members_id_fk" FOREIGN KEY ("lead_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_deputy_member_id_members_id_fk" FOREIGN KEY ("deputy_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_soul_id_souls_id_fk" FOREIGN KEY ("soul_id") REFERENCES "public"."souls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_target_branch_id_branches_id_fk" FOREIGN KEY ("target_branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_participants" ADD CONSTRAINT "outreach_participants_outreach_id_outreach_programs_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_participants" ADD CONSTRAINT "outreach_participants_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_coordinator_id_members_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_preacher_id_members_id_fk" FOREIGN KEY ("preacher_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_outreach_id_outreach_programs_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_assigned_member_id_members_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_converted_to_member_id_members_id_fk" FOREIGN KEY ("converted_to_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_branch_departments_branch_id" ON "branch_departments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_branch_departments_department_id" ON "branch_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_branch_departments_lead_member_id" ON "branch_departments" USING btree ("lead_member_id");--> statement-breakpoint
CREATE INDEX "idx_branch_departments_is_active" ON "branch_departments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_branch_departments_active" ON "branch_departments" USING btree ("branch_id","department_id") WHERE is_active = TRUE;--> statement-breakpoint
CREATE INDEX "idx_department_members_branch_department_id" ON "department_members" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_department_members_member_id" ON "department_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_department_members_is_active" ON "department_members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_donations_member_id" ON "donations" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_donations_branch_id" ON "donations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_donations_donation_date" ON "donations" USING btree ("donation_date");--> statement-breakpoint
CREATE INDEX "idx_donations_purpose" ON "donations" USING btree ("donation_purpose");--> statement-breakpoint
CREATE INDEX "idx_donations_stripe_payment_id" ON "donations" USING btree ("stripe_payment_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_soul_id" ON "follow_ups" USING btree ("soul_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_member_id" ON "follow_ups" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_follow_up_date" ON "follow_ups" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_contact_status" ON "follow_ups" USING btree ("contact_status");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_next_follow_up_date" ON "follow_ups" USING btree ("next_follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_form_submissions_form_id" ON "form_submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "idx_form_submissions_member_id" ON "form_submissions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_form_submissions_submitted_at" ON "form_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_forms_scope" ON "forms" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_forms_target_branch_id" ON "forms" USING btree ("target_branch_id");--> statement-breakpoint
CREATE INDEX "idx_forms_is_active" ON "forms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_forms_created_by" ON "forms" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_outreach_participants_outreach_id" ON "outreach_participants" USING btree ("outreach_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_participants_member_id" ON "outreach_participants" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_branch_id" ON "outreach_programs" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_coordinator_id" ON "outreach_programs" USING btree ("coordinator_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_program_date" ON "outreach_programs" USING btree ("program_date");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_is_completed" ON "outreach_programs" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_service_id" ON "service_attendance" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_member_id" ON "service_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_status" ON "service_attendance" USING btree ("attendance_status");--> statement-breakpoint
CREATE INDEX "idx_services_branch_id" ON "services" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_services_service_date" ON "services" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "idx_services_service_type" ON "services" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_souls_outreach_id" ON "souls" USING btree ("outreach_id");--> statement-breakpoint
CREATE INDEX "idx_souls_assigned_member_id" ON "souls" USING btree ("assigned_member_id");--> statement-breakpoint
CREATE INDEX "idx_souls_converted_to_member_id" ON "souls" USING btree ("converted_to_member_id");--> statement-breakpoint
CREATE INDEX "idx_souls_status" ON "souls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_souls_phone" ON "souls" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_souls_email" ON "souls" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_souls_assigned_adhoc" ON "souls" USING btree ("assigned_member_id") WHERE outreach_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_souls_phone_outreach" ON "souls" USING btree ("phone","outreach_id") WHERE phone IS NOT NULL AND outreach_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_souls_email_outreach" ON "souls" USING btree ("email","outreach_id") WHERE email IS NOT NULL AND outreach_id IS NOT NULL;