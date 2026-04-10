-- Migration: Add fellowship_type column to fellowships table
-- This column stores the type of fellowship (K-Groups, Kharis Express, etc.)

ALTER TABLE "fellowships" 
ADD COLUMN IF NOT EXISTS "fellowship_type" VARCHAR(100) NOT NULL DEFAULT 'K-Groups';

-- Add a check constraint to ensure only valid fellowship types
ALTER TABLE "fellowships"
DROP CONSTRAINT IF EXISTS "chk_fellowships_type";

ALTER TABLE "fellowships"
ADD CONSTRAINT "chk_fellowships_type" 
CHECK ("fellowship_type" IN ('K-Groups', 'Kharis Express', 'New Breeds', 'Kharis on Campus', 'Kharis on Campus Colleges'));
