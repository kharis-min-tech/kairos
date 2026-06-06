CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "target" varchar(20) NOT NULL DEFAULT 'branch',
  "target_entity_id" uuid,
  "title" varchar(200),
  "message" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "announcements_target_check" CHECK (target IN ('branch', 'fellowship', 'department'))
);

CREATE INDEX IF NOT EXISTS "idx_announcements_branch_id" ON "announcements" ("branch_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_author_id" ON "announcements" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_created_at" ON "announcements" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_announcements_target" ON "announcements" ("target");
