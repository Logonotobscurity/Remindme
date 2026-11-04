/**
 * Typed Ingestion Schemas — Re:Mind Me Phase 2
 *
 * Six canonical input types. Everything that enters memory should be
 * normalized into one of these before storage.
 */

export type IngestionKind = "contact" | "task" | "note" | "doc" | "reminder" | "signal";

export interface ContactInput {
  kind: "contact";
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}

export interface TaskInput {
  kind: "task";
  title: string;
  description?: string;
  dueAt?: string; // ISO
  priority?: "low" | "medium" | "high";
  project?: string;
  status?: "open" | "in_progress" | "done";
}

export interface NoteInput {
  kind: "note";
  title?: string;
  body: string;
  tags?: string[];
  source?: string;
}

export interface DocInput {
  kind: "doc";
  title: string;
  url?: string;
  summary?: string;
  mimeType?: string;
  tags?: string[];
}

export interface ReminderInput {
  kind: "reminder";
  text: string;
  dueAt: string; // ISO
  location?: string;
  recurring?: boolean;
}

export interface SignalInput {
  kind: "signal";
  source: string;
  event: string;
  payload?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}

export type IngestionInput =
  | ContactInput
  | TaskInput
  | NoteInput
  | DocInput
  | ReminderInput
  | SignalInput;

/** Normalized shape written into dual-layer memory. */
export interface NormalizedMemory {
  id: string;
  kind: IngestionKind;
  content: string;
  metadata: Record<string, unknown>;
  sensitivity: "public" | "private" | "restricted";
  createdAt: number;
}

export function normalize(input: IngestionInput, id?: string): NormalizedMemory {
  const now = Date.now();
  const recordId = id ?? `ing_${now}_${Math.random().toString(36).slice(2, 7)}`;

  switch (input.kind) {
    case "contact":
      return {
        id: recordId,
        kind: "contact",
        content: `${input.name}${input.email ? ` <${input.email}>` : ""}${input.phone ? ` (${input.phone})` : ""}`,
        metadata: { name: input.name, email: input.email, phone: input.phone, tags: input.tags, notes: input.notes },
        sensitivity: "private",
        createdAt: now,
      };
    case "task":
      return {
        id: recordId,
        kind: "task",
        content: input.title + (input.description ? `\n${input.description}` : ""),
        metadata: {
          title: input.title,
          dueAt: input.dueAt,
          priority: input.priority ?? "medium",
          project: input.project,
          status: input.status ?? "open",
        },
        sensitivity: "private",
        createdAt: now,
      };
    case "note":
      return {
        id: recordId,
        kind: "note",
        content: (input.title ? `${input.title}\n` : "") + input.body,
        metadata: { title: input.title, tags: input.tags, source: input.source },
        sensitivity: "private",
        createdAt: now,
      };
    case "doc":
      return {
        id: recordId,
        kind: "doc",
        content: input.title + (input.summary ? `\n${input.summary}` : ""),
        metadata: { title: input.title, url: input.url, mimeType: input.mimeType, tags: input.tags },
        sensitivity: "private",
        createdAt: now,
      };
    case "reminder":
      return {
        id: recordId,
        kind: "reminder",
        content: input.text,
        metadata: { dueAt: input.dueAt, location: input.location, recurring: input.recurring ?? false },
        sensitivity: "private",
        createdAt: now,
      };
    case "signal":
      return {
        id: recordId,
        kind: "signal",
        content: `${input.source}: ${input.event}`,
        metadata: { source: input.source, event: input.event, payload: input.payload, severity: input.severity ?? "info" },
        sensitivity: input.severity === "critical" ? "restricted" : "private",
        createdAt: now,
      };
  }
}
