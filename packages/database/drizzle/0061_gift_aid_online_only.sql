-- 0061 — Gift Aid is online only.
--
-- 0059 shipped four channels (online, paper, verbal, imported) because HMRC
-- recognises all four. Kharis holds no paper declarations and is importing
-- none: every declaration is made fresh by the donor on our own form. The
-- admin-capture endpoint that was the only writer of the other three had no
-- UI and was never reachable, so this removes the channels and the evidence
-- columns that existed solely to serve them.
--
-- Safe to narrow the CHECK: 'online' is the only value any reachable code
-- path has ever written, so no row can violate it.
--
-- NOT removed, deliberately:
--   * source_ip / user_agent — corroborating evidence for an online
--     declaration, which is the only kind there is.
--   * cancellation_method, which still includes 'letter' and 'phone'. A
--     WITHDRAWAL arriving by post is not a paper declaration, and the 2016
--     Regulations require us to record the method it arrived by.

ALTER TABLE gift_aid_declarations
  DROP CONSTRAINT IF EXISTS gift_aid_channel_check;

ALTER TABLE gift_aid_declarations
  ADD CONSTRAINT gift_aid_channel_check CHECK (channel IN ('online'));

-- The scan of a signed paper form. There are no paper forms.
ALTER TABLE gift_aid_declarations
  DROP COLUMN IF EXISTS evidence_url;

-- The date a verbal declaration's written confirmation went out. There are
-- no verbal declarations.
ALTER TABLE gift_aid_declarations
  DROP COLUMN IF EXISTS written_confirmation_sent_at;
