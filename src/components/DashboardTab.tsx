import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  MapPin,
  NotebookPen,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type DashboardItem = {
  id: number;
  title: string;
  summary: string;
  source: string;
  category: string;
  status: "recorded" | "pending" | "completed";
  time: string;
  location?: string;
};

type ActivityRecord = {
  id?: number;
  source?: string | null;
  project_name?: string | null;
  category?: string | null;
  title?: string | null;
  summary?: string | null;
  activity_type?: string | null;
  completion_status?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
};

type ActionItemRecord = {
  id?: number;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  due_at?: string | null;
  created_at?: string | null;
};

type ReminderRecord = {
  id?: number;
  title?: string | null;
  due_at?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const fallbackDashboard: DashboardItem[] = [
  {
    id: 1,
    title: "LOG_ON architecture review",
    summary: "Reviewed the daily capture and central memory design for the Re:Mind Me system.",
    source: "Claude",
    category: "Engineering",
    status: "recorded",
    time: "Today • 10:18 AM",
    location: "LOG_ON",
  },
  {
    id: 2,
    title: "Reminder system design",
    summary: "Defined the source-of-truth activity model and API contract for reminders and daily summaries.",
    source: "Grok",
    category: "Planning",
    status: "pending",
    time: "Today • 2:42 PM",
    location: "Re:Mind Me",
  },
  {
    id: 3,
    title: "Daily compiler milestone",
    summary: "Outlined the compiler, dedupe rules, and the distinction between activities, action items, and reminders.",
    source: "PWA",
    category: "Product",
    status: "completed",
    time: "Today • 6:05 PM",
    location: "Dashboard",
  },
];

const tabs = [
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
] as const;

function formatDisplayTime(value?: string | null) {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today • ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} • ${time}`;
}

function toDashboardItemFromActivity(record: ActivityRecord, index: number): DashboardItem {
  const status = record.completion_status === "completed"
    ? "completed"
    : record.completion_status === "in_progress" || record.completion_status === "pending"
      ? "pending"
      : "recorded";

  return {
    id: record.id ?? index + 1,
    title: record.title ?? "Untitled activity",
    summary:
      record.summary ??
      `Captured from ${record.source ?? "system"}${record.project_name ? ` in ${record.project_name}` : ""}.`,
    source: (record.source ?? "system").toString().charAt(0).toUpperCase() + (record.source ?? "system").toString().slice(1),
    category: record.category ?? record.activity_type ?? "General",
    status,
    time: formatDisplayTime(record.occurred_at ?? record.created_at),
    location: record.project_name ?? undefined,
  };
}

function toDashboardItemFromAction(record: ActionItemRecord, index: number): DashboardItem {
  return {
    id: record.id ?? index + 1000,
    title: record.title ?? "Action item",
    summary: record.summary ?? "Pending follow-up from the current activity log.",
    source: "Action",
    category: "Task",
    status: record.status === "completed" ? "completed" : "pending",
    time: formatDisplayTime(record.due_at ?? record.created_at),
    location: undefined,
  };
}

function toDashboardItemFromReminder(record: ReminderRecord, index: number): DashboardItem {
  return {
    id: record.id ?? index + 2000,
    title: record.title ?? "Reminder",
    summary: "Scheduled reminder due from the central activity system.",
    source: "Reminder",
    category: "Follow-up",
    status: record.status === "completed" ? "completed" : "pending",
    time: formatDisplayTime(record.due_at ?? record.created_at),
    location: undefined,
  };
}

function buildDashboardData(
  activities: ActivityRecord[] = [],
  actions: ActionItemRecord[] = [],
  reminders: ReminderRecord[] = [],
): DashboardItem[] {
  const items = [
    ...activities.map((record, index) => toDashboardItemFromActivity(record, index)),
    ...actions.map((record, index) => toDashboardItemFromAction(record, index)),
    ...reminders.map((record, index) => toDashboardItemFromReminder(record, index)),
  ];

  return items.slice(0, 10);
}

export function DashboardTab() {
  const [activeTab, setActiveTab] = useState<"reminders" | "dashboard">("dashboard");
  const [items, setItems] = useState<DashboardItem[]>(fallbackDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [activityRes, actionRes, reminderRes] = await Promise.all([
          fetch(`/api/v1/activity?date=${today}&limit=10`),
          fetch(`/api/v1/action-items?status=pending`),
          fetch(`/api/v1/reminders?due_date=${today}`),
        ]);

        if (!activityRes.ok || !actionRes.ok || !reminderRes.ok) {
          throw new Error("Dashboard API unavailable");
        }

        const [activityJson, actionJson, reminderJson] = await Promise.all([
          activityRes.json(),
          actionRes.json(),
          reminderRes.json(),
        ]);

        const activityRows = Array.isArray(activityJson) ? activityJson : activityJson?.rows ?? [];
        const actionRows = Array.isArray(actionJson) ? actionJson : actionJson?.rows ?? [];
        const reminderRows = Array.isArray(reminderJson) ? reminderJson : reminderJson?.rows ?? [];

        if (!ignore) {
          setItems(buildDashboardData(activityRows, actionRows, reminderRows));
          setError(null);
        }
      } catch {
        if (!ignore) {
          setItems(fallbackDashboard);
          setError("Using the saved example view until the activity API is live.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      completed: items.filter((item) => item.status === "completed").length,
      today: items.filter((item) => item.time.includes("Today")).length,
    }),
    [items],
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-6">
        <header className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Re:Mind Me</p>
              <h1 className="mt-1 text-2xl font-bold">Memory dashboard</h1>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as "reminders" | "dashboard")}
                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  activeTab === id ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        ) : null}

        {activeTab === "dashboard" ? (
          <main className="mt-5 space-y-5">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Total</p>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  <span className="text-2xl font-bold">{loading ? "…" : stats.total}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pending</p>
                <div className="mt-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold">{loading ? "…" : stats.pending}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Completed</p>
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-2xl font-bold">{loading ? "…" : stats.completed}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Today</p>
                <div className="mt-3 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-sky-500" />
                  <span className="text-2xl font-bold">{loading ? "…" : stats.today}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Timeline</p>
                  <h2 className="text-lg font-bold">Today’s activity</h2>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-full bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.source}</p>
                        <h3 className="mt-1 text-sm font-semibold text-slate-800">{item.title}</h3>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{item.summary}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="rounded-full bg-white px-2 py-1">{item.category}</span>
                      <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {item.time}</span>
                      {item.location ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.location}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        ) : (
          <main className="mt-5 space-y-5">
            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Notes</p>
                  <h2 className="text-lg font-bold">Reminders summary</h2>
                </div>
                <NotebookPen className="h-5 w-5 text-violet-600" />
              </div>

              <div className="space-y-3">
                {items
                  .filter((item) => item.status !== "completed")
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                    </div>
                  ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Next</p>
                  <h2 className="text-lg font-bold">Suggested next step</h2>
                </div>
                <ArrowRight className="h-5 w-5 text-violet-600" />
              </div>
              <p className="text-sm text-slate-600">
                {items[0]
                  ? `Review ${items[0].title.toLowerCase()} and confirm the next action before the next compile cycle.`
                  : "Create the daily compiler job that groups captured records into summaries, pending tasks, and approved reminders."}
              </p>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
