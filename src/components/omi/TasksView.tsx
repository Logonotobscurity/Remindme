import { useState } from "react";
import { ChevronUp, Plus, Search } from "lucide-react";

type Task = {
  id: string;
  body: string;
  done?: boolean;
};

export function TasksView({
  tasks,
  overdueCount,
  onAdd,
  onToggle,
}: {
  tasks: Task[];
  overdueCount: number;
  onAdd?: () => void;
  onToggle?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);

  const filtered = tasks.filter((t) =>
    t.body.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative pb-24">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#1C1C1E] px-4">
          <Search className="h-4 w-4 text-[#8E8E93]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks"
            className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#8E8E93]"
          />
        </div>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-[#1C1C1E] text-white">
          …
        </button>
      </div>

      {overdueCount > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mb-3 flex items-center gap-2 text-[15px] text-[#8E8E93]"
        >
          <ChevronUp className={`h-4 w-4 transition ${open ? "" : "rotate-180"}`} />
          Overdue {overdueCount}
        </button>
      )}

      {open && (
        <div className="space-y-4">
          {filtered.map((t) => (
            <label key={t.id} className="flex gap-3">
              <input
                type="checkbox"
                checked={!!t.done}
                onChange={() => onToggle?.(t.id)}
                className="mt-1 h-5 w-5 rounded-full border border-[#8E8E93] bg-transparent"
              />
              <span className="flex-1 text-[15px] leading-relaxed text-white">{t.body}</span>
            </label>
          ))}
        </div>
      )}

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-lg"
          aria-label="Add task"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
