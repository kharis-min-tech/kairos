-- Add latitude/longitude to branches so autofill can persist coordinates
-- from the Mapbox Search Box retrieve response. Populated automatically on
-- branch create/edit when the user picks an address suggestion; also usable
-- as a fallback for the fellowships map when a fellowship has no coords of
-- its own.

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
