import { useCallback, useEffect, useMemo, useState } from "react";
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
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { activityApiFetch } from "@/lib/activity/api-client";

type DashboardItem = {
  id: number;
  title: string;
  summary: string;
  source: string;
  category: string;
  status: "recorded" | "pending" | "completed";
  time: string;
  location?: string;
  sortAt: string;
};

type ActivitySource = "claude" | "grok" | "chatgpt" | "pwa" | "log_on" | "voice" | "manual" | "system";
type ActivityType = "research" | "engineering" | "decision" | "idea" | "meeting" | "note" | "reminder" | "journal" | "sync" | "other";
type ActivityStatus = "recorded" | "in_progress" | "completed" | "archived";

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
  notified?: boolean | null;
};

type ActivityFormState = {
  title: string;
  summary: string;
  project: string;
  category: string;
  source: ActivitySource;
  activityType: ActivityType;
  completionStatus: ActivityStatus;
};

const tabs = [
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
] as const;

const emptyForm: ActivityFormState = {
  title: "",
  summary: "",
  project: "",
  category: "",
  source: "manual",
  activityType: "note",
  completionStatus: "recorded",
};

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
  const status =
    record.completion_status === "completed"
      ? "completed"
      : record.completion_status === "in_progress" || record.completion_status === "pending"
        ? "pending"
        : "recorded";

  const source = (record.source ?? "system").toString();

  return {
    id: record.id ?? index + 1,
    title: record.title ?? "Untitled activity",
    summary:
      record.summary ??
      `Captured from ${source}${record.project_name ? ` in ${record.project_name}` : ""}.`,
    source: source.charAt(0).toUpperCase() + source.slice(1),
    category: record.category ?? record.activity_type ?? "General",
    status,
    time: formatDisplayTime(record.occurred_at ?? record.created_at),
    location: record.project_name ?? undefined,
    sortAt: record.occurred_at ?? record.created_at ?? "",
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
    sortAt: record.due_at ?? record.created_at ?? "",
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
    sortAt: record.due_at ?? record.created_at ?? "",
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

  return items
    .sort((left, right) => (Date.parse(right.sortAt) || 0) - (Date.parse(left.sortAt) || 0))
    .slice(0, 10);
}

function readRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as { rows?: unknown[] }).rows)) {
    return (payload as { rows: unknown[] }).rows;
  }
  return [];
}

