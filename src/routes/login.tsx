import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(providerId: string) {
    setBusyProvider(providerId);
    setError(null);
    try {
      // MCP OAuth sign-in returns to the original authorization request. Only
      // accept the exact same-origin authorize route; never accept an external
      // callback or an arbitrary client-controlled redirect here.
      const rawReturnTo = new URLSearchParams(window.location.search).get("returnTo");
      let callbackURL = "/";
      if (rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") && !rawReturnTo.includes("\\\\")) {
        try {
          const candidate = new URL(rawReturnTo, window.location.origin);
          if (
            candidate.origin === window.location.origin &&
            candidate.pathname === "/oauth/authorize" &&
            !candidate.hash
          ) {
            callbackURL = candidate.pathname + candidate.search;
          }
        } catch {
          callbackURL = "/";
        }
      }
      await signIn(providerId, { callbackURL });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Please try again.");
      setBusyProvider(null);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8 text-slate-900">
      <section className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Re:Mind Me</p>
        <h1 className="mt-2 text-2xl font-bold">Sign in to your memory</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your activity timeline, action items, and reminders are private to your account.
        </p>

        {authEnabled ? (
          <div className="mt-6 space-y-3">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                disabled={busyProvider !== null}
                onClick={() => void handleSignIn(provider.providerId)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
              >
                {busyProvider === provider.providerId
                  ? "Connecting…"
                  : "Continue with " + provider.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            Sign-in is not enabled for this build.
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <a href="/" className="mt-5 inline-block text-sm font-medium text-violet-700 hover:underline">
          Back to Re:Mind Me
        </a>
      </section>
    </main>
  );
}
