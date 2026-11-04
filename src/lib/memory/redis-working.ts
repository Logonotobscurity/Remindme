/**
 * Redis-backed WorkingMemory.
 *
 * Uses a simple list + hash pattern so it stays compatible with any ioredis / upstash client.
 * Set REDIS_URL (or UPSTASH_REDIS_REST_URL + token) to enable.
 * Falls back to in-memory Map when Redis is not configured.
 */

import type { MemoryRecord, WorkingMemory, MemoryScope } from "./dual-layer";

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: string[]): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  lrem(key: string, count: number, value: string): Promise<number>;
};

class InMemoryWorkingMemory implements WorkingMemory {
  private store = new Map<string, MemoryRecord[]>();

  async put(scope: MemoryScope, input: Omit<MemoryRecord, "createdAt"> & { ttlMs?: number }): Promise<MemoryRecord> {
    const now = Date.now();
    const record: MemoryRecord = {
      id: input.id,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      expiresAt: input.ttlMs ? now + input.ttlMs : input.expiresAt,
      sensitivity: input.sensitivity,
    };
    const list = this.store.get(scope) ?? [];
    const next = [record, ...list.filter((r) => r.id !== record.id)].slice(0, 200);
    this.store.set(scope, next);
    return record;
  }

  async recent(scope: MemoryScope, limit = 20): Promise<MemoryRecord[]> {
    const now = Date.now();
    const list = (this.store.get(scope) ?? []).filter((r) => !r.expiresAt || r.expiresAt > now);
    return list.slice(0, limit);
  }

  async delete(scope: MemoryScope, id: string): Promise<void> {
    const list = (this.store.get(scope) ?? []).filter((r) => r.id !== id);
    this.store.set(scope, list);
  }

  async clear(scope: MemoryScope): Promise<void> {
    this.store.delete(scope);
  }
}

export class RedisWorkingMemory implements WorkingMemory {
  constructor(private redis: RedisLike, private prefix = "remindme:wm:") {}

  private indexKey(scope: MemoryScope) {
    return `${this.prefix}${scope}:index`;
  }
  private itemKey(scope: MemoryScope, id: string) {
    return `${this.prefix}${scope}:${id}`;
  }

  async put(scope: MemoryScope, input: Omit<MemoryRecord, "createdAt"> & { ttlMs?: number }): Promise<MemoryRecord> {
    const now = Date.now();
    const record: MemoryRecord = {
      id: input.id,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      expiresAt: input.ttlMs ? now + input.ttlMs : input.expiresAt,
      sensitivity: input.sensitivity,
    };

    const ttlSeconds = input.ttlMs ? Math.ceil(input.ttlMs / 1000) : undefined;
    const payload = JSON.stringify(record);

    if (ttlSeconds) {
      await this.redis.set(this.itemKey(scope, record.id), payload, "EX", String(ttlSeconds));
    } else {
      await this.redis.set(this.itemKey(scope, record.id), payload);
    }

    await this.redis.lrem(this.indexKey(scope), 0, record.id);
    await this.redis.lpush(this.indexKey(scope), record.id);
    return record;
  }

  async recent(scope: MemoryScope, limit = 20): Promise<MemoryRecord[]> {
    const ids = await this.redis.lrange(this.indexKey(scope), 0, limit - 1);
    const now = Date.now();
    const items: MemoryRecord[] = [];

    for (const id of ids) {
      const raw = await this.redis.get(this.itemKey(scope, id));
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw) as MemoryRecord;
        if (rec.expiresAt && rec.expiresAt < now) {
          await this.redis.del(this.itemKey(scope, id));
          continue;
        }
        items.push(rec);
      } catch {
        /* skip */
      }
    }
    return items;
  }

  async delete(scope: MemoryScope, id: string): Promise<void> {
    await this.redis.del(this.itemKey(scope, id));
    await this.redis.lrem(this.indexKey(scope), 0, id);
  }

  async clear(scope: MemoryScope): Promise<void> {
    const ids = await this.redis.lrange(this.indexKey(scope), 0, -1);
    if (ids.length) {
      await this.redis.del(...ids.map((id) => this.itemKey(scope, id)));
    }
    await this.redis.del(this.indexKey(scope));
  }
}

/** Factory: returns Redis implementation when REDIS_URL is present, otherwise in-memory. */
export function createWorkingMemory(): WorkingMemory {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) {
    return new InMemoryWorkingMemory();
  }

  // Lazy require so the package is optional
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    const client = new Redis(url);
    return new RedisWorkingMemory(client);
  } catch {
    console.warn("[memory] REDIS_URL set but ioredis not installed — falling back to in-memory");
    return new InMemoryWorkingMemory();
  }
}

export const serverWorkingMemory: WorkingMemory = createWorkingMemory();
