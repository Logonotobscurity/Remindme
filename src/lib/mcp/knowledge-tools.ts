/**
 * MCP tool helpers for the knowledge graph.
 * Redis-backed when REDIS_URL is set; in-memory fallback otherwise.
 */

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
};

export type KnowledgeToolNode = {
  id: string;
  text: string;
  type: string;
  created: number;
};

const PREFIX = "remindme:kg:";
const memory = new Map<string, KnowledgeToolNode[]>();

let redis: RedisLike | null = null;
function getRedis(): RedisLike | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    redis = new Redis(url);
    return redis;
  } catch {
    return null;
  }
}

async function list(userId: string): Promise<KnowledgeToolNode[]> {
  const r = getRedis();
  if (r) {
    const raw = await r.get(PREFIX + userId);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as KnowledgeToolNode[];
    } catch {
      return [];
    }
  }
  return memory.get(userId) ?? [];
}

async function save(userId: string, items: KnowledgeToolNode[]) {
  const r = getRedis();
  if (r) {
    await r.set(PREFIX + userId, JSON.stringify(items.slice(0, 500)));
    return;
  }
  memory.set(userId, items);
}

export async function knowledgeStore(userId: string, text: string, type?: string): Promise<KnowledgeToolNode> {
  const node: KnowledgeToolNode = {
    id: Date.now().toString(36),
    text: text.trim(),
    type: type ?? "fact",
    created: Date.now(),
  };
  const existing = await list(userId);
  await save(userId, [node, ...existing]);
  return node;
}

export async function knowledgeSearch(userId: string, query: string, limit = 10): Promise<KnowledgeToolNode[]> {
  const q = query.toLowerCase();
  const items = await list(userId);
  return items
    .filter((n) => n.text.toLowerCase().includes(q) || n.type.toLowerCase().includes(q))
    .slice(0, limit);
}

export async function knowledgeList(userId: string, limit = 20): Promise<KnowledgeToolNode[]> {
  const items = await list(userId);
  return items.slice(0, limit);
}
