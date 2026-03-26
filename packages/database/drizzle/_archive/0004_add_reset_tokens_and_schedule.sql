ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_token varchar(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_expiry timestamp;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS service_schedule jsonb;
