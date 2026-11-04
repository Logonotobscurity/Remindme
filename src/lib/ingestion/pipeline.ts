/**
 * Ingestion pipeline — normalizes typed input and writes into dual-layer memory.
 */

import type { IngestionInput } from "./schemas";
import { normalize } from "./schemas";
import { serverMemory } from "@/lib/memory/server";

export async function ingest(scope: string, input: IngestionInput) {
  const normalized = normalize(input);

  // Reuse the existing activity recording path for now (maps cleanly)
  await serverMemory.recordActivity(
    scope,
    {
      title: normalized.content.slice(0, 240),
      summary: normalized.content,
      category: normalized.kind,
      source: "ingestion",
      activityType: normalized.kind === "reminder" ? "reminder" : "note",
      privacyLevel: normalized.sensitivity === "restricted" ? "internal" : "private",
    },
    normalized.id,
  );

  return normalized;
}
