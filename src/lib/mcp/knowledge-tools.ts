/**
 * MCP tool helpers for the knowledge graph.
 * These run on the server and use the same shapes as the client store.
 * For now they operate on a per-user JSON blob passed in; wire to Redis later.
 */

export type KnowledgeToolNode = {
  id: string;
  text: string;
  type: string;
  created: number;
};

const memory = new Map<string, KnowledgeToolNode[]>();

function list(userId: string): KnowledgeToolNode[] {
  return memory.get(userId) ?? [];
}
function save(userId: string, items: KnowledgeToolNode[]) {
  memory.set(userId, items);
}

export function knowledgeStore(userId: string, text: string, type?: string): KnowledgeToolNode {
  const node: KnowledgeToolNode = {
    id: Date.now().toString(36),
    text: text.trim(),
    type: type ?? "fact",
    created: Date.now(),
  };
  save(userId, [node, ...list(userId)]);
  return node;
}

export function knowledgeSearch(userId: string, query: string, limit = 10): KnowledgeToolNode[] {
  const q = query.toLowerCase();
  return list(userId)
    .filter((n) => n.text.toLowerCase().includes(q) || n.type.toLowerCase().includes(q))
    .slice(0, limit);
}

export function knowledgeList(userId: string, limit = 20): KnowledgeToolNode[] {
  return list(userId).slice(0, limit);
}
