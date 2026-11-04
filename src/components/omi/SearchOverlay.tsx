/**
 * Working search overlay for the Omi shell.
 */
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Reminder, SaveItem } from "@/lib/remind";

export function SearchOverlay({
  open,
  onClose,
  reminders,
  saves,
  onOpenReminder,
  onOpenSave,
}: {
  open: boolean;
  onClose: () => void;
  reminders: Reminder[];
  saves: SaveItem[];
  onOpenReminder?: (id: number) => void;
  onOpenSave?: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const matchedReminders = useMemo(
    () => (query ? reminders.filter((r) => r.text.toLowerCase().includes(query)) : []),
    [reminders, query],
  );
  const matchedSaves = useMemo(
    () => (query ? saves.filter((s) => s.text.toLowerCase().includes(query)) : []),
    [saves, query],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div className="mx-auto mt-12 max-w-md rounded-2xl bg-[#1C1C1E] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reminders and saves"
            className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#8E8E93]"
          />
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#2C2C2E]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {query && matchedReminders.length === 0 && matchedSaves.length === 0 && (
          <div className="py-6 text-center text-[13px] text-[#8E8E93]">No matches</div>
        )}

        {matchedReminders.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[12px] uppercase tracking-wide text-[#8E8E93]">Reminders</div>
            {matchedReminders.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onOpenReminder?.(r.id); onClose(); }}
                className="block w-full rounded-lg px-2 py-2 text-left text-[14px] text-white hover:bg-[#2C2C2E]"
              >
                {r.text}
              </button>
            ))}
          </div>
        )}

        {matchedSaves.length > 0 && (
          <div>
            <div className="mb-1 text-[12px] uppercase tracking-wide text-[#8E8E93]">Saves</div>
            {matchedSaves.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onOpenSave?.(s.id); onClose(); }}
                className="block w-full rounded-lg px-2 py-2 text-left text-[14px] text-white hover:bg-[#2C2C2E]"
              >
                {s.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
