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
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_soul_id_souls_id_fk" FOREIGN KEY ("soul_id") REFERENCES "public"."souls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_participants" ADD CONSTRAINT "outreach_participants_outreach_id_outreach_programs_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_participants" ADD CONSTRAINT "outreach_participants_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_coordinator_id_members_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_outreach_id_outreach_programs_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_assigned_member_id_members_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "souls" ADD CONSTRAINT "souls_converted_to_member_id_members_id_fk" FOREIGN KEY ("converted_to_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "idx_souls_email" ON "souls" USING btree ("email");