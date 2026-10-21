-- Make activity-system records private to the identity that created them.
-- Keep historical shared/demo rows, but quarantine them under a non-login owner.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE projects SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE activity_events SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE activity_events ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE decisions ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE decisions SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE decisions ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE action_items ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE action_items SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE action_items ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE reminders SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE reminders ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE daily_summaries SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE daily_summaries ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE connected_accounts SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE connected_accounts ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE sync_jobs SET user_id = 'legacy-unassigned' WHERE user_id IS NULL;
ALTER TABLE sync_jobs ALTER COLUMN user_id SET NOT NULL;

-- Project names and idempotency keys must be unique within an owner, not globally.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_user_name
  ON projects(user_id, name);

ALTER TABLE activity_events
  DROP CONSTRAINT IF EXISTS activity_events_source_source_reference_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_events_user_source_reference
  ON activity_events(user_id, source, source_reference);

ALTER TABLE daily_summaries
  DROP CONSTRAINT IF EXISTS daily_summaries_project_id_summary_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_summaries_user_project_date
  ON daily_summaries(user_id, project_id, summary_date);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_time
  ON activity_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user_status
  ON action_items(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_user_due
  ON reminders(user_id, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date
  ON daily_summaries(user_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id
  ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id
  ON sync_jobs(user_id, created_at DESC);
