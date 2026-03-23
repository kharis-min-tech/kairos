CREATE TABLE IF NOT EXISTS fellowship_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fellowship_id uuid NOT NULL REFERENCES fellowships(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid REFERENCES members(id) ON DELETE SET NULL,
  reviewed_at timestamp,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fellowship_join_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT uq_fellowship_join_requests_member UNIQUE (fellowship_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_fellowship_join_requests_fellowship_id ON fellowship_join_requests(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_join_requests_member_id ON fellowship_join_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_join_requests_status ON fellowship_join_requests(status);

CREATE TRIGGER set_fellowship_join_requests_updated_at
  BEFORE UPDATE ON fellowship_join_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
