-- Add coordinator_name column to outreach_programs table
ALTER TABLE "outreach_programs" ADD COLUMN IF NOT EXISTS "coordinator_name" varchar(200);
