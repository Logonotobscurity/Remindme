export type MediaKind = "image" | "video";

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  custom?: boolean;
};

export type Reminder = {
  id: number;
  text: string;
  photo: string | null;
  mediaKind: MediaKind | null;
  time: number;
  timeLabel: string;
  location: string | null;
  notified: boolean;
  completed: boolean;
  created: number;
  color: string;
};

export type SaveItem = {
  id: number;
  text: string;
  photo: string | null;
  mediaKind: MediaKind | null;
  location: string | null;
  category: string;
  created: number;
  color: string;
};

export type Profile = {
  name: string;
};

export type ReminderDraft = {
  type: "reminder";
  text: string;
  time: number;
  dateLabel: string;
  timeLabel: string;
  location: string;
  photo: string | null;
  mediaKind: MediaKind | null;
};

export type SaveDraft = {
  type: "save";
  text: string;
  location: string;
  categoryId: string;
  photo: string | null;
  mediaKind: MediaKind | null;
};

export type Draft = ReminderDraft | SaveDraft;

export const NOTE_COLORS = ["#ffffff", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#f3e8ff"] as const;

export const CATEGORY_ICONS = ["💡", "📝", "🔗", "📍", "📷", "💼", "🛒", "✈️", "🎯", "⭐", "❤️", "🎨", "🎵", "📱", "💻", "🏠"];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "ideas", name: "Ideas", icon: "💡", color: "#FEF3C7" },
  { id: "tasks", name: "Tasks", icon: "✓", color: "#DBEAFE" },
  { id: "links", name: "Links", icon: "🔗", color: "#E0E7FF" },
  { id: "notes", name: "Notes", icon: "📝", color: "#FCE7F3" },
  { id: "photos", name: "Photos", icon: "📷", color: "#D1FAE5" },
  { id: "place", name: "Place", icon: "📍", color: "#FED7AA" },
  { id: "other", name: "Other", icon: "📌", color: "#E5E7EB" },
];

