/**
 * Additional sections for the Omi shell: Save, Graveyard, Dashboard.
 * Pure presentational. Data is passed in.
 */
import type { Reminder, SaveItem } from "@/lib/remind";

export function SaveList({ items }: { items: SaveItem[] }) {
  if (items.length === 0) {
    return <Empty title="No saves yet" body="Saved notes and links will appear here." />;
  }
  return (
    <div className="space-y-2">
      {items.map((s) => (
        <div key={s.id} className="rounded-2xl bg-[#1C1C1E] p-4">
          <div className="text-[15px] text-white">{s.text}</div>
          <div className="mt-1 text-[12px] text-[#8E8E93]">{new Date(s.created).toLocaleDateString()}</div>
        </div>
      ))}
    </div>
  );
}

export function GraveyardList({ items }: { items: Reminder[] }) {
  const archived = items.filter((r) => r.status === "archived" || r.completed);
  if (archived.length === 0) {
    return <Empty title="Nothing archived" body="Completed or parked reminders land here." />;
  }
  return (
    <div className="space-y-2">
      {archived.map((r) => (
        <div key={r.id} className="rounded-2xl bg-[#1C1C1E] p-4 opacity-70">
          <div className="text-[15px] text-white line-through">{r.text}</div>
          <div className="mt-1 text-[12px] text-[#8E8E93]">{r.timeLabel}</div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSummary({
  reminders,
  saves,
}: {
  reminders: Reminder[];
  saves: SaveItem[];
}) {
  const active = reminders.filter((r) => !r.completed && r.status !== "archived").length;
  const overdue = reminders.filter((r) => r.status === "overdue" && !r.completed).length;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat n={active} label="Active" />
      <Stat n={overdue} label="Overdue" />
      <Stat n={saves.length} label="Saves" />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-[#1C1C1E] p-4 text-center">
      <div className="text-2xl font-semibold text-white">{n}</div>
      <div className="mt-1 text-[12px] text-[#8E8E93]">{label}</div>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-[#1C1C1E] px-4 py-5">
      <div className="text-[15px] font-medium text-white">{title}</div>
      <div className="mt-1 text-[13px] text-[#8E8E93]">{body}</div>
    </div>
  );
}
