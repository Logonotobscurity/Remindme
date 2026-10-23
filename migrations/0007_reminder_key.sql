-- Stable reminder identity for create, update, complete, and cancel.
-- The same reminder_key updates one row. It does not insert a second reminder.
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reminder_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_user_key
  ON reminders (user_id, reminder_key);
