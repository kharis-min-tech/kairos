-- 0059_gift_aid_declarations.sql
--
-- Gift Aid: the auditable record of each declaration, plus the church-scoped
-- role that administers them.
--
-- WHY A NEW TABLE, AND NOT consent_records
--
--   A Gift Aid declaration is a tax document. HMRC's detailed guidance
--   (chapter 3.7.2) says in terms that "transcribing of declarations ... into
--   a database will not satisfy the requirements", so the record has to carry
--   the exact wording the donor agreed to and a pointer to the original
--   artefact — neither of which consent_records has room for.
--
--   It also has to OUTLIVE the member. `deleteMyAccount` scrubs first_name,
--   last_name, address and postal_code on the member row, and consent_records
--   is ON DELETE CASCADE from members. A declaration that leaned on either
--   would lose its evidence the moment a donor exercised their right to
--   erasure, and the charity would have to repay the tax, with interest, on
--   every claim that declaration supported. So the declared name and address
--   live on this table, and member_id is ON DELETE RESTRICT.
--
-- CHURCH SCOPE
--
--   A declaration names the CHARITY. One charity contains every branch, so no
--   branch grant can describe authority over one — the same argument that put
--   Membership Admin (0048) and Safeguarding Head (0054) at church scope.
--   branch_id here is a query handle for the admin queue, not the record's
--   reach.
--
-- RETENTION
--
--   retention_review_at is six years past the end of the accounting period
--   containing the last covered donation. The charity is a company limited by
--   guarantee and its accounting period runs June to May, so the period ends
--   31 May. That date lives in GIFT_AID_PERIOD_END_MONTH / _DAY in
--   packages/types/src/gift-aid.ts and nowhere else, so the column holds
--   whatever the application computed at the time it was written.
--
--   Nothing acts on this column automatically and no cron touches this table:
--   an open HMRC enquiry extends the period indefinitely and a scheduled job
--   cannot know about one.

CREATE TABLE IF NOT EXISTS gift_aid_declarations (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link, not identity. Nullable: the pre-rollout public form captures
  -- declarations from people with no Kairos account yet.
  member_id                    UUID REFERENCES members(id) ON DELETE RESTRICT,
  branch_id                    UUID REFERENCES branches(id) ON DELETE SET NULL,

  -- Declared identity. Sized to the Charities Online schedule columns so a
  -- declaration cannot be captured in a shape that cannot be claimed on.
  title                        VARCHAR(4),
  first_name                   VARCHAR(35) NOT NULL,
  last_name                    VARCHAR(35) NOT NULL,
  address_line1                VARCHAR(200) NOT NULL,
  address_line2                VARCHAR(200),
  city                         VARCHAR(100),
  postcode                     VARCHAR(10),
  country_code                 VARCHAR(2) NOT NULL DEFAULT 'GB',
  email                        VARCHAR(100),
  phone                        VARCHAR(20),

  -- What it covers
  coverage                     VARCHAR(20) NOT NULL DEFAULT 'past_and_future',
  covers_from                  DATE,
  single_gift_description      VARCHAR(200),

  -- Evidence
  channel                      VARCHAR(20) NOT NULL,
  wording_version              VARCHAR(20) NOT NULL,
  declaration_text             TEXT NOT NULL,
  evidence_url                 TEXT,
  source_ip                    VARCHAR(45),
  user_agent                   TEXT,
  written_confirmation_sent_at TIMESTAMP,

  declared_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  captured_by_id               UUID REFERENCES members(id) ON DELETE SET NULL,

  -- Lifecycle
  -- In force, or not. Being unmatched to a member is not a status; that is
  -- member_id IS NULL, a separate axis.
  status                       VARCHAR(20) NOT NULL DEFAULT 'active',
  cancelled_at                 TIMESTAMP,
  cancellation_method          VARCHAR(20),
  cancellation_notes           TEXT,
  cancelled_by_id              UUID REFERENCES members(id) ON DELETE SET NULL,
  superseded_by_id             UUID REFERENCES gift_aid_declarations(id) ON DELETE SET NULL,
  retention_review_at          TIMESTAMP,

  is_active                    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT gift_aid_coverage_check
    CHECK (coverage IN ('past_and_future', 'future', 'single')),
  CONSTRAINT gift_aid_channel_check
    CHECK (channel IN ('online', 'paper', 'verbal', 'imported')),
  CONSTRAINT gift_aid_status_check
    CHECK (status IN ('active', 'cancelled', 'invalid')),
  CONSTRAINT gift_aid_cancellation_method_check
    CHECK (cancellation_method IS NULL
           OR cancellation_method IN ('online', 'email', 'phone', 'letter', 'in_person')),
  -- A withdrawal is only a record of one if it carries both the date and the
  -- method, which is what the 2016 Regulations require.
  CONSTRAINT gift_aid_cancellation_complete_check
    CHECK ((cancelled_at IS NULL AND cancellation_method IS NULL)
           OR (cancelled_at IS NOT NULL AND cancellation_method IS NOT NULL)),
  CONSTRAINT gift_aid_cancelled_status_check
    CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  -- UK donors must give a postcode; overseas donors must not (HMRC rejects
  -- Isle of Man and Channel Islands postcodes outright).
  CONSTRAINT gift_aid_uk_postcode_required_check
    CHECK (country_code <> 'GB' OR postcode IS NOT NULL),
  -- Backdated coverage has to say how far back, or it is not unambiguous.
  CONSTRAINT gift_aid_covers_from_check
    CHECK (coverage <> 'past_and_future' OR covers_from IS NOT NULL)
);

-- One declaration in force per member. Partial, so withdrawn and superseded
-- rows accumulate beneath it without tripping the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gift_aid_active_per_member
  ON gift_aid_declarations(member_id)
  WHERE status = 'active' AND member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gift_aid_member ON gift_aid_declarations(member_id);
CREATE INDEX IF NOT EXISTS idx_gift_aid_branch ON gift_aid_declarations(branch_id);
CREATE INDEX IF NOT EXISTS idx_gift_aid_status_declared
  ON gift_aid_declarations(status, declared_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_aid_email ON gift_aid_declarations(email);
CREATE INDEX IF NOT EXISTS idx_gift_aid_postcode ON gift_aid_declarations(postcode);

DROP TRIGGER IF EXISTS set_gift_aid_declarations_updated_at ON gift_aid_declarations;
CREATE TRIGGER set_gift_aid_declarations_updated_at
  BEFORE UPDATE ON gift_aid_declarations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Gift Aid Admin ────────────────────────────────────────
--
-- Idempotent via NOT EXISTS, matching 0048/0051/0054: staging's public schema
-- was provisioned out-of-band, so we cannot assume roles.role_name is unique.
INSERT INTO roles (role_name, description)
SELECT
  'Gift Aid Admin',
  'Church-wide administration of Gift Aid declarations. Reviews submissions, matches them to members, records withdrawals taken by phone or letter, and exports the HMRC claim register. Carries no branch, directory or safeguarding sight.'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Gift Aid Admin');
