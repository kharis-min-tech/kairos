ALTER TABLE "members" ADD COLUMN "secondary_branch_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "is_at_secondary_branch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "secondary_address" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "secondary_city" varchar(100);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "secondary_postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_secondary_branch_id_branches_id_fk" FOREIGN KEY ("secondary_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_members_secondary_branch_id" ON "members" USING btree ("secondary_branch_id");