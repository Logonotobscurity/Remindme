export type ActivitySource = "claude" | "grok" | "chatgpt" | "pwa" | "log_on" | "voice" | "manual" | "system";
export type ActivityType = "research" | "engineering" | "decision" | "idea" | "meeting" | "note" | "reminder" | "journal" | "sync" | "other";
export type ActivityStatus = "recorded" | "in_progress" | "completed" | "archived";
export type CaptureMethod = "mcp" | "api" | "import" | "manual" | "voice" | "log_on" | "automation";
export type PrivacyLevel = "public" | "private" | "internal";

export interface ActivityEventInput {
  source: ActivitySource;
  project?: string;
  category?: string;
  title: string;
  summary?: string;
  activityType?: ActivityType;
  sourceReference?: string;
  captureMethod?: CaptureMethod;
  privacyLevel?: PrivacyLevel;
  completionStatus?: ActivityStatus;
  occurredAt?: string;
}

export interface ActivityEventRecord {
  id: number;
  source: string;
  project_id: number | null;
  project_name: string | null;
  category: string | null;
  title: string;
  summary: string | null;
  activity_type: string | null;
  completion_status: string;
  source_reference: string | null;
  capture_method: string;
  privacy_level: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItemRecord {
  id: number;
  project_id: number | null;
  activity_id: number | null;
  title: string;
  summary: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderRecord {
  id: number;
  action_item_id: number | null;
  project_id: number | null;
  title: string;
  due_at: string | null;
  status: string;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

export function normalizeActivityEvent(input: ActivityEventInput) {
  return {
    source: input.source,
    project_name: input.project ?? null,
    category: input.category ?? null,
    title: input.title,
    summary: input.summary ?? null,
    activity_type: input.activityType ?? "other",
    completion_status: input.completionStatus ?? "recorded",
    source_reference: input.sourceReference ?? null,
    capture_method: input.captureMethod ?? "manual",
    privacy_level: input.privacyLevel ?? "private",
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  };
}
