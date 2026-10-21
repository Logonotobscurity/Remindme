import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, Check, Clock3, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";

type ReminderItem = {
  id: number;
  text: string;
  note?: string;
  dueAt: string;
  completed: boolean;
  createdAt: number;
};

type SavedItem = {
  id: number;
  text: string;
  createdAt: number;
};

const STORAGE_KEYS = {
  reminders: "english-reminders",
  saves: "english-saves",
};

const QUICK_ACTIONS = [
  { label: "Tomorrow morning", value: "tomorrow 8:00 AM" },
  { label: "This afternoon", value: "today 5:00 PM" },
  { label: "Next week", value: "next week 9:00 AM" },
  { label: "In 1 hour", value: "in 1 hour" },
];

function formatDueLabel(value: string) {
  const now = new Date();
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (sameDay) return `Today at ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${time}`;
}

function parseDueInput(raw: string) {
  const input = raw.trim();
  if (!input) return new Date().toISOString();

  const lowered = input.toLowerCase();
  const now = new Date();

  if (lowered.includes("in 1 hour")) {
    const d = new Date(now.getTime() + 60 * 60 * 1000);
    return d.toISOString();
  }

  if (lowered.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  }

  if (lowered.includes("today")) {
    const d = new Date(now);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  }

  if (lowered.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

export function EnglishReminderApp() {
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const storedReminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.reminders) ?? "[]") as ReminderItem[];
      const storedSaves = JSON.parse(localStorage.getItem(STORAGE_KEYS.saves) ?? "[]") as SavedItem[];
      setReminders(storedReminders);
      setSaved(storedSaves);
    } catch {
      setReminders([]);
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.saves, JSON.stringify(saved));
  }, [saved]);

  const filteredReminders = useMemo(
    () =>
      reminders.filter((item) =>
        item.text.toLowerCase().includes(search.toLowerCase()) || item.note?.toLowerCase().includes(search.toLowerCase()),
      ),
    [reminders, search],
  );

  const filteredSaved = useMemo(
    () => saved.filter((item) => item.text.toLowerCase().includes(search.toLowerCase())),
    [saved, search],
  );

  const addReminder = () => {
    const text = input.trim();
    if (!text) return;

    const item: ReminderItem = {
      id: Date.now(),
      text,
      note: note.trim() || undefined,
      dueAt: parseDueInput(note.trim() ? `${text} ${note}` : text),
      completed: false,
      createdAt: Date.now(),
    };

    setReminders((current) => [item, ...current]);
    setInput("");
    setNote("");
  };

  const addSaved = () => {
    const text = input.trim();
    if (!text) return;

    setSaved((current) => [{ id: Date.now(), text, createdAt: Date.now() }, ...current]);
    setInput("");
    setNote("");
  };

  const toggleReminder = (id: number) => {
    setReminders((current) => current.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const removeReminder = (id: number) => {
    setReminders((current) => current.filter((item) => item.id !== id));
  };

  const removeSaved = (id: number) => {
    setSaved((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-6">
        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Re:Mind Me</p>
                <h1 className="text-xl font-bold">Daily Memory</h1>
              </div>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Quick search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find reminders or saved notes"
              className="mt-2 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </header>

        <main className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Capture</p>
                <h2 className="text-lg font-bold">Create a reminder</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Bell className="h-4 w-4" />
              </div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="Call the client about the onboarding plan"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400"
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note or timing: tomorrow 8:00 AM"
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => setNote(action.value)}
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700"
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={addReminder}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 font-semibold text-white shadow-lg shadow-violet-500/20"
              >
                <Plus className="h-4 w-4" />
                Add reminder
              </button>
              <button
                type="button"
                onClick={addSaved}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold text-slate-700"
              >
                <Save className="h-4 w-4" />
                Save note
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Queue</p>
                <h2 className="text-lg font-bold">Reminders</h2>
              </div>
              <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                {reminders.length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredReminders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  No reminders match your current search.
                </div>
              ) : (
                filteredReminders.map((item) => (
                  <div key={item.id} className={`rounded-2xl border p-3 ${item.completed ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleReminder(item.id)}
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${item.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"}`}
                      >
                        {item.completed ? <Check className="h-3 w-3" /> : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${item.completed ? "text-emerald-700 line-through" : "text-slate-800"}`}>
                          {item.text}
                        </p>
                        {item.note && <p className="mt-1 text-xs text-slate-500">{item.note}</p>}
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDueLabel(item.dueAt)}
                        </div>
                      </div>

                      <button type="button" onClick={() => removeReminder(item.id)} className="text-slate-400 transition hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Library</p>
                <h2 className="text-lg font-bold">Saved notes</h2>
              </div>
              <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                {saved.length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredSaved.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Nothing saved yet.
                </div>
              ) : (
                filteredSaved.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{item.text}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeSaved(item.id)} className="ml-3 text-slate-400 transition hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
