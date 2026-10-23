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
        "WHERE user_id = $1 AND occurred_at >= $2::date",
        "  AND occurred_at < ($2::date + INTERVAL '1 day')",
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
  const columns = "id, reminder_key, title, due_at, status, notified, created_at";

  if (options.dueDate) {
    return sql.query(
      [
        "SELECT " + columns,
        "FROM reminders",
        "WHERE user_id = $1 AND due_at >= $2::date",
        "  AND due_at < ($2::date + INTERVAL '1 day')",
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

const REMINDER_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

export function googleCalendarTemplateUrl(title: string, dueAt: string | null) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  if (!dueAt) return url.toString();
  const start = new Date(dueAt);
  if (!Number.isFinite(start.getTime())) return url.toString();
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  url.searchParams.set("dates", stamp(start) + "/" + stamp(end));
  return url.toString();
}

export async function saveReminder(
  userId: string,
  input: { reminderKey: string; title: string; dueAt?: string | null; status?: string },
) {
  const sql = await getSql();
  const status = REMINDER_STATUSES.has(input.status ?? "") ? input.status : "scheduled";
  const rows = await sql.query<{
    id: number;
    reminder_key: string;
    title: string;
    due_at: string | null;
    status: string;
  }>(
    [
      "INSERT INTO reminders (user_id, reminder_key, title, due_at, status)",
      "VALUES ($1, $2, $3, $4, $5)",
      "ON CONFLICT (user_id, reminder_key)",
      "DO UPDATE SET",
      "  title = EXCLUDED.title,",
      "  due_at = EXCLUDED.due_at,",
      "  status = EXCLUDED.status,",
      "  updated_at = NOW()",
      "RETURNING id, reminder_key, title, due_at, status",
    ].join("\n"),
    [userId, input.reminderKey, input.title, input.dueAt ?? null, status],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    calendarUrl: row.status === "cancelled" ? null : googleCalendarTemplateUrl(row.title, row.due_at),
  };
}


export async function searchActivities(
  userId: string,
  options: { query: string; limit?: number },
) {
  const sql = await getSql();
  const query = options.query.trim();
  const limit = Math.max(1, Math.min(50, Math.trunc(options.limit ?? 10)));
  if (!query) return [];

  const term = `%${query}%`;
  return sql.query(
    [
      "SELECT id, source, project_name, category, title, summary, activity_type,",
      "  completion_status, occurred_at, created_at",
      "FROM activity_events",
      "WHERE user_id = $1 AND (",
      "  title ILIKE $2 OR COALESCE(summary, '') ILIKE $2 OR",
      "  COALESCE(project_name, '') ILIKE $2 OR COALESCE(category, '') ILIKE $2",
      ")",
      "ORDER BY occurred_at DESC",
      "LIMIT $3",
    ].join("\n"),
    [userId, term, limit],
  );
}

export async function upsertDecision(
  userId: string,
  source: string,
  input: {
    activityId: number | null;
    project?: string;
    title: string;
    decision: string;
    rationale?: string;
    sourceReference?: string;
  },
) {
  const sql = await getSql();
  const projectId = input.project ? await upsertProject(userId, input.project) : null;
  const rows = await sql.query<{ id: number }>(
    [
      "INSERT INTO decisions (user_id, source, source_reference, activity_id, project_id, title, rationale, decision_text)",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      "ON CONFLICT (user_id, source, source_reference) WHERE source_reference IS NOT NULL",
      "DO UPDATE SET",
      "  activity_id = EXCLUDED.activity_id, project_id = EXCLUDED.project_id,",
      "  title = EXCLUDED.title, rationale = EXCLUDED.rationale, decision_text = EXCLUDED.decision_text",
      "RETURNING id",
    ].join("\n"),
    [
      userId,
      source,
      input.sourceReference ?? null,
      input.activityId,
      projectId,
      input.title,
      input.rationale ?? null,
      input.decision,
    ],
  );
  return rows[0]?.id ?? null;
}

export async function upsertMcpActionItem(
  userId: string,
  source: string,
  input: {
    title: string;
    summary?: string;
    project?: string;
    sourceReference?: string;
    dueAt?: string;
  },
) {
  const sql = await getSql();
  const projectId = input.project ? await upsertProject(userId, input.project) : null;
  const rows = await sql.query<{ id: number; status: string; due_at: string | null }>(
    [
      "INSERT INTO action_items (user_id, source, source_reference, project_id, title, summary, status, due_at)",
      "VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)",
      "ON CONFLICT (user_id, source, source_reference) WHERE source_reference IS NOT NULL",
      "DO UPDATE SET",
      "  project_id = EXCLUDED.project_id, title = EXCLUDED.title,",
      "  summary = EXCLUDED.summary, due_at = EXCLUDED.due_at, updated_at = NOW()",
      "RETURNING id, status, due_at",
    ].join("\n"),
    [
      userId,
      source,
      input.sourceReference ?? null,
      projectId,
      input.title,
      input.summary ?? null,
      input.dueAt ?? null,
    ],
  );
  return rows[0] ?? null;
}
