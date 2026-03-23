ALTER TABLE members ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
