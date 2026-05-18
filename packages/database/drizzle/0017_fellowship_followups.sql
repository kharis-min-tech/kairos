CREATE TABLE "fellowship_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fellowship_id" uuid NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fellowship_followups_duration_check" CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "fellowship_followups" ADD CONSTRAINT "fellowship_followups_fellowship_id_fellowships_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "public"."fellowships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_followups" ADD CONSTRAINT "fellowship_followups_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_followups" ADD CONSTRAINT "fellowship_followups_recorded_by_id_members_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_followups" ADD CONSTRAINT "fellowship_followups_assigned_to_id_members_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fellowship_followups_fellowship_id" ON "fellowship_followups" USING btree ("fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_followups_member_id" ON "fellowship_followups" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_followups_contacted_at" ON "fellowship_followups" USING btree ("contacted_at");--> statement-breakpoint
CREATE INDEX "idx_fellowship_followups_contact_status" ON "fellowship_followups" USING btree ("contact_status");
