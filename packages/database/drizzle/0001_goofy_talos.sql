CREATE TABLE "fellowship_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fellowship_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "service_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "emergency_contact_relationship" varchar(50);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "password_reset_token" varchar(255);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "password_reset_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "fellowship_join_requests" ADD CONSTRAINT "fellowship_join_requests_fellowship_id_fellowships_id_fk" FOREIGN KEY ("fellowship_id") REFERENCES "public"."fellowships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_join_requests" ADD CONSTRAINT "fellowship_join_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fellowship_join_requests" ADD CONSTRAINT "fellowship_join_requests_reviewed_by_members_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fellowship_join_requests_fellowship_id" ON "fellowship_join_requests" USING btree ("fellowship_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_join_requests_member_id" ON "fellowship_join_requests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_fellowship_join_requests_status" ON "fellowship_join_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fellowship_join_requests_member" ON "fellowship_join_requests" USING btree ("fellowship_id","member_id");