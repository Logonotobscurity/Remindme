import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  browserClient ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

export async function supabaseAccessToken(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function publishSupabaseSession(accessToken: string): Promise<boolean> {
  const response = await fetch("/api/auth/supabase-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ accessToken }),
  });
  return response.ok;
}

export async function clearPublishedSupabaseSession(): Promise<void> {
  await fetch("/api/auth/supabase-session", { method: "DELETE", credentials: "same-origin" });
}

export function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.includes("://")) return "/";
  return raw;
}

export function supabaseAppUser(session: Session | null) {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata as { name?: string; full_name?: string; avatar_url?: string } | undefined;
  return {
    id: user.id,
    displayName: meta?.name || meta?.full_name || user.email || null,
    primaryEmail: user.email ?? null,
    profileImageUrl: meta?.avatar_url ?? null,
    isDevFallback: false,
  };
}
