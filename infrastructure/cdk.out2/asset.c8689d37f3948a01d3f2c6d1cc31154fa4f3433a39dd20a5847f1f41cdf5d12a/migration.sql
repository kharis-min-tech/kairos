CREATE TABLE "service_attendance" (
	"service_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"attendance_status" varchar(20) NOT NULL,
	"arrival_time" timestamp,
	"is_first_time_visitor" boolean DEFAULT false,
	"notes" text,
	"recorded_at" timestamp DEFAULT now(),
	"recorded_by" integer,
	CONSTRAINT "service_attendance_service_id_member_id_pk" PRIMARY KEY("service_id","member_id"),
	CONSTRAINT "chk_service_attendance_status" CHECK ("service_attendance"."attendance_status" IN ('Present', 'Absent', 'Virtual'))
);
--> statement-breakpoint
CREATE TABLE "services" (
	"service_id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"service_date" timestamp NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"service_title" varchar(200),
	"preacher_id" integer,
	"topic" varchar(200),
	"notes" text,
	"expected_attendance" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_services_unique" UNIQUE("branch_id","service_date","service_type"),
	CONSTRAINT "chk_services_type" CHECK ("services"."service_type" IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other')),
	CONSTRAINT "chk_services_expected_attendance" CHECK ("services"."expected_attendance" IS NULL OR "services"."expected_attendance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "branch_leadership" (
	"leadership_id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"start_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"is_current" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_branch_leadership_assignment" UNIQUE("branch_id","member_id","role","start_date"),
	CONSTRAINT "chk_branch_leadership_role" CHECK ("branch_leadership"."role" IN ('Main Pastor', 'Elder')),
	CONSTRAINT "chk_branch_leadership_dates" CHECK ("branch_leadership"."end_date" IS NULL OR "branch_leadership"."end_date" >= "branch_leadership"."start_date")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"branch_id" serial PRIMARY KEY NOT NULL,
	"branch_name" varchar(150) NOT NULL,
	"region_id" integer NOT NULL,
	"branch_type" varchar(50) DEFAULT 'Main' NOT NULL,
	"address" text,
	"city" varchar(100),
	"postal_code" varchar(20),
	"phone" varchar(20),
	"email" varchar(100),
	"established_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_branches_name_region" UNIQUE("branch_name","region_id"),
	CONSTRAINT "uq_branches_email" UNIQUE("email"),
	CONSTRAINT "uq_branches_phone" UNIQUE("phone"),
	CONSTRAINT "chk_branches_type" CHECK ("branches"."branch_type" IN ('Main', 'Satellite', 'Cell', 'Campus', 'Online'))
);
--> statement-breakpoint
CREATE TABLE "members" (
	"member_id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"date_of_birth" date,
	"gender" varchar(10),
	"email" varchar(100),
	"phone" varchar(20),
	"address" text,
	"city" varchar(100),
	"postal_code" varchar(20),
	"home_branch_id" integer NOT NULL,
	"membership_date" date DEFAULT CURRENT_DATE NOT NULL,
	"is_active" boolean DEFAULT true,
	"photo_url" varchar(255),
	"emergency_contact_name" varchar(150),
	"emergency_contact_phone" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "chk_members_gender" CHECK ("members"."gender" IN ('Male', 'Female')),
	CONSTRAINT "chk_members_membership_date" CHECK ("members"."membership_date" <= CURRENT_DATE)
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"region_id" serial PRIMARY KEY NOT NULL,
	"region_name" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "regions_region_name_unique" UNIQUE("region_name")
);
--> statement-breakpoint
CREATE TABLE "branch_departments" (
	"branch_department_id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"lead_member_id" integer NOT NULL,
	"deputy_member_id" integer,
	"start_date" date DEFAULT CURRENT_DATE NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_branch_departments_dates" CHECK ("branch_departments"."end_date" IS NULL OR "branch_departments"."end_date" >= "branch_departments"."start_date"),
	CONSTRAINT "chk_branch_departments_leaders_different" CHECK ("branch_departments"."deputy_member_id" IS NULL OR "branch_departments"."lead_member_id" != "branch_departments"."deputy_member_id")
);
--> statement-breakpoint
CREATE TABLE "department_members" (
	"department_member_id" serial PRIMARY KEY NOT NULL,
	"branch_department_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"join_date" date DEFAULT CURRENT_DATE NOT NULL,
	"leave_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_department_members_assignment" UNIQUE("branch_department_id","member_id","join_date"),
	CONSTRAINT "chk_department_members_dates" CHECK ("department_members"."leave_date" IS NULL OR "department_members"."leave_date" >= "department_members"."join_date")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"department_id" serial PRIMARY KEY NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "departments_department_name_unique" UNIQUE("department_name")
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"donation_id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"donation_date" date DEFAULT CURRENT_DATE NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"donation_purpose" varchar(30) NOT NULL,
	"description" text,
	"payment_method" varchar(30),
	"reference_number" varchar(100),
	"is_anonymous" boolean DEFAULT false,
	"notes" text,
	"recorded_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_donations_amount" CHECK ("donations"."amount" > 0),
	CONSTRAINT "chk_donations_purpose" CHECK ("donations"."donation_purpose" IN ('Offering', 'Building Fund', 'Other')),
	CONSTRAINT "chk_donations_payment_method" CHECK ("donations"."payment_method" IS NULL OR "donations"."payment_method" IN ('Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Card', 'Online', 'Other')),
	CONSTRAINT "chk_donations_description" CHECK (("donations"."donation_purpose" != 'Other') OR ("donations"."donation_purpose" = 'Other' AND "donations"."description" IS NOT NULL AND "donations"."description" != ''))
);
--> statement-breakpoint
CREATE TABLE "fellowship_meeting_attendance" (
	"meeting_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"attendance_status" varchar(20) DEFAULT 'Present' NOT NULL,
	"arrival_time" timestamp,
	"notes" text,
	"recorded_at" timestamp DEFAULT now(),
	"recorded_by" integer,
	CONSTRAINT "fellowship_meeting_attendance_meeting_id_member_id_pk" PRIMARY KEY("meeting_id","member_id"),
	CONSTRAINT "chk_fellowship_meeting_attendance_status" CHECK ("fellowship_meeting_attendance"."attendance_status" IN ('Present', 'Absent', 'Excused', 'Late'))
);
--> statement-breakpoint
CREATE TABLE "fellowship_meetings" (
	"meeting_id" serial PRIMARY KEY NOT NULL,
	"fellowship_id" integer NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"meeting_title" varchar(200),
	"meeting_topic" varchar(200),
	"meeting_notes" text,
	"location" varchar(200),
	"duration_minutes" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_fellowship_meetings_date" UNIQUE("fellowship_id","meeting_date"),
	CONSTRAINT "chk_fellowship_meetings_duration" CHECK ("fellowship_meetings"."duration_minutes" IS NULL OR "fellowship_meetings"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "fellowship_members" (
	"fellowship_member_id" serial PRIMARY KEY NOT NULL,
	"fellowship_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"join_date" date DEFAULT CURRENT_DATE NOT NULL,
	"leave_date" date,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_fellowship_members_assignment" UNIQUE("fellowship_id","member_id","join_date"),
	CONSTRAINT "chk_fellowship_members_dates" CHECK ("fellowship_members"."leave_date" IS NULL OR "fellowship_members"."leave_date" >= "fellowship_members"."join_date")
);
--> statement-breakpoint
CREATE TABLE "fellowships" (
	"fellowship_id" serial PRIMARY KEY NOT NULL,
	"fellowship_name" varchar(150) NOT NULL,
	"branch_id" integer NOT NULL,
	"description" text,
	"leader_id" integer,
	"co_leader_id" integer,
	"meeting_schedule" varchar(200),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_fellowships_name_branch" UNIQUE("fellowship_name","branch_id"),
	CONSTRAINT "chk_fellowships_leaders_different" CHECK ("fellowships"."leader_id" IS NULL OR "fellowships"."co_leader_id" IS NULL OR "fellowships"."leader_id" != "fellowships"."co_leader_id")
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"submission_id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"member_id" integer,
	"submission_data" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"form_id" serial PRIMARY KEY NOT NULL,
	"form_name" varchar(200) NOT NULL,
	"form_description" text,
	"form_definition" jsonb NOT NULL,
	"scope" varchar(30) NOT NULL,
	"target_branch_id" integer,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_forms_scope" CHECK ("forms"."scope" IN ('Church-wide', 'Branch-specific')),
	CONSTRAINT "chk_forms_target_consistency" CHECK (("forms"."scope" = 'Church-wide' AND "forms"."target_branch_id" IS NULL) OR ("forms"."scope" = 'Branch-specific' AND "forms"."target_branch_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"notification_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"is_dismissed" boolean DEFAULT false,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_recipients_notification_id_member_id_pk" PRIMARY KEY("notification_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"notification_type" varchar(30) NOT NULL,
	"priority" varchar(20) DEFAULT 'Normal',
	"target_scope" varchar(30) NOT NULL,
	"target_branch_id" integer,
	"target_region_id" integer,
	"target_department_id" integer,
	"target_fellowship_id" integer,
	"target_role_id" integer,
	"target_leadership_role" varchar(50),
	"sent_by" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_for" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_notifications_type" CHECK ("notifications"."notification_type" IN ('Announcement', 'Reminder', 'Alert', 'Event', 'General')),
	CONSTRAINT "chk_notifications_priority" CHECK ("notifications"."priority" IN ('Low', 'Normal', 'High', 'Urgent')),
	CONSTRAINT "chk_notifications_scope" CHECK ("notifications"."target_scope" IN ('All', 'Branch', 'Region', 'Department', 'Fellowship', 'Role', 'Leadership')),
	CONSTRAINT "chk_notifications_leadership_role" CHECK ("notifications"."target_leadership_role" IS NULL OR "notifications"."target_leadership_role" IN ('Main Pastor', 'Elder')),
	CONSTRAINT "chk_notifications_target_consistency" CHECK (("notifications"."target_scope" = 'All' AND "notifications"."target_branch_id" IS NULL AND "notifications"."target_region_id" IS NULL AND "notifications"."target_department_id" IS NULL AND "notifications"."target_fellowship_id" IS NULL AND "notifications"."target_role_id" IS NULL AND "notifications"."target_leadership_role" IS NULL) OR ("notifications"."target_scope" = 'Branch' AND "notifications"."target_branch_id" IS NOT NULL) OR ("notifications"."target_scope" = 'Region' AND "notifications"."target_region_id" IS NOT NULL) OR ("notifications"."target_scope" = 'Department' AND "notifications"."target_department_id" IS NOT NULL) OR ("notifications"."target_scope" = 'Fellowship' AND "notifications"."target_fellowship_id" IS NOT NULL) OR ("notifications"."target_scope" = 'Role' AND "notifications"."target_role_id" IS NOT NULL) OR ("notifications"."target_scope" = 'Leadership' AND "notifications"."target_leadership_role" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role_id" serial PRIMARY KEY NOT NULL,
	"role_name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"follow_up_id" serial PRIMARY KEY NOT NULL,
	"soul_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"follow_up_date" timestamp DEFAULT now() NOT NULL,
	"contact_method" varchar(30),
	"contact_status" varchar(30) NOT NULL,
	"duration_minutes" integer,
	"notes" text,
	"next_follow_up_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_follow_ups_contact_method" CHECK ("follow_ups"."contact_method" IS NULL OR "follow_ups"."contact_method" IN ('Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other')),
	CONSTRAINT "chk_follow_ups_contact_status" CHECK ("follow_ups"."contact_status" IN ('Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested')),
	CONSTRAINT "chk_follow_ups_duration" CHECK ("follow_ups"."duration_minutes" IS NULL OR "follow_ups"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "outreach_participants" (
	"outreach_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"role" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "outreach_participants_outreach_id_member_id_pk" PRIMARY KEY("outreach_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "outreach_programs" (
	"outreach_id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"program_name" varchar(200) NOT NULL,
	"program_date" date NOT NULL,
	"location" varchar(300) NOT NULL,
	"address" text,
	"city" varchar(100),
	"description" text,
	"coordinator_id" integer,
	"total_souls_reached" integer DEFAULT 0,
	"notes" text,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_outreach_programs_unique" UNIQUE("branch_id","program_name","program_date","location"),
	CONSTRAINT "chk_outreach_programs_souls" CHECK ("outreach_programs"."total_souls_reached" >= 0)
);
--> statement-breakpoint
CREATE TABLE "souls" (
	"soul_id" serial PRIMARY KEY NOT NULL,
	"outreach_id" integer NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(100),
	"address" text,
	"city" varchar(100),
	"gender" varchar(10),
	"age_range" varchar(20),
	"assigned_member_id" integer,
	"converted_to_member_id" integer,
	"status" varchar(30) DEFAULT 'New',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chk_souls_gender" CHECK ("souls"."gender" IS NULL OR "souls"."gender" IN ('Male', 'Female')),
	CONSTRAINT "chk_souls_status" CHECK ("souls"."status" IN ('New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'))
);
--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_service_id_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attendance" ADD CONSTRAINT "service_attendance_recorded_by_members_member_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_preacher_id_members_member_id_fk" FOREIGN KEY ("preacher_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_leadership" ADD CONSTRAINT "branch_leadership_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_leadership" ADD CONSTRAINT "branch_leadership_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_region_id_regions_region_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("region_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_home_branch_id_branches_branch_id_fk" FOREIGN KEY ("home_branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_lead_member_id_members_member_id_fk" FOREIGN KEY ("lead_member_id") REFERENCES "public"."members"("member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_deputy_member_id_members_member_id_fk" FOREIGN KEY ("deputy_member_id") REFERENCES "public"."members"("member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_branch_department_id_branch_departments_branch_department_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("branch_department_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_recorded_by_members_member_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meeting_attendance" ADD CONSTRAINT "fellowship_meeting_attendance_meeting_id_fellowship_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."fellowship_meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meeting_attendance" ADD CONSTRAINT "fellowship_meeting_attendance_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meeting_attendance" ADD CONSTRAINT "fellowship_meeting_attendance_recorded_by_members_member_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meetings" ADD CONSTRAINT "fellowship_meetings_fellowship_id_fellowships_fellowship_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "public"."fellowships"("fellowship_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_meetings" ADD CONSTRAINT "fellowship_meetings_created_by_members_member_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_members" ADD CONSTRAINT "fellowship_members_fellowship_id_fellowships_fellowship_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "public"."fellowships"("fellowship_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_members" ADD CONSTRAINT "fellowship_members_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_leader_id_members_member_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_co_leader_id_members_member_id_fk" FOREIGN KEY ("co_leader_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("form_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_target_branch_id_branches_branch_id_fk" FOREIGN KEY ("target_branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_members_member_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("notification_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_branch_id_branches_branch_id_fk" FOREIGN KEY ("target_branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_region_id_regions_region_id_fk" FOREIGN KEY ("target_region_id") REFERENCES "public"."regions"("region_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_department_id_departments_department_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("department_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_fellowship_id_fellowships_fellowship_id_fk" FOREIGN KEY ("target_fellowship_id") REFERENCES "public"."fellowships"("fellowship_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_role_id_roles_role_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."roles"("role_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sent_by_members_member_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."members"("member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_soul_id_souls_soul_id_fk" FOREIGN KEY ("soul_id") REFERENCES "public"."souls"("soul_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_participants" ADD CONSTRAINT "outreach_participants_outreach_id_outreach_programs_outreach_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_programs"("outreach_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_participants" ADD CONSTRAINT "outreach_participants_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_coordinator_id_members_member_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_outreach_id_outreach_programs_outreach_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_programs"("outreach_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_assigned_member_id_members_member_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_converted_to_member_id_members_member_id_fk" FOREIGN KEY ("converted_to_member_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_service_attendance_service_id" ON "service_attendance" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_member_id" ON "service_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_service_attendance_status" ON "service_attendance" USING btree ("attendance_status");--> statement-breakpoint
CREATE INDEX "idx_services_branch_id" ON "services" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_services_service_date" ON "services" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "idx_services_service_type" ON "services" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_branch_leadership_branch_id" ON "branch_leadership" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_branch_leadership_member_id" ON "branch_leadership" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_branch_leadership_is_current" ON "branch_leadership" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_branch_leadership_current_pastor" ON "branch_leadership" USING btree ("branch_id") WHERE role = 'Main Pastor' AND is_current = TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_branch_leadership_current_member_role" ON "branch_leadership" USING btree ("branch_id","member_id","role") WHERE is_current = TRUE;--> statement-breakpoint
CREATE INDEX "idx_branches_region_id" ON "branches" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_members_home_branch_id" ON "members" USING btree ("home_branch_id");--> statement-breakpoint
CREATE INDEX "idx_members_is_active" ON "members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_members_name" ON "members" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_members_phone_active" ON "members" USING btree ("phone") WHERE phone IS NOT NULL AND is_active = TRUE;--> statement-breakpoint
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
CREATE INDEX "idx_fellowship_meeting_attendance_meeting_id" ON "fellowship_meeting_attendance" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_meeting_attendance_member_id" ON "fellowship_meeting_attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_meeting_attendance_status" ON "fellowship_meeting_attendance" USING btree ("attendance_status");--> statement-breakpoint
CREATE INDEX "idx_fellowship_meetings_fellowship_id" ON "fellowship_meetings" USING btree ("fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_meetings_meeting_date" ON "fellowship_meetings" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX "idx_fellowship_members_fellowship_id" ON "fellowship_members" USING btree ("fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_members_member_id" ON "fellowship_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_members_is_active" ON "fellowship_members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_fellowships_branch_id" ON "fellowships" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_fellowships_leader_id" ON "fellowships" USING btree ("leader_id");--> statement-breakpoint
CREATE INDEX "idx_fellowships_is_active" ON "fellowships" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_form_submissions_form_id" ON "form_submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "idx_form_submissions_member_id" ON "form_submissions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_form_submissions_submitted_at" ON "form_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_forms_scope" ON "forms" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_forms_target_branch_id" ON "forms" USING btree ("target_branch_id");--> statement-breakpoint
CREATE INDEX "idx_forms_is_active" ON "forms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_forms_created_by" ON "forms" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_notification_recipients_notification_id" ON "notification_recipients" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notification_recipients_member_id" ON "notification_recipients" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_notification_recipients_is_read" ON "notification_recipients" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_sent_by" ON "notifications" USING btree ("sent_by");--> statement-breakpoint
CREATE INDEX "idx_notifications_sent_at" ON "notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_scope" ON "notifications" USING btree ("target_scope");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_branch_id" ON "notifications" USING btree ("target_branch_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_region_id" ON "notifications" USING btree ("target_region_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_department_id" ON "notifications" USING btree ("target_department_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_fellowship_id" ON "notifications" USING btree ("target_fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_role_id" ON "notifications" USING btree ("target_role_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_target_leadership_role" ON "notifications" USING btree ("target_leadership_role");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_active" ON "notifications" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_roles_is_active" ON "roles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_soul_id" ON "follow_ups" USING btree ("soul_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_member_id" ON "follow_ups" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_follow_up_date" ON "follow_ups" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_contact_status" ON "follow_ups" USING btree ("contact_status");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_next_follow_up_date" ON "follow_ups" USING btree ("next_follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_outreach_participants_outreach_id" ON "outreach_participants" USING btree ("outreach_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_participants_member_id" ON "outreach_participants" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_branch_id" ON "outreach_programs" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_coordinator_id" ON "outreach_programs" USING btree ("coordinator_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_program_date" ON "outreach_programs" USING btree ("program_date");--> statement-breakpoint
CREATE INDEX "idx_outreach_programs_is_completed" ON "outreach_programs" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "idx_souls_outreach_id" ON "souls" USING btree ("outreach_id");--> statement-breakpoint
CREATE INDEX "idx_souls_assigned_member_id" ON "souls" USING btree ("assigned_member_id");--> statement-breakpoint
CREATE INDEX "idx_souls_converted_to_member_id" ON "souls" USING btree ("converted_to_member_id");--> statement-breakpoint
CREATE INDEX "idx_souls_status" ON "souls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_souls_phone" ON "souls" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_souls_email" ON "souls" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_souls_phone_outreach" ON "souls" USING btree ("phone","outreach_id") WHERE phone IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_souls_email_outreach" ON "souls" USING btree ("email","outreach_id") WHERE email IS NOT NULL;