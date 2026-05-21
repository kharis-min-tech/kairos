ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "urgency_level" varchar(20);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_follow_ups_urgency_level" ON "follow_ups" USING btree ("urgency_level");
