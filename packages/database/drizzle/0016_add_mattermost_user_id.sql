-- Add mattermost_user_id to members table
-- Stores the Mattermost user ID assigned when a member account is approved.
-- NULL until the member has been provisioned in Mattermost.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS mattermost_user_id VARCHAR(26);
