/**
 * Lightweight integrations for the Omi shell.
 * Export open action items, or POST them to a user-configured webhook.
 */
import type { Conversation } from "./conversation";

export type ExportItem = {
  text: string;
  dueHint?: string;
  conversationTitle: string;
  conversationId: string;
  created: number;
};

export function collectOpenActions(conversations: Conversation[]): ExportItem[] {
  const out: ExportItem[] = [];
  for (const c of conversations) {
    for (const a of c.actionItems) {
      if (a.done) continue;
      out.push({
        text: a.text,
        dueHint: a.dueHint,
        conversationTitle: c.title,
        conversationId: c.id,
        created: c.created,
      });
    }
  }
  return out;
}

export function toCsv(items: ExportItem[]): string {
  const header = ["text", "dueHint", "conversationTitle", "conversationId", "created"];
  const rows = items.map((i) => [
    csvEscape(i.text),
    csvEscape(i.dueHint ?? ""),
    csvEscape(i.conversationTitle),
    i.conversationId,
    new Date(i.created).toISOString(),
  ].join(","));
  return [header.join(","), ...rows].join("\n");
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

export function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const WEBHOOK_KEY = "remindme.webhookUrl";

export function loadWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(WEBHOOK_KEY) ?? "";
}

export function saveWebhookUrl(url: string) {
  if (typeof window === "undefined") return;
  if (url.trim()) localStorage.setItem(WEBHOOK_KEY, url.trim());
  else localStorage.removeItem(WEBHOOK_KEY);
}

export async function pushToWebhook(url: string, items: ExportItem[]): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!url.trim()) return { ok: false, error: "No webhook URL" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "remindme", items }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
