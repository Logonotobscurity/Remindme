/**
 * Lightweight composer for the Omi shell.
 * Supports chips, manual date/time, and photo attachment.
 * Persists via the existing offline-first helpers.
 */
import { useState } from "react";
import { ImageIcon, Calendar, Clock } from "lucide-react";
import { parseReminder, persistReminders, type Reminder } from "@/lib/remind";

const CHIPS = [
  { label: "Tomorrow morning", value: "tomorrow at 8 AM " },
  { label: "Later today", value: "today at 5 PM " },
  { label: "Next week", value: "next week at 9 AM " },
  { label: "In 1 hour", value: "in 1 hour " },
];

export function Composer({
  reminders,
  scope,
  onSaved,
}: {
  reminders: Reminder[];
  scope: string;
  onSaved: (next: Reminder[]) => void;
}) {
  const [input, setInput] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const addChip = (value: string) => setInput((prev) => (prev + value).trimStart());

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!input.trim() && !photo) return;
    const parsed = parseReminder(input, photo, photo ? "image" : null);
    let time = parsed.time;
    if (manualDate && manualTime) {
      const [y, m, d] = manualDate.split("-").map(Number);
      const [hh, mm] = manualTime.split(":").map(Number);
      const dt = new Date(y, m - 1, d, hh, mm);
      if (!Number.isNaN(dt.getTime())) time = dt.getTime();
    }
    const item: Reminder = {
      id: Date.now(),
      text: parsed.text.trim() || "Reminder",
      photo: parsed.photo,
      mediaKind: parsed.mediaKind,
      time,
      timeLabel: new Date(time).toLocaleString(),
      location: parsed.location || null,
      notified: false,
      completed: false,
      status: time <= Date.now() ? "overdue" : "scheduled",
      created: Date.now(),
      color: "#ffffff",
    };
    const next = [item, ...reminders];
    persistReminders(next, scope);
    onSaved(next);
    setInput("");
    setPhoto(null);
    setManualDate("");
    setManualTime("");
    setShowManual(false);
  };

  return (
    <div className="mb-6 rounded-2xl bg-[#1C1C1E] p-4">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="What should I remind you about?"
        rows={2}
        className="w-full resize-none bg-transparent text-[15px] text-white outline-none placeholder:text-[#8E8E93]"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => addChip(c.value)}
            className="rounded-full bg-[#2C2C2E] px-3 py-1 text-[12px] text-white"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-[#2C2C2E]">
          <ImageIcon className="h-4 w-4" />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={() => setShowManual((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full bg-[#2C2C2E]">
          <Calendar className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={save}
          className="ml-auto rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black"
        >
          Save
        </button>
      </div>

      {showManual && (
        <div className="mt-3 flex gap-2">
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="flex-1 rounded-lg bg-[#2C2C2E] px-3 py-2 text-[13px]" />
          <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="flex-1 rounded-lg bg-[#2C2C2E] px-3 py-2 text-[13px]" />
        </div>
      )}

      {photo && (
        <img src={photo} alt="" className="mt-3 h-24 w-24 rounded-lg object-cover" />
      )}
    </div>
  );
}
