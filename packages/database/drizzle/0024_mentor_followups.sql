CREATE TABLE IF NOT EXISTS mentor_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES new_believer_enrollments(id) ON DELETE CASCADE,
  mentor_member_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  note text NOT NULL,
  contacted_at timestamp NOT NULL DEFAULT NOW(),
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_followups_enrollment_id ON mentor_followups(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_mentor_followups_mentor_member_id ON mentor_followups(mentor_member_id);
CREATE INDEX IF NOT EXISTS idx_mentor_followups_contacted_at ON mentor_followups(contacted_at);
CREATE INDEX IF NOT EXISTS idx_mentor_followups_is_active ON mentor_followups(is_active);

DROP TRIGGER IF EXISTS set_mentor_followups_updated_at ON mentor_followups;
CREATE TRIGGER set_mentor_followups_updated_at
  BEFORE UPDATE ON mentor_followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
