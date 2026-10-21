import { useMemo, useState } from "react";
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

const mockDashboard: DashboardItem[] = [
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
];

export function DashboardTab() {
  const [activeTab, setActiveTab] = useState<"reminders" | "dashboard">("dashboard");

  const stats = useMemo(
    () => ({
      total: mockDashboard.length,
      pending: mockDashboard.filter((item) => item.status === "pending").length,
      completed: mockDashboard.filter((item) => item.status === "completed").length,
      today: mockDashboard.filter((item) => item.time.includes("Today")).length,
    }),
    [],
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

        {activeTab === "dashboard" ? (
          <main className="mt-5 space-y-5">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Total</p>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pending</p>
                <div className="mt-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-500" />
                  <span className="text-2xl font-bold">{stats.pending}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Completed</p>
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-2xl font-bold">{stats.completed}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Today</p>
                <div className="mt-3 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-sky-500" />
                  <span className="text-2xl font-bold">{stats.today}</span>
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
                {mockDashboard.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.source}</p>
                        <h3 className="mt-1 text-sm font-semibold text-slate-800">{item.title}</h3>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        item.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sky-100 text-sky-700"
                      }`}>
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
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3">
                  <p className="text-sm font-medium text-slate-800">Review the central memory architecture</p>
                  <p className="mt-1 text-xs text-slate-500">Due today • 3:30 PM</p>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">Log the latest activity capture to the source-of-truth API</p>
                  <p className="mt-1 text-xs text-slate-500">Upcoming • 5:00 PM</p>
                </div>
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
                Create the daily compiler job that groups captured records into summaries, pending tasks, and approved reminders.
              </p>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
