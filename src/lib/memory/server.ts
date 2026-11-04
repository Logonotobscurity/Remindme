/**
 * Server-side dual-layer memory service.
 *
 * Working memory: Redis when REDIS_URL is set, otherwise in-memory.
 * Long-term: process-local for now (swap for pgvector later).
 */

import type { MemoryRecord, MemoryScope } from "./dual-layer";
import { redactForPrompt } from "./dual-layer";
import { serverWorkingMemory } from "./redis-working";

interface ActivityInput {
  title: string;
  summary?: string;
  category?: string;
  source?: string;
  activityType?: string;
  privacyLevel?: string;
  occurredAt?: string;
}

const longTerm = new Map<string, MemoryRecord[]>();

function scopeKey(scope: MemoryScope) {
  return scope || "guest";
}

export const serverMemory = {
  /** Record an activity into working memory (and optionally long-term). */
  async recordActivity(scope: MemoryScope, activity: ActivityInput, activityId: string | number) {
    const key = scopeKey(scope);
    const now = Date.now();
    const record: MemoryRecord = {
      id: `act:${activityId}`,
      content: activity.title + (activity.summary ? `\n${activity.summary}` : ""),
      metadata: {
        type: "activity",
        category: activity.category,
        source: activity.source,
        activityType: activity.activityType,
        privacyLevel: activity.privacyLevel ?? "private",
      },
      createdAt: now,
      expiresAt: now + 1000 * 60 * 60 * 24 * 7, // 7-day working window
      sensitivity: activity.privacyLevel === "public" ? "public" : "private",
    };

    await serverWorkingMemory.put(key, { ...record, ttlMs: 1000 * 60 * 60 * 24 * 7 });

    // Also keep a copy in long-term for now (will move to vector store)
    const lt = longTerm.get(key) ?? [];
    longTerm.set(key, [record, ...lt].slice(0, 2000));
  },

  /** Retrieve redacted memories suitable for LLM prompts. */
  async retrieveForPrompt(scope: MemoryScope, _query: string, limit = 20): Promise<MemoryRecord[]> {
    const key = scopeKey(scope);
    const recent = await serverWorkingMemory.recent(key, limit);
    return recent.map(redactForPrompt);
  },

  /** Debug / admin view (still redacted). */
  async recent(scope: MemoryScope, limit = 30): Promise<MemoryRecord[]> {
    return this.retrieveForPrompt(scope, "", limit);
  },
};
