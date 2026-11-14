-- Add address text columns to fellowships so K-Groups (and any fellowship
-- that meets outside the parent branch's building) can capture their own
-- location via the AddressAutofill composite. lat/lng already exist on the
-- table; these text columns give the leader something to display and let
-- autofill retrieve populate every field at once.

ALTER TABLE fellowships
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
