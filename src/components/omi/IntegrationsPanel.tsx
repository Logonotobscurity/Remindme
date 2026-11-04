/**
 * Integrations panel for the Omi shell.
 */
import { useEffect, useState } from "react";
import type { Conversation } from "@/lib/conversation";
import {
  collectOpenActions,
  toCsv,
  download,
  loadWebhookUrl,
  saveWebhookUrl,
  pushToWebhook,
} from "@/lib/integrations";

export function IntegrationsPanel({ conversations }: { conversations: Conversation[] }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const items = collectOpenActions(conversations);

  useEffect(() => {
    setUrl(loadWebhookUrl());
  }, []);

  const saveUrl = () => {
    saveWebhookUrl(url);
    setStatus("Webhook URL saved on this device.");
  };

  const exportJson = () => {
    download("remindme-actions.json", JSON.stringify(items, null, 2), "application/json");
    setStatus(`Exported ${items.length} open action${items.length === 1 ? "" : "s"}.`);
  };

  const exportCsv = () => {
    download("remindme-actions.csv", toCsv(items), "text/csv");
    setStatus(`Exported ${items.length} open action${items.length === 1 ? "" : "s"}.`);
  };

  const push = async () => {
    setStatus("Pushing…");
    const result = await pushToWebhook(url, items);
    if (result.ok) setStatus(`Pushed ${items.length} items (HTTP ${result.status}).`);
    else setStatus(result.error ?? `Failed (HTTP ${result.status ?? "?"}).`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#1C1C1E] p-4">
        <div className="mb-1 text-[15px] font-medium text-white">Open actions</div>
        <div className="text-[13px] text-[#8E8E93]">{items.length} ready to export</div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={exportJson} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-black">
            Export JSON
          </button>
          <button type="button" onClick={exportCsv} className="rounded-full bg-[#2C2C2E] px-3 py-1.5 text-[12px] text-white">
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#1C1C1E] p-4">
        <div className="mb-2 text-[15px] font-medium text-white">Webhook</div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.example.com/…"
          className="mb-2 w-full rounded-lg bg-[#2C2C2E] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#8E8E93]"
        />
        <div className="flex gap-2">
          <button type="button" onClick={saveUrl} className="rounded-full bg-[#2C2C2E] px-3 py-1.5 text-[12px] text-white">
            Save URL
          </button>
          <button type="button" onClick={push} disabled={!url.trim() || items.length === 0} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40">
            Push now
          </button>
        </div>
        <div className="mt-2 text-[12px] text-[#636366]">POSTs {"{ source, items }"} as JSON. Stored only on this device.</div>
      </div>

      {status && <div className="text-[13px] text-[#A1A1A6]">{status}</div>}
    </div>
  );
}
