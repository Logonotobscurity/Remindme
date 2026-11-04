/**
 * Maps existing Re:Mind Me data into the shapes expected by the Omi components.
 * No changes to MindOrb or the core RemindApp state machine.
 */

type ReminderLike = {
  id: number | string;
  text: string;
  time?: number;
  timeLabel?: string;
  status?: string;
  completed?: boolean;
  created?: number;
};

type SaveLike = {
  id: number | string;
  text: string;
  created?: number;
};

export function toRecaps(reminders: ReminderLike[], limit = 6) {
  return reminders.slice(0, limit).map((r) => ({
    id: String(r.id),
    dateLabel: r.time ? new Date(r.time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "",
    title: r.text.slice(0, 80),
    preview: r.timeLabel,
  }));
}

export function toSessionGroups(reminders: ReminderLike[]) {
  const groups = new Map<string, { dateLabel: string; items: { id: string; title: string; meta: string }[] }>();
  for (const r of reminders) {
    const d = r.time ? new Date(r.time) : new Date(r.created ?? Date.now());
    const key = d.toDateString();
    const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (!groups.has(key)) groups.set(key, { dateLabel: label, items: [] });
    groups.get(key)!.items.push({
      id: String(r.id),
      title: r.text,
      meta: r.timeLabel ?? "",
    });
  }
  return Array.from(groups.values());
}

export function toTasks(reminders: ReminderLike[]) {
  return reminders.map((r) => ({
    id: String(r.id),
    body: r.text,
    done: !!r.completed || r.status === "archived",
  }));
}

export function overdueCount(reminders: ReminderLike[]) {
  return reminders.filter((r) => r.status === "overdue" && !r.completed).length;
}
