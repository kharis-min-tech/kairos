-- Phase 1.5 Better-Auth: SSO onboarding gate.
--
-- Adds `must_complete_profile` to members. Set to TRUE when a member is
-- created via the OAuth callback (IdP filled name + email but never gave us
-- phone, T&C consent, or a user-confirmed home branch). The web + mobile
-- dashboard guards redirect to a profile-completion screen while this flag
-- is set — that screen fills the missing fields, records consent, and clears
-- the flag before the user reaches /pending-approval.
--
-- Existing password-signup rows and every pre-existing SSO row default to
-- FALSE (the guard doesn't fire). Any pre-existing SSO signups on staging
-- that predate this migration should be retroactively flipped so their
-- next login walks through the same onboarding flow:
--
--   UPDATE members SET must_complete_profile = TRUE
--   WHERE password_hash = '' AND approval_status = 'pending';
--
-- (Documented in apps/api/BETTER_AUTH_SETUP.md §9.)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS must_complete_profile BOOLEAN NOT NULL DEFAULT FALSE;
