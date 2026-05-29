-- Adds fellowship meeting-day/time + map location columns.
-- Supersedes the orphaned 0013_add_fellowship_location.sql, which collided with
-- 0013_add_coordinator_name for the 0013 slot and was therefore never registered
-- in the journal (so its columns were never created — breaking the seed and the
-- fellowships-map query). IF NOT EXISTS keeps this safe on any DB that already
-- has these columns.
ALTER TABLE "fellowships" ADD COLUMN IF NOT EXISTS "meeting_day" varchar(20);
ALTER TABLE "fellowships" ADD COLUMN IF NOT EXISTS "meeting_time" varchar(10);
ALTER TABLE "fellowships" ADD COLUMN IF NOT EXISTS "latitude" double precision;
ALTER TABLE "fellowships" ADD COLUMN IF NOT EXISTS "longitude" double precision;
ALTER TABLE "fellowships" ADD COLUMN IF NOT EXISTS "country" varchar(100);
