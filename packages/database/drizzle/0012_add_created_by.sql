-- Add created_by column to outreach_programs table
ALTER TABLE "outreach_programs" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "members"("id") ON DELETE SET NULL;
