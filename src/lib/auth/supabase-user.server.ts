import { createClient } from "@supabase/supabase-js";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
const supabaseKey = env("SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_PUBLISHABLE_KEY");

export async function userFromSupabaseToken(
  token: string | undefined,
): Promise<{ id: string; email: string | null } | null> {
  if (!token || !supabaseUrl || !supabaseKey) return null;
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
