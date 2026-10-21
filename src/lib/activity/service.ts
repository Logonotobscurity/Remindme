import { getSql } from "@/lib/db";
import { normalizeActivityEvent, type ActivityEventInput } from "@/lib/activity/types";

export async function upsertProject(
  userId: string,
  projectName: string,
  description?: string,
) {
  const sql = await getSql();
  const rows = await sql.query<{ id: number }>(
    [
      "INSERT INTO projects (user_id, name, description)",
      "VALUES ($1, $2, $3)",
      "ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()",
      "RETURNING id",
    ].join("\n"),
    [userId, projectName, description ?? null],
  );

  return rows[0]?.id ?? null;
}

export async function createActivity(userId: string, input: ActivityEventInput) {
  const sql = await getSql();
  const activity = normalizeActivityEvent(input);
  const projectId = input.project
    ? await upsertProject(userId, input.project)
    : null;

  const rows = await sql.query<{ id: number }>(
    [
      "INSERT INTO activity_events (",
      "  user_id, source, project_id, project_name, category, title, summary,",
      "  activity_type, completion_status, source_reference, capture_method,",
      "  privacy_level, occurred_at",
      ")",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      "ON CONFLICT (user_id, source, source_reference)",
      "DO UPDATE SET",
      "  project_id = EXCLUDED.project_id,",
      "  project_name = EXCLUDED.project_name,",
      "  title = EXCLUDED.title,",
      "  summary = EXCLUDED.summary,",
      "  category = EXCLUDED.category,",
      "  activity_type = EXCLUDED.activity_type,",
      "  completion_status = EXCLUDED.completion_status,",
      "  capture_method = EXCLUDED.capture_method,",
      "  privacy_level = EXCLUDED.privacy_level,",
      "  updated_at = NOW()",
      "RETURNING id",
    ].join("\n"),
    [
      userId,
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

export async function listActivities(
  userId: string,
  options?: { limit?: number; date?: string },
) {
  const sql = await getSql();
  const requestedLimit = options?.limit ?? 50;
  const limit = Math.max(1, Math.min(100, Math.trunc(requestedLimit)));
  const date = options?.date;
  const columns =
    "id, source, project_name, category, title, summary, activity_type, " +
    "completion_status, occurred_at, created_at";

  if (date) {
    return sql.query(
      [
        "SELECT " + columns,
        "FROM activity_events",
        "WHERE user_id = $1 AND occurred_at::date = $2::date",
        "ORDER BY occurred_at DESC",
        "LIMIT $3",
      ].join("\n"),
      [userId, date, limit],
    );
  }

  return sql.query(
    [
      "SELECT " + columns,
      "FROM activity_events",
      "WHERE user_id = $1",
      "ORDER BY occurred_at DESC",
      "LIMIT $2",
    ].join("\n"),
    [userId, limit],
  );
}

export type ActionItemStatusFilter = "pending" | "completed" | "all";

export async function listPendingActions(
  userId: string,
  status: ActionItemStatusFilter = "pending",
) {
  const sql = await getSql();
  const columns = "id, title, summary, status, due_at, created_at";

  if (status === "all") {
    return sql.query(
      [
        "SELECT " + columns,
        "FROM action_items",
        "WHERE user_id = $1",
        "ORDER BY created_at DESC",
        "LIMIT 100",
      ].join("\n"),
      [userId],
    );
  }

  return sql.query(
    [
      "SELECT " + columns,
      "FROM action_items",
      "WHERE user_id = $1 AND status = $2",
      "ORDER BY created_at DESC",
      "LIMIT 100",
    ].join("\n"),
    [userId, status],
  );
}

export async function listReminders(options: {
  userId: string;
  dueDate?: string;
}) {
  const sql = await getSql();
  const columns = "id, title, due_at, status, notified, created_at";

  if (options.dueDate) {
    return sql.query(
      [
        "SELECT " + columns,
        "FROM reminders",
        "WHERE user_id = $1 AND due_at::date = $2::date",
        "ORDER BY due_at ASC",
        "LIMIT 100",
      ].join("\n"),
      [options.userId, options.dueDate],
    );
  }

  return sql.query(
    [
      "SELECT " + columns,
      "FROM reminders",
      "WHERE user_id = $1",
      "ORDER BY due_at ASC NULLS LAST",
      "LIMIT 100",
    ].join("\n"),
    [options.userId],
  );
}
