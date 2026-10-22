import { createHash } from "node:crypto";

/** @typedef {"activity:read" | "activity:write" | "offline_access"} McpOAuthScope */

export const MCP_OAUTH_SCOPE_VALUES = Object.freeze([
  "activity:read",
  "activity:write",
  "offline_access",
]);

/** Return a lowercase SHA-256 digest for opaque OAuth credential storage. */
export function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** RFC 7636 S256 challenge verification. Only the S256 method is supported. */
export function pkceMatches(verifier, challenge) {
  if (typeof verifier !== "string" || typeof challenge !== "string") return false;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return false;
  const expected = createHash("sha256").update(verifier, "ascii").digest("base64url");
  return expected === challenge;
}

/**
 * OAuth redirect URI validation. Exact URI matching is performed again during
 * authorization and code exchange; wildcards are never accepted.
 */
export function isValidOAuthRedirectUri(value, applicationType = "web") {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) return false;
  if (/[\u0000-\u0020\\]/.test(value)) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.hash) return false;

  if (url.protocol === "https:") {
    return Boolean(url.hostname) && !url.hostname.endsWith(".");
  }
  if (url.protocol === "http:") {
    const loopback = url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";
    return applicationType === "native" && loopback;
  }

  // Private-use URI schemes are only accepted for native clients. Requiring a
  // dotted scheme follows OAuth native-app guidance and prevents weak schemes
  // such as "myapp:" from being registered by unrelated apps.
  if (applicationType !== "native" || !/^[a-z][a-z0-9+.-]*:$/.test(url.protocol)) return false;
  const scheme = url.protocol.slice(0, -1);
  return scheme.includes(".") && !url.origin.includes("null") && value.length > scheme.length + 1;
}

/**
 * Normalize and validate a requested OAuth scope string.
 * Empty scope defaults to read-only. Unknown scopes fail closed.
 */
export function normalizeOAuthScopes(value, defaultScope = "activity:read") {
  const raw = typeof value === "string" && value.trim() ? value.trim() : defaultScope;
  const values = [...new Set(raw.split(/\s+/).filter(Boolean))];
  if (values.length === 0 || values.some((scope) => !MCP_OAUTH_SCOPE_VALUES.includes(scope))) {
    throw new Error("invalid_scope");
  }
  if (values.includes("offline_access") && values.length === 1) {
    throw new Error("invalid_scope");
  }
  return values;
}

/** Check that a granted scope list is a subset of the originally requested list. */
export function scopesAreSubset(selected, requested) {
  return Array.isArray(selected) && Array.isArray(requested) &&
    selected.length > 0 &&
    selected.every((scope) => MCP_OAUTH_SCOPE_VALUES.includes(scope) && requested.includes(scope));
}

/** Canonicalize an MCP resource URI and reject query, fragment, credentials, or non-HTTPS production origins. */
export function canonicalResource(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null;
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}
