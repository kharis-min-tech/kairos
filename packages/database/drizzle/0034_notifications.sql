-- Phase 1: Notification system foundation.
--
-- Two tables:
--   notification_preferences — per (member, category) override of defaults.
--                              Absence = use default. Security category is
--                              always treated as enabled regardless of row.
--   notification_events      — outbound log keyed on recipient. Immediate
--                              sends stamp sent_at at dispatch; digest rows
--                              leave it NULL until the daily cron batches.

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cadence VARCHAR(20) NOT NULL DEFAULT 'immediate',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_category_check;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_category_check
  CHECK (category IN ('security','workflow','lifecycle','forms','rota','uniform','dept_recruitment'));

ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_cadence_check;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_cadence_check
  CHECK (cadence IN ('immediate','digest_daily'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_preferences_member_category
  ON notification_preferences(member_id, category)
  WHERE is_active = TRUE;

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  subject_type VARCHAR(50),
  subject_id UUID,
  payload JSONB NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  sent_at TIMESTAMP,
  batch_id UUID,
  send_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_events DROP CONSTRAINT IF EXISTS notification_events_category_check;
ALTER TABLE notification_events ADD CONSTRAINT notification_events_category_check
  CHECK (category IN ('security','workflow','lifecycle','forms','rota','uniform','dept_recruitment'));

CREATE INDEX IF NOT EXISTS idx_notification_events_member_sent
  ON notification_events(member_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_notification_events_digest_pending
  ON notification_events(member_id, category)
  WHERE sent_at IS NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_notification_events_event_type
  ON notification_events(event_type);

CREATE TRIGGER set_notification_events_updated_at
  BEFORE UPDATE ON notification_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