export function DashboardTab() {
  const { user, isPending: authPending } = useCurrentUserState();
  const [activeTab, setActiveTab] = useState<"reminders" | "dashboard">("dashboard");
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<ActivityFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [activityRes, actionRes, reminderRes] = await Promise.all([
        activityApiFetch("/api/v1/activity?limit=20"),
        activityApiFetch("/api/v1/action-items?status=pending"),
        activityApiFetch("/api/v1/reminders?due_date=" + today),
      ]);

      if ([activityRes, actionRes, reminderRes].some((response) => response.status === 401)) {
        throw new Error("AUTH_REQUIRED");
      }
      if ([activityRes, actionRes, reminderRes].some((response) => !response.ok)) {
        throw new Error("Dashboard API unavailable");
      }

      const [activityJson, actionJson, reminderJson] = await Promise.all([
        activityRes.json(),
        actionRes.json(),
        reminderRes.json(),
      ]);

      const activityRows = readRows(activityJson) as ActivityRecord[];
      const actionRows = readRows(actionJson) as ActionItemRecord[];
      const reminderRows = readRows(reminderJson) as ReminderRecord[];

      setReminders(reminderRows);
      setItems(buildDashboardData(activityRows, actionRows, reminderRows));
      setLoadError(false);
      setNotice(null);
    } catch (error) {
      setReminders([]);
      setItems([]);
      setLoadError(true);
      setNotice(
        error instanceof Error && error.message === "AUTH_REQUIRED"
          ? "Your session has expired. Sign in again to load your private activity."
          : "The live activity feed is unavailable. Please try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authPending) {
      setLoading(true);
      return;
    }
    if (!user) {
      setReminders([]);
      setItems([]);
      setLoadError(false);
      setLoading(false);
      return;
    }
    void loadDashboard();
  }, [authPending, user?.id, loadDashboard]);

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      completed: items.filter((item) => item.status === "completed").length,
      today: items.filter((item) => item.time.includes("Today")).length,
    }),
    [items],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setNotice("Add a title before saving the activity.");
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const payload = {
        source: form.source,
        project: form.project.trim() || undefined,
        category: form.category.trim() || undefined,
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        activityType: form.activityType,
        completionStatus: form.completionStatus,
        captureMethod: "manual",
        occurredAt: new Date().toISOString(),
      };

      const response = await activityApiFetch("/api/v1/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ? JSON.stringify(errorBody.error) : "Activity save failed");
      }

      setForm(emptyForm);
      await loadDashboard();
      setNotice("Activity saved to the live API.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save activity right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authPending) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-slate-100 px-4 text-slate-600">
        <p role="status" className="rounded-2xl bg-white px-5 py-4 shadow-sm">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-slate-100 px-4 py-8 text-slate-900">
        <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Re:Mind Me</p>
          <h2 className="mt-2 text-xl font-bold">Sign in to see your private activity</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your activity timeline, action items, and server-saved reminders are tied to your account.
            Sign in to view and add records securely.
          </p>
          <a href="/login" className="mt-5 inline-flex rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700">
            Sign in to continue
          </a>
        </section>
      </main>
    );
  }

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

          <div className="mt-3 flex justify-end"><UserButton /></div>

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

        {notice ? (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
            {notice}
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
                  <h2 className="text-lg font-bold">Recent activity</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("reminders")}
                  className="flex items-center gap-2 rounded-full bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Loading today’s activity…
                  </div>
                ) : loadError ? (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Live activity could not be loaded. Check the activity API connection and try again.
                  </div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No activity recorded yet. Add your first entry to start building your daily memory.
                  </div>
                ) : (
                  items.map((item) => (
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
                  ))
                )}
              </div>
            </section>
          </main>
        ) : (
          <main className="mt-5 space-y-5">
            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Data</p>
                  <h2 className="text-lg font-bold">Live reminders</h2>
                </div>
                <NotebookPen className="h-5 w-5 text-violet-600" />
              </div>

              <div className="space-y-3">
                {reminders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                    No reminder rows yet. Add one below.
                  </div>
                ) : (
                  reminders.slice(0, 4).map((item) => (
                    <div key={item.id ?? item.title} className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3">
                      <p className="text-sm font-medium text-slate-800">{item.title ?? "Untitled reminder"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.status === "completed" ? "Completed" : "Pending"} • {formatDisplayTime(item.due_at ?? item.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Capture</p>
                  <h2 className="text-lg font-bold">Add activity</h2>
                </div>
                <ArrowRight className="h-5 w-5 text-violet-600" />
              </div>

              <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Title</label>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="Daily architecture review"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Summary</label>
                  <textarea
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="What happened today?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Source</label>
                    <select
                      value={form.source}
                      onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as ActivitySource }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    >
                      <option value="manual">Manual</option>
                      <option value="grok">Grok</option>
                      <option value="claude">Claude</option>
                      <option value="chatgpt">ChatGPT</option>
                      <option value="pwa">PWA</option>
                      <option value="voice">Voice</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Type</label>
                    <select
                      value={form.activityType}
                      onChange={(event) => setForm((current) => ({ ...current, activityType: event.target.value as ActivityType }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    >
                      <option value="note">Note</option>
                      <option value="research">Research</option>
                      <option value="engineering">Engineering</option>
                      <option value="decision">Decision</option>
                      <option value="idea">Idea</option>
                      <option value="meeting">Meeting</option>
                      <option value="reminder">Reminder</option>
                      <option value="journal">Journal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Project</label>
                    <input
                      value={form.project}
                      onChange={(event) => setForm((current) => ({ ...current, project: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                      placeholder="Re:Mind Me"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Status</label>
                    <select
                      value={form.completionStatus}
                      onChange={(event) => setForm((current) => ({ ...current, completionStatus: event.target.value as ActivityStatus }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    >
                      <option value="recorded">Recorded</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Category</label>
                  <input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="Product, engineering, planning"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="w-full rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:bg-violet-300"
                >
                  {submitting ? "Saving…" : "Save activity"}
                </button>
              </form>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
