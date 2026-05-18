-- Add is_open_to_all_branches column to outreach_programs table
ALTER TABLE "outreach_programs" ADD COLUMN IF NOT EXISTS "is_open_to_all_branches" boolean DEFAULT false NOT NULL;