const KEYS = {
  reminders: "remindme.reminders",
  saves: "remindme.saves",
  categories: "remindme.categories",
  profile: "remindme.profile",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadReminders(): Reminder[] {
  return readJson<Reminder[]>(KEYS.reminders, []).map((item) => ({
    ...item,
    mediaKind: item.mediaKind ?? inferKind(item.photo),
    completed: Boolean(item.completed),
    location: item.location ?? null,
  }));
}

export function loadSaves(): SaveItem[] {
  return readJson<SaveItem[]>(KEYS.saves, []).map((item) => ({
    ...item,
    mediaKind: item.mediaKind ?? inferKind(item.photo),
    location: item.location ?? null,
  }));
}

export function loadCategories(): Category[] {
  const stored = readJson<Category[] | null>(KEYS.categories, null);
  if (!stored?.length) return DEFAULT_CATEGORIES;
  return stored;
}

export function loadProfile(): Profile | null {
  return readJson<Profile | null>(KEYS.profile, null);
}

export function persistReminders(items: Reminder[]) {
  writeJson(KEYS.reminders, items);
}
export function persistSaves(items: SaveItem[]) {
  writeJson(KEYS.saves, items);
}
export function persistCategories(items: Category[]) {
  writeJson(KEYS.categories, items);
}
export function persistProfile(profile: Profile | null) {
  if (!profile) localStorage.removeItem(KEYS.profile);
  else writeJson(KEYS.profile, profile);
}

export function clearAllData() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

export function inferKind(photo: string | null | undefined): MediaKind | null {
  if (!photo) return null;
  if (photo.startsWith("data:video")) return "video";
  return "image";
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function hhmm(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInput(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatTimeLabel(ts: number) {
  const date = new Date(ts);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${hhmm(date)}`;
}

export function dateChip(ts: number, now = new Date()) {
  const date = new Date(ts);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === 2) return "Day after tomorrow";
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getTimeAgo(created: number) {
  const diffMs = Date.now() - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  const date = new Date(created);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function combineDateTime(dateStr: string, timeStr: string) {
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.getTime();
}

function applyMeridiem(hour: number, mer: string) {
  const tag = mer.toLowerCase();
  if ((tag === "pm" || tag === "sore" || tag === "malam" || tag === "malem") && hour < 12) return hour + 12;
  if ((tag === "am" || tag === "pagi") && hour === 12) return 0;
  if (tag === "siang" && hour < 11) return hour + 12;
  return hour;
}

export function parseReminder(inputText: string, photo: string | null, mediaKind: MediaKind | null): ReminderDraft {
  const original = inputText.trim();
  const text = original.toLowerCase();
  const now = new Date();
  let date = new Date(now);
  let dateLabel = "Today";

  if (/\b(besok|tomorrow)\b/.test(text)) {
    date.setDate(date.getDate() + 1);
    dateLabel = "Tomorrow";
  } else if (/\blusa\b/.test(text)) {
    date.setDate(date.getDate() + 2);
    dateLabel = "Day after tomorrow";
  } else if (/\b(minggu depan|next week)\b/.test(text)) {
    date.setDate(date.getDate() + 7);
    dateLabel = "Next week";
  }

  let hour = 9;
  let minute = 0;

  const relative = text.match(/\b(?:dalam|in)\s*(\d+)\s*(jam|menit|hours?|minutes?|mins?)\b/);
  if (relative) {
    const amount = parseInt(relative[1], 10);
    const unit = relative[2];
    const ms = unit.startsWith("men") || unit.startsWith("min") ? amount * 60000 : amount * 3600000;
    date = new Date(now.getTime() + ms);
    hour = date.getHours();
    minute = date.getMinutes();
    dateLabel = dateChip(date.getTime(), now);
  } else {
    const jam = text.match(/\b(?:jam|pukul|at)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|pagi|siang|sore|malam|malem)?\b/);
    const clock = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if (jam) {
      hour = applyMeridiem(parseInt(jam[1], 10), jam[3] || "");
      minute = jam[2] ? parseInt(jam[2], 10) : 0;
      if (!jam[3]) {
        if (/\b(sore|afternoon)\b/.test(text) && hour < 12) hour += 12;
        else if (/\b(malam|malem|evening|tonight)\b/.test(text) && hour < 12) hour += 12;
        else if (/\b(siang)\b/.test(text) && hour < 11) hour += 12;
      }
    } else if (clock) {
      hour = applyMeridiem(parseInt(clock[1], 10), clock[3]);
      minute = clock[2] ? parseInt(clock[2], 10) : 0;
    } else if (/\b(pagi|morning)\b/.test(text)) hour = 8;
    else if (/\b(siang|noon)\b/.test(text)) hour = 12;
    else if (/\b(sore|afternoon)\b/.test(text)) hour = 17;
    else if (/\b(malam|malem|tonight|evening)\b/.test(text)) hour = 20;

    hour = Math.min(23, Math.max(0, hour));
    minute = Math.min(59, Math.max(0, minute));
    date.setHours(hour, minute, 0, 0);
    if (date.getTime() < now.getTime() - 30_000 && dateLabel === "Today") {
      date.setDate(date.getDate() + 1);
      dateLabel = "Tomorrow";
    }
  }

  let location = "";
  const loc = original.match(
    /\b(?:di|at)\s+([A-Za-z0-9][A-Za-z0-9\s.'-]{1,40}?)(?=\s+(?:jam|pukul|pagi|siang|sore|malam|malem|besok|lusa|tomorrow|at|sama|bareng|dengan|namanya|yang|untuk|to)\b|[.,]|$)/i,
  );
  if (loc) {
    const raw = loc[1].trim();
    if (raw && !/^(aku|me|sini|here|sana)$/i.test(raw)) location = titleCase(raw);
  }

  let clean = original;
  const prefixes = [
    "ingetin aku",
    "ingatkan aku",
    "tolong ingetin",
    "remind me to",
    "remind me",
    "ingetin",
    "ingatkan",
    "reminder",
  ];
  for (const prefix of prefixes) {
    if (clean.toLowerCase().startsWith(prefix)) {
      clean = clean.slice(prefix.length).trim();
      break;
    }
  }
  clean = clean
    .replace(/\b(besok|lusa|minggu depan|hari ini|nanti|tomorrow|next week|tonight)\b/gi, "")
    .replace(/\b(?:jam|pukul|at)\s*\d{1,2}(?:[:.]\d{2})?\s*(am|pm|pagi|siang|sore|malam|malem)?\b/gi, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, "")
    .replace(/\b(?:dalam|in)\s*\d+\s*(jam|menit|hours?|minutes?|mins?)\b/gi, "")
    .replace(/\b(pagi|siang|sore|malam|malem|morning|afternoon|evening)\b/gi, "");
  if (location) {
    clean = clean.replace(new RegExp(`\\b(?:di|at)\\s+${location}\\b`, "gi"), "");
  }
  clean = clean.replace(/\s+/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "").trim();
  if (clean) clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (!clean) {
    if (mediaKind === "video") clean = "Video reminder";
    else if (photo) clean = "Photo reminder";
    else clean = "Reminder";
  }

  return {
    type: "reminder",
    text: clean,
    time: date.getTime(),
    dateLabel,
    timeLabel: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    location,
    photo,
    mediaKind,
  };
}

const SAVE_CONTEXTS: { pattern: RegExp; categoryId: string }[] = [
  { pattern: /tempat\s*liburan|destinasi|vacation|holiday|wisata|travel/i, categoryId: "place" },
  { pattern: /tempat\s*makan|resto|restaurant|kuliner|food/i, categoryId: "place" },
  { pattern: /tempat\s*nongkrong|cafe|coffee|ngopi/i, categoryId: "place" },
  { pattern: /inspirasi|design|desain|referensi|idea|ide\b/i, categoryId: "ideas" },
  { pattern: /catatan|note/i, categoryId: "notes" },
  { pattern: /musik|music|song|lagu|playlist/i, categoryId: "other" },
  { pattern: /film|movie|series|nonton/i, categoryId: "other" },
  { pattern: /buku|book|baca|read/i, categoryId: "other" },
];

export function parseSave(inputText: string, photo: string | null, mediaKind: MediaKind | null): SaveDraft {
  const original = inputText.trim();
  const text = original.toLowerCase();
  let categoryId = "other";
  let clean = original;
  let location = "";

  const urlMatch = original.match(/https?:\/\/[^\s]+/i);
  const namedPlace = original.match(
    /(?:lokasi|tempat|place|location)\s*(?:ngedate|makan|hangout|ngopi|date)?\s*(?:(?:di|in)\s+)?([a-z0-9][a-z0-9\s.'-]{0,30}?)\s+(?:namanya|named|called)\s+([a-z0-9][a-z0-9\s&'.-]{0,40})/i,
  );

  if (namedPlace) {
    location = titleCase(namedPlace[1].trim());
    clean = titleCase(namedPlace[2].trim());
    categoryId = "place";
  } else if (urlMatch) {
    categoryId = "links";
    const before = original.slice(0, original.indexOf(urlMatch[0])).replace(/^(save|simpan)\s*/i, "").replace(/[:\s]+$/g, "").trim();
    clean = before ? `${before}\n${urlMatch[0]}` : urlMatch[0];
  } else {
    for (const ctx of SAVE_CONTEXTS) {
      if (ctx.pattern.test(text)) {
        categoryId = ctx.categoryId;
        break;
      }
    }
    if (/\b(lokasi|tempat|place|location)\b/i.test(text)) categoryId = "place";
    if (!original && (photo || mediaKind)) categoryId = "photos";
    else if ((photo || mediaKind) && categoryId === "other") categoryId = "photos";
    clean = original.replace(/^(save|simpan|ide|idea|catatan|note|lokasi|place|location)\s*[:\-]?\s*/i, "").trim();
    const loc = clean.match(/\b(?:di|at)\s+([A-Za-z0-9][A-Za-z0-9\s.'-]{1,40})$/i);
    if (loc && categoryId === "place") {
      location = titleCase(loc[1].trim());
    }
  }

  if (clean && !clean.startsWith("http")) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  if (!clean) {
    clean = mediaKind === "video" ? "Video" : photo ? "Photo" : "Saved item";
  }

  return {
    type: "save",
    text: clean,
    location,
    categoryId,
    photo,
    mediaKind,
  };
}

export function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export function firstUrl(text: string) {
  return text.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
}
