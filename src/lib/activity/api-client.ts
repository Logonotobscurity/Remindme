import { getBearerToken } from "@/lib/auth/client";
import { supabaseAccessToken } from "@/lib/supabase";

/**
 * Same-origin REST fetch helper. A Supabase session sends its access token.
 * Live-preview requests otherwise use the Better Auth bearer token. Deployed
 * cookie sessions send no Authorization header.
 */
export async function activityApiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    const token = (await supabaseAccessToken()) ?? getBearerToken();
    if (token) headers.set("Authorization", "Bearer " + token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}