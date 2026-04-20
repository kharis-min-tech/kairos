ALTER TABLE "follow_ups" ADD COLUMN "urgency_level" varchar(20);--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD COLUMN "coordinator_name" varchar(200);--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD COLUMN "is_open_to_all_branches" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach_programs" ADD CONSTRAINT "outreach_programs_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_follow_ups_urgency_level" ON "follow_ups" USING btree ("urgency_level");