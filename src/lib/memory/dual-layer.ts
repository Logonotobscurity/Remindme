/**
 * Dual-Layer Memory for Re:Mind Me
 *
 * Short-term (working) memory: fast, ephemeral, session/workflow scoped.
 * Long-term (episodic + semantic) memory: durable, queryable, identity-scoped.
 *
 * Retrieval always passes through redaction before any LLM prompt injection.
 */

export type MemoryScope = string; // usually user id or "guest"

export interface MemoryRecord {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  expiresAt?: number;
  sensitivity?: "public" | "private" | "restricted";
}

export interface WorkingMemory {
  /** Upsert a short-lived item. Returns the stored record. */
  put(scope: MemoryScope, record: Omit<MemoryRecord, "createdAt"> & { ttlMs?: number }): Promise<MemoryRecord>;
  /** Get recent items for a scope (sliding window). */
  recent(scope: MemoryScope, limit?: number): Promise<MemoryRecord[]>;
  /** Explicitly remove one item. */
  delete(scope: MemoryScope, id: string): Promise<void>;
  /** Clear all working memory for a scope. */
  clear(scope: MemoryScope): Promise<void>;
}

export interface LongTermMemory {
  /** Persist an episodic or semantic memory. */
  upsert(scope: MemoryScope, record: MemoryRecord): Promise<void>;
  /** Semantic / keyword search over long-term memory. */
  search(scope: MemoryScope, query: string, limit?: number): Promise<MemoryRecord[]>;
  /** Fetch by exact id. */
  get(scope: MemoryScope, id: string): Promise<MemoryRecord | null>;
}

/** Fields that must be redacted before LLM prompt injection. */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "ssn",
  "creditCard",
  "credit_card",
  "phone",
  "email", // treat as sensitive by default; override if needed
]);

export function redactForPrompt(record: MemoryRecord): MemoryRecord {
  if (record.sensitivity === "restricted") {
    return {
      ...record,
      content: "[redacted: restricted]",
      metadata: { redacted: true },
    };
  }

  const cleanMeta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record.metadata)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      cleanMeta[k] = "[redacted]";
    } else {
      cleanMeta[k] = v;
    }
  }

  return { ...record, metadata: cleanMeta };
}

/**
 * LocalStorage-backed working memory.
 * Drop-in compatible with the existing offline-first path in remind.ts.
 * Server-side Redis implementation can replace this later without changing callers.
 */
export class LocalStorageWorkingMemory implements WorkingMemory {
  private prefix = "remindme.wm.";

  private key(scope: MemoryScope, id: string) {
    return `${this.prefix}${encodeURIComponent(scope)}.${id}`;
  }

  private indexKey(scope: MemoryScope) {
    return `${this.prefix}${encodeURIComponent(scope)}.index`;
  }

  async put(
    scope: MemoryScope,
    input: Omit<MemoryRecord, "createdAt"> & { ttlMs?: number },
  ): Promise<MemoryRecord> {
    const now = Date.now();
    const record: MemoryRecord = {
      id: input.id,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      expiresAt: input.ttlMs ? now + input.ttlMs : input.expiresAt,
      sensitivity: input.sensitivity,
    };

    if (typeof window === "undefined") return record;

    localStorage.setItem(this.key(scope, record.id), JSON.stringify(record));

    const index = this.readIndex(scope);
    const next = [record.id, ...index.filter((id) => id !== record.id)].slice(0, 200);
    localStorage.setItem(this.indexKey(scope), JSON.stringify(next));

    return record;
  }

  async recent(scope: MemoryScope, limit = 20): Promise<MemoryRecord[]> {
    if (typeof window === "undefined") return [];
    const index = this.readIndex(scope);
    const items: MemoryRecord[] = [];
    const now = Date.now();

    for (const id of index.slice(0, limit)) {
      const raw = localStorage.getItem(this.key(scope, id));
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw) as MemoryRecord;
        if (rec.expiresAt && rec.expiresAt < now) {
          localStorage.removeItem(this.key(scope, id));
          continue;
        }
        items.push(rec);
      } catch {
        /* skip corrupt */
      }
    }
    return items;
  }

  async delete(scope: MemoryScope, id: string): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.key(scope, id));
    const index = this.readIndex(scope).filter((x) => x !== id);
    localStorage.setItem(this.indexKey(scope), JSON.stringify(index));
  }

  async clear(scope: MemoryScope): Promise<void> {
    if (typeof window === "undefined") return;
    const index = this.readIndex(scope);
    for (const id of index) {
      localStorage.removeItem(this.key(scope, id));
    }
    localStorage.removeItem(this.indexKey(scope));
  }

  private readIndex(scope: MemoryScope): string[] {
    try {
      const raw = localStorage.getItem(this.indexKey(scope));
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}

/** Placeholder long-term memory. Replace with pgvector / Qdrant / Supabase implementation. */
export class NoopLongTermMemory implements LongTermMemory {
  async upsert(_scope: MemoryScope, _record: MemoryRecord): Promise<void> {
    // intentional no-op until vector store is wired
  }
  async search(_scope: MemoryScope, _query: string, _limit = 10): Promise<MemoryRecord[]> {
    return [];
  }
  async get(_scope: MemoryScope, _id: string): Promise<MemoryRecord | null> {
    return null;
  }
}

export const workingMemory: WorkingMemory = new LocalStorageWorkingMemory();
export const longTermMemory: LongTermMemory = new NoopLongTermMemory();

/**
 * High-level retrieval used by agents and briefings.
 * Always redacts before returning content that may enter an LLM prompt.
 */
export async function retrieveForPrompt(
  scope: MemoryScope,
  query: string,
  options: { workingLimit?: number; longTermLimit?: number } = {},
): Promise<MemoryRecord[]> {
  const [working, longTerm] = await Promise.all([
    workingMemory.recent(scope, options.workingLimit ?? 15),
    longTermMemory.search(scope, query, options.longTermLimit ?? 8),
  ]);

  return [...working, ...longTerm].map(redactForPrompt);
}
