-- Add optional fellowship/department attribution to outreach_programs and souls.
-- This lets a leader scope on /souls see souls that came through their
-- fellowship/dept directly (e.g. solo evangelism on behalf of their K-Group),
-- in addition to assigned-member / coordinator / participant paths.

ALTER TABLE outreach_programs
  ADD COLUMN IF NOT EXISTS fellowship_id uuid
    REFERENCES fellowships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_department_id uuid
    REFERENCES branch_departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_programs_fellowship_id
  ON outreach_programs(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_branch_department_id
  ON outreach_programs(branch_department_id);

ALTER TABLE souls
  ADD COLUMN IF NOT EXISTS fellowship_id uuid
    REFERENCES fellowships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_department_id uuid
    REFERENCES branch_departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_souls_fellowship_id
  ON souls(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_souls_branch_department_id
  ON souls(branch_department_id);
