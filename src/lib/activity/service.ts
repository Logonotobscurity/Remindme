import { getSql } from "@/lib/db";
import { normalizeActivityEvent, type ActivityEventInput } from "@/lib/activity/types";

export async function upsertProject(projectName: string, description?: string) {
  const sql = await getSql();
  const rows = await sql.query<{ id: number }>(
    `
      INSERT INTO projects (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `,
    [projectName, description ?? null],
  );

  return rows[0]?.id ?? null;
}

export async function createActivity(input: ActivityEventInput) {
  const sql = await getSql();
  const activity = normalizeActivityEvent(input);
  const projectId = input.project ? await upsertProject(input.project) : null;

  const rows = await sql.query<{ id: number }>(
    `
      INSERT INTO activity_events (
        source,
        project_id,
        project_name,
        category,
        title,
        summary,
        activity_type,
        completion_status,
        source_reference,
        capture_method,
        privacy_level,
        occurred_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (source, source_reference)
      DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        category = EXCLUDED.category,
        activity_type = EXCLUDED.activity_type,
        completion_status = EXCLUDED.completion_status,
        updated_at = NOW()
      RETURNING id
    `,
    [
      activity.source,
      projectId,
      activity.project_name,
      activity.category,
      activity.title,
      activity.summary,
      activity.activity_type,
      activity.completion_status,
      activity.source_reference,
      activity.capture_method,
      activity.privacy_level,
      activity.occurred_at,
    ],
  );

  return rows[0]?.id ?? null;
}

export async function listActivities(options?: { limit?: number; date?: string }) {
  const sql = await getSql();
  const limit = options?.limit ?? 50;
  const date = options?.date;

  if (date) {
    return sql.query(
      `
        SELECT *
        FROM activity_events
        WHERE DATE(occurred_at) = DATE($1)
        ORDER BY occurred_at DESC
        LIMIT $2
      `,
      [date, limit],
    );
  }

  return sql.query(
    `
      SELECT *
      FROM activity_events
      ORDER BY occurred_at DESC
      LIMIT $1
    `,
    [limit],
  );
}

export async function listPendingActions() {
  const sql = await getSql();
  return sql.query(
    `
      SELECT *
      FROM action_items
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `,
    [],
  );
}

export async function listReminders(options?: { dueDate?: string }) {
  const sql = await getSql();

  if (options?.dueDate) {
    return sql.query(
      `
        SELECT *
        FROM reminders
        WHERE DATE(due_at) = DATE($1)
        ORDER BY due_at ASC
      `,
      [options.dueDate],
    );
  }

  return sql.query(
    `
      SELECT *
      FROM reminders
      ORDER BY due_at ASC NULLS LAST
    `,
    [],
  );
}
