import { createClient } from "@supabase/supabase-js";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
const supabaseKey = env("SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_PUBLISHABLE_KEY");

export const SUPABASE_SESSION_COOKIE = "__Host-remindme.supabase";

export function readSupabaseSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const splitAt = trimmed.indexOf("=");
    if (splitAt === -1 || trimmed.slice(0, splitAt) !== SUPABASE_SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(trimmed.slice(splitAt + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export function supabaseSessionSetCookie(token: string): string {
  const maxAge = tokenLifetime(token);
  return `${SUPABASE_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function supabaseSessionClearCookie(): string {
  return `${SUPABASE_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function userFromSupabaseToken(
  token: string | undefined,
): Promise<{ id: string; email: string | null } | null> {
  if (!token || !supabaseUrl || !supabaseKey || !token.includes(".")) return null;
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

function tokenLifetime(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()) as { exp?: unknown };
    if (typeof payload.exp === "number") {
      return Math.max(60, Math.min(60 * 60 * 24, payload.exp - Math.floor(Date.now() / 1000)));
    }
  } catch {
    /* use the default below */
  }
  return 60 * 60;
}
