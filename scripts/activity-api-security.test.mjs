import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("all activity REST routes verify the session before accessing records", () => {
  for (const path of [
    "src/routes/api/v1/activity.ts",
    "src/routes/api/v1/action-items.ts",
    "src/routes/api/v1/reminders.ts",
  ]) {
    const source = read(path);
    assert.match(source, /authorizeActivityRequest\(request\)/, path);
    assert.match(source, /if \("response" in auth\) return auth\.response/, path);
  }
});

test("activity writes and every activity read are scoped to the verified owner", () => {
  const service = read("src/lib/activity/service.ts");
  assert.match(service, /INSERT INTO projects \(user_id, name, description\)/);
  assert.match(service, /ON CONFLICT \(user_id, name\)/);
  assert.match(service, /INSERT INTO activity_events \([\s\S]*?user_id, source/);
  assert.match(service, /ON CONFLICT \(user_id, source, source_reference\)/);
  assert.match(service, /FROM activity_events[\s\S]*?WHERE user_id = \$1/);
  assert.match(service, /FROM action_items[\s\S]*?WHERE user_id = \$1/);
  assert.match(service, /FROM reminders[\s\S]*?WHERE user_id = \$1/);
});

test("the ownership migration quarantines legacy rows and enforces non-null owners", () => {
  const migration = read("migrations/0004_activity_ownership.sql");
  for (const table of [
    "projects",
    "activity_events",
    "decisions",
    "action_items",
    "reminders",
    "daily_summaries",
    "connected_accounts",
    "sync_jobs",
  ]) {
    assert.match(
      migration,
      new RegExp("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS user_id TEXT"),
      table,
    );
    assert.match(
      migration,
      new RegExp("UPDATE " + table + " SET user_id = 'legacy-unassigned' WHERE user_id IS NULL"),
      table,
    );
    assert.match(
      migration,
      new RegExp("ALTER TABLE " + table + " ALTER COLUMN user_id SET NOT NULL"),
      table,
    );
  }
});

test("dashboard REST paths are registered separately and no fake activity is used", () => {
  assert.ok(existsSync(join(root, "src/routes/api/v1/action-items.ts")));
  assert.ok(existsSync(join(root, "src/routes/api/v1/reminders.ts")));
  const dashboard = read("src/components/DashboardTab.tsx");
  assert.match(dashboard, /activityApiFetch\("\/api\/v1\/activity\?limit=20"\)/);
  assert.match(dashboard, /useCurrentUserState/);
  assert.doesNotMatch(dashboard, /fallbackDashboard/);
});

test("real sign-in is enabled and both Better Auth routes are mounted", () => {
  const appEnv = JSON.parse(read(".grok/app-env.json"));
  assert.equal(Object.hasOwn(appEnv, "VITE_AUTH_ENABLED"), false);
  assert.ok(existsSync(join(root, "migrations/0001_auth.sql")));
  assert.ok(existsSync(join(root, "src/routes/api/auth/$.ts")));
  assert.ok(existsSync(join(root, "src/routes/login.tsx")));
});

test("signed-in reminder and save actions emit private activity events", () => {
  const app = read("src/components/RemindApp.tsx");
  assert.match(app, /useCurrentUserState/);
  assert.match(app, /activityApiFetch\("\/api\/v1\/activity"/);
  assert.match(app, /privacyLevel: "private"/);
  assert.match(app, /remindme:reminder:/);
  assert.match(app, /remindme:save:/);
  assert.match(app, /if \(authPending \|\| !user \|\| user\.isDevFallback\) return/);
});

test("local reminders, saves, categories, and profile are partitioned by account", () => {
  const storage = read("src/lib/remind.ts");
  assert.match(storage, /function keysForScope\(scope = "guest"\)/);
  assert.match(storage, /encodeURIComponent\(scope\)/);
  for (const fn of ["loadReminders", "loadSaves", "loadCategories", "loadProfile"]) {
    assert.match(storage, new RegExp("function " + fn + "\\(scope = \"guest\"\\)"));
  }
  for (const fn of ["persistReminders", "persistSaves", "persistCategories", "persistProfile", "clearAllData"]) {
    assert.match(storage, new RegExp("function " + fn + "[^\\n]*scope = \"guest\""));
  }
  const app = read("src/components/RemindApp.tsx");
  assert.match(app, /loadedScope !== storageScope/);
  assert.match(app, /loadReminders\(storageScope\)/);
  assert.match(app, /persistReminders\(next, storageScope\)/);
});
