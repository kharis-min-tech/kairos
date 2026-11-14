-- Regions: replace single-column UNIQUE(region_name) with composite
-- UNIQUE(region_name, country). The old constraint prevented having two
-- regions in the same continent (e.g. "Europe / UK" and "Europe / France").
-- The composite matches what the UI already implies: one region per
-- (continent, country) pair.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS, then ADD only if the composite
-- doesn't already exist (guarded via pg_constraint lookup).

ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_region_name_key;
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_region_name_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'regions_region_name_country_key'
  ) THEN
    ALTER TABLE regions
      ADD CONSTRAINT regions_region_name_country_key
      UNIQUE (region_name, country);
  END IF;
END $$;
