import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase, publishSupabaseSession, safeReturnTo, supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabase();
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (!client || !returnTo) return;
    void client.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const published = await publishSupabaseSession(token);
      if (published) window.location.assign(safeReturnTo(returnTo));
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const client = getSupabase();
    if (!client) {
      setError("Supabase sign-in is not configured for this build.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const credentials = { email: email.trim(), password };
    const result = mode === "create"
      ? await client.auth.signUp(credentials)
      : await client.auth.signInWithPassword(credentials);
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!result.data.session) {
      setNotice("Check your email to confirm the account, then sign in.");
      setMode("sign-in");
      return;
    }
    const published = await publishSupabaseSession(result.data.session.access_token);
    if (!published) {
      setError("Signed in, but the connection cookie was not saved. Try again.");
      return;
    }
    const rawReturnTo = new URLSearchParams(window.location.search).get("returnTo");
    window.location.assign(safeReturnTo(rawReturnTo));
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-8 text-ink">
      <section className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6">
        <p className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase">Re:Mind Me</p>
        <h1 className="wordmark mt-2 text-3xl">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          Email and password are kept by Supabase. Reminders stay private to that account.
        </p>
        {supabaseConfigured ? (
          <form className="mt-6 space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block text-xs font-medium text-mute">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-paper px-3 text-base text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="block text-xs font-medium text-mute">
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-paper px-3 text-base text-ink outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-[#082117] disabled:opacity-50"
            >
              {busy ? "Please wait…" : mode === "create" ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode((current) => (current === "sign-in" ? "create" : "sign-in"));
                setError(null);
                setNotice(null);
              }}
              className="w-full text-sm text-mute"
            >
              {mode === "create" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-2xl border border-line p-3 text-sm text-mute">
            Sign-in is not configured for this build.
          </p>
        )}
        {notice ? <p className="mt-4 text-sm text-mute">{notice}</p> : null}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-blush">
            {error}
          </p>
        ) : null}
        <a href="/" className="mt-5 inline-block text-sm font-medium text-ink">
          Back
        </a>
      </section>
    </main>
  );
}
