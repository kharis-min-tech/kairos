CREATE TABLE "branch_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"lead_member_id" uuid,
	"deputy_member_id" uuid,
	"description" text,
	"start_date" date DEFAULT now() NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"recorded_by_id" uuid NOT NULL,
	"assigned_to_id" uuid,
	"contacted_at" timestamp DEFAULT now() NOT NULL,
	"contact_method" varchar(30) NOT NULL,
	"contact_status" varchar(30) NOT NULL,
	"duration_minutes" integer,
	"notes" text,
	"next_follow_up_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"join_date" date DEFAULT now() NOT NULL,
	"leave_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_uniform_outfits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"image_url" text NOT NULL,
	"gender_target" varchar(10) DEFAULT 'Unisex' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_uniform_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"outfit_id" uuid NOT NULL,
	"service_date" date NOT NULL,
	"gender_target" varchar(10) DEFAULT 'Unisex' NOT NULL,
	"notes" text,
	"assigned_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"description" text,
	"icon_key" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_department_name_unique" UNIQUE("department_name")
);
--> statement-breakpoint
CREATE TABLE "rota_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"member_id" uuid,
	"status" varchar(20) DEFAULT 'Assigned' NOT NULL,
	"notes" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"service_date" date NOT NULL,
	"start_time" time,
	"status" varchar(20) DEFAULT 'Draft' NOT NULL,
	"notes" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_pool_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"preferred_role_name" text,
	"weight" integer DEFAULT 1 NOT NULL,
	"last_scheduled_at" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_swap_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"proposed_member_id" uuid,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_template_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"role_name" varchar(100) NOT NULL,
	"positions_required" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_department_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"recurrence" varchar(20) DEFAULT 'Weekly' NOT NULL,
	"weekday" integer NOT NULL,
	"default_start_time" time,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_lead_member_id_members_id_fk" FOREIGN KEY ("lead_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_departments" ADD CONSTRAINT "branch_departments_deputy_member_id_members_id_fk" FOREIGN KEY ("deputy_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_followups" ADD CONSTRAINT "department_followups_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_followups" ADD CONSTRAINT "department_followups_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_followups" ADD CONSTRAINT "department_followups_recorded_by_id_members_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_followups" ADD CONSTRAINT "department_followups_assigned_to_id_members_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD CONSTRAINT "department_join_requests_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD CONSTRAINT "department_join_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_join_requests" ADD CONSTRAINT "department_join_requests_reviewed_by_members_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_uniform_outfits" ADD CONSTRAINT "department_uniform_outfits_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_uniform_outfits" ADD CONSTRAINT "department_uniform_outfits_uploaded_by_id_members_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_uniform_schedule" ADD CONSTRAINT "department_uniform_schedule_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_uniform_schedule" ADD CONSTRAINT "department_uniform_schedule_outfit_id_department_uniform_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."department_uniform_outfits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_uniform_schedule" ADD CONSTRAINT "department_uniform_schedule_assigned_by_id_members_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_assignments" ADD CONSTRAINT "rota_assignments_instance_id_rota_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."rota_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_assignments" ADD CONSTRAINT "rota_assignments_slot_id_rota_template_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."rota_template_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_assignments" ADD CONSTRAINT "rota_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_instances" ADD CONSTRAINT "rota_instances_template_id_rota_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."rota_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_instances" ADD CONSTRAINT "rota_instances_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_pool_members" ADD CONSTRAINT "rota_pool_members_template_id_rota_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."rota_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_pool_members" ADD CONSTRAINT "rota_pool_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_swap_requests" ADD CONSTRAINT "rota_swap_requests_assignment_id_rota_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."rota_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_swap_requests" ADD CONSTRAINT "rota_swap_requests_requested_by_id_members_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_swap_requests" ADD CONSTRAINT "rota_swap_requests_proposed_member_id_members_id_fk" FOREIGN KEY ("proposed_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_swap_requests" ADD CONSTRAINT "rota_swap_requests_reviewed_by_id_members_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_template_slots" ADD CONSTRAINT "rota_template_slots_template_id_rota_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."rota_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_templates" ADD CONSTRAINT "rota_templates_branch_department_id_branch_departments_id_fk" FOREIGN KEY ("branch_department_id") REFERENCES "public"."branch_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_branch_departments_branch_id" ON "branch_departments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_branch_departments_department_id" ON "branch_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_branch_departments_lead_member_id" ON "branch_departments" USING btree ("lead_member_id");--> statement-breakpoint
CREATE INDEX "idx_branch_departments_is_active" ON "branch_departments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_branch_departments_active" ON "branch_departments" USING btree ("branch_id","department_id") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "idx_department_followups_branch_department_id" ON "department_followups" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_department_followups_member_id" ON "department_followups" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_department_followups_contacted_at" ON "department_followups" USING btree ("contacted_at");--> statement-breakpoint
CREATE INDEX "idx_department_followups_contact_status" ON "department_followups" USING btree ("contact_status");--> statement-breakpoint
CREATE INDEX "idx_department_join_requests_branch_department_id" ON "department_join_requests" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_department_join_requests_member_id" ON "department_join_requests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_department_join_requests_status" ON "department_join_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_department_join_requests_pending" ON "department_join_requests" USING btree ("branch_department_id","member_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "idx_department_members_branch_department_id" ON "department_members" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_department_members_member_id" ON "department_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_department_members_is_active" ON "department_members" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_department_members_assignment" ON "department_members" USING btree ("branch_department_id","member_id","join_date");--> statement-breakpoint
CREATE INDEX "idx_department_uniform_outfits_branch_department_id" ON "department_uniform_outfits" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_department_uniform_outfits_is_active" ON "department_uniform_outfits" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_department_uniform_schedule_branch_department_id" ON "department_uniform_schedule" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_department_uniform_schedule_service_date" ON "department_uniform_schedule" USING btree ("service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_department_uniform_schedule_slot" ON "department_uniform_schedule" USING btree ("branch_department_id","service_date","gender_target");--> statement-breakpoint
CREATE INDEX "idx_departments_is_active" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_rota_assignments_instance_id" ON "rota_assignments" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_rota_assignments_slot_id" ON "rota_assignments" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "idx_rota_assignments_member_id" ON "rota_assignments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_rota_assignments_status" ON "rota_assignments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rota_assignments_member_per_instance" ON "rota_assignments" USING btree ("instance_id","member_id") WHERE member_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_rota_instances_template_id" ON "rota_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_rota_instances_branch_department_id" ON "rota_instances" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_rota_instances_service_date" ON "rota_instances" USING btree ("service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rota_instances_template_date" ON "rota_instances" USING btree ("template_id","service_date");--> statement-breakpoint
CREATE INDEX "idx_rota_pool_members_template_id" ON "rota_pool_members" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_rota_pool_members_member_id" ON "rota_pool_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_rota_pool_members_is_active" ON "rota_pool_members" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rota_pool_members_active" ON "rota_pool_members" USING btree ("template_id","member_id") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "idx_rota_swap_requests_assignment_id" ON "rota_swap_requests" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "idx_rota_swap_requests_requested_by_id" ON "rota_swap_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "idx_rota_swap_requests_status" ON "rota_swap_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rota_template_slots_template_id" ON "rota_template_slots" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rota_template_slots_role" ON "rota_template_slots" USING btree ("template_id","role_name");--> statement-breakpoint
CREATE INDEX "idx_rota_templates_branch_department_id" ON "rota_templates" USING btree ("branch_department_id");--> statement-breakpoint
CREATE INDEX "idx_rota_templates_is_active" ON "rota_templates" USING btree ("is_active");