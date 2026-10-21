import { getBearerToken } from "@/lib/auth/client";

/**
 * Same-origin REST fetch helper. Deployed requests use the session cookie;
 * live-preview requests need the bearer token captured by the auth popup.
 */
export function activityApiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const bearerToken = getBearerToken();
  if (bearerToken && !headers.has("Authorization")) {
    headers.set("Authorization", \`Bearer \${bearerToken}\`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
