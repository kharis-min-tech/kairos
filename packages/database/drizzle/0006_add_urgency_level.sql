ALTER TABLE "follow_ups" ADD COLUMN "urgency_level" varchar(20);--> statement-breakpoint
CREATE INDEX "idx_follow_ups_urgency_level" ON "follow_ups" USING btree ("urgency_level");
