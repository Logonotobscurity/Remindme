import { createServerFileRoute } from "@tanstack/react-start/server";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { getSessionUser } from "@/lib/auth/verify.server";
import {
  consumeOAuthConsentRequest,
  createOAuthAuthorizationCode,
  createOAuthConsentRequest,
  findOAuthClient,
  getOAuthConsentRequest,
  htmlEscape,
  type McpOAuthScope,
} from "@/lib/activity/mcp-oauth.server";
import { canonicalMcpResource } from "@/lib/activity/mcp-oauth.server";
import {
  normalizeOAuthScopes,
  scopesAreSubset,
  sha256Hex,
} from "@/lib/activity/mcp-oauth-policy.mjs";

const SCOPE_LABELS: Record<McpOAuthScope, { title: string; description: string }> = {
  "activity:read": {
    title: "Read activity memory",
    description: "Search captured activities and view the daily digest.",
  },
  "activity:write": {
    title: "Write to activity memory",
    description: "Save work summaries, decisions, and action items.",
  },
  offline_access: {
    title: "Stay connected",
    description: "Allow refresh tokens so the connector can remain connected after access tokens expire.",
  },
};

function noStoreHtml(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function jsonError(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function redirectOAuthError(redirectUri: string, state: string, error: string) {
  const destination = new URL(redirectUri);
  destination.searchParams.set("error", error);
  destination.searchParams.set("state", state);
  return Response.redirect(destination.toString(), 302);
}

function loginRedirect(requestUrl: URL) {
  const returnTo = requestUrl.pathname + requestUrl.search;
  const target = new URL("/login", requestUrl.origin);
  target.searchParams.set("returnTo", returnTo);
  return Response.redirect(target.toString(), 302);
}

function consentPage(clientName: string, requestToken: string, requestedScopes: McpOAuthScope[]) {
  const options = (Object.keys(SCOPE_LABELS) as McpOAuthScope[])
    .filter((scope) => requestedScopes.includes(scope))
    .map((scope) => {
      const label = SCOPE_LABELS[scope];
      return `<label class="scope"><input type="checkbox" name="scope" value="${scope}" checked><span><strong>${htmlEscape(label.title)}</strong><small>${htmlEscape(label.description)}</small></span></label>`;
    }).join("");

  return noStoreHtml(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect ${htmlEscape(clientName)} · Re:Mind Me</title>
<style>
:root{color-scheme:light;--ink:#141412;--paper:#f5edd4;--purple:#9b78e8;--green:#1a5c48}
*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;background:var(--paper);font:16px/1.5 system-ui,sans-serif;color:var(--ink)}
main{width:min(100%,520px);border:1px solid #14141220;border-radius:24px;background:#fffdf7;padding:clamp(22px,5vw,36px);box-shadow:0 20px 70px #14141212}
.brand{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:var(--green);font-weight:750}
h1{font-family:Georgia,serif;font-weight:500;line-height:1.1;font-size:clamp(30px,6vw,40px);margin:12px 0}
p{color:#57574f}h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 10px}
.scope{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-top:1px solid #14141212}
.scope input{width:18px;height:18px;accent-color:var(--green);margin-top:3px;flex:0 0 auto}
.scope strong,.scope small{display:block}.scope strong{font-size:14px}.scope small{font-size:13px;color:#66665d;margin-top:2px}
.actions{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:24px}
button{min-height:48px;border-radius:14px;border:1px solid #14141224;padding:10px 14px;font-size:14px;font-weight:700;cursor:pointer}
.deny{background:transparent;color:var(--ink)}.approve{background:var(--green);border-color:var(--green);color:white}
.notice{font-size:12px!important;margin-top:20px;color:#696960}
</style>
</head>
<body>
<main>
<div class="brand">Re:Mind Me · Secure connection</div>
<h1>Connect ${htmlEscape(clientName)}?</h1>
<p>This client is requesting access to your private activity memory. Review exactly what it can do before approving.</p>
<h2>Requested permissions</h2>
<form method="post" action="/oauth/authorize">
<input type="hidden" name="consent_token" value="${htmlEscape(requestToken)}">
${options || "<p>No permissions were selected. Restart the connection from your AI client.</p>"}
<div class="actions">
<button class="deny" type="submit" name="decision" value="deny">Deny</button>
<button class="approve" type="submit" name="decision" value="approve">Approve access</button>
</div>
</form>
<p class="notice">You can revoke this client's access later. Re:Mind Me only shares records captured in your account; this connection does not give the client access to unrelated browser data.</p>
</main>
</body>
</html>`);
}

export const Route = createServerFileRoute("/oauth/authorize")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("client_id") ?? "";
    const redirectUri = url.searchParams.get("redirect_uri") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const responseType = url.searchParams.get("response_type");
    const resource = url.searchParams.get("resource");
    const challenge = url.searchParams.get("code_challenge") ?? "";
    const challengeMethod = url.searchParams.get("code_challenge_method");

    const client = await findOAuthClient(clientId);
    if (!client) return jsonError("invalid_client", "Unknown or disabled OAuth client.", 400);
    const redirectUris = Array.isArray(client.redirect_uris) ? client.redirect_uris : [];
    if (!redirectUris.includes(redirectUri)) {
      return jsonError("invalid_request", "redirect_uri does not exactly match a registered URI.", 400);
    }
    if (responseType !== "code") return redirectOAuthError(redirectUri, state, "unsupported_response_type");
    if (!state || state.length > 1000) return redirectOAuthError(redirectUri, state, "invalid_request");
    if (challengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
      return redirectOAuthError(redirectUri, state, "invalid_request");
    }
    if (!resource || resource !== canonicalMcpResource(request.url)) {
      return redirectOAuthError(redirectUri, state, "invalid_target");
    }

    let scopes: McpOAuthScope[];
    try {
      scopes = normalizeOAuthScopes(url.searchParams.get("scope") ?? "activity:read");
    } catch {
      return redirectOAuthError(redirectUri, state, "invalid_scope");
    }

    const grantTypes = Array.isArray(client.grant_types) ? client.grant_types : [];
    const responseTypes = Array.isArray(client.response_types) ? client.response_types : [];
    if (!grantTypes.includes("authorization_code") || !responseTypes.includes("code")) {
      return redirectOAuthError(redirectUri, state, "unauthorized_client");
    }

    const user = await getSessionUser();
    if (!user) return loginRedirect(url);

    const consentToken = await createOAuthConsentRequest({
      userId: user.id,
      clientId,
      redirectUri,
      state,
      resource,
      codeChallenge: challenge,
      scopes,
    });
    return consentPage(client.client_name, consentToken, scopes);
  },

  POST: async ({ request }) => {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return jsonError("access_denied", "Cross-origin consent submissions are not allowed.", 403);
    }
    try {
      assertSameSiteRequest();
    } catch {
      return jsonError("access_denied", "Cross-origin consent submissions are not allowed.", 403);
    }

    const user = await getSessionUser();
    if (!user) {
      return noStoreHtml(`<!doctype html><meta charset="utf-8"><title>Session expired</title><main><h1>Session expired</h1><p>Please restart the connection from your AI client, sign in again, and review the permissions.</p><a href="/login">Sign in</a></main>`, 401);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError("invalid_request", "Consent form was invalid.");
    }
    const requestToken = form.get("consent_token");
    const decision = form.get("decision");
    if (typeof requestToken !== "string" || !requestToken.startsWith("rmm_consent_") ||
        (decision !== "approve" && decision !== "deny")) {
      return jsonError("invalid_request", "Consent request was invalid.");
    }

    const consent = await getOAuthConsentRequest(requestToken, user.id);
    if (!consent) return jsonError("invalid_request", "This consent request expired or was already used.", 400);
    const client = await findOAuthClient(consent.client_id);
    if (!client) return jsonError("invalid_client", "This OAuth client was disabled.", 400);

    const redirectUris = Array.isArray(client.redirect_uris) ? client.redirect_uris : [];
    if (!redirectUris.includes(consent.redirect_uri)) {
      return jsonError("invalid_request", "The registered redirect URI changed.", 400);
    }

    if (decision === "deny") {
      const consumed = await consumeOAuthConsentRequest(requestToken, user.id);
      if (!consumed) return jsonError("invalid_request", "This consent request was already used.", 400);
      return redirectOAuthError(consent.redirect_uri, consent.state, "access_denied");
    }

    const requestedScopes = Array.isArray(consent.scopes) ? consent.scopes : [];
    const selectedScopes = form.getAll("scope").filter((value): value is string => typeof value === "string");
    if (!scopesAreSubset(selectedScopes, requestedScopes)) {
      return jsonError("invalid_scope", "Choose one or more of the permissions originally requested.", 400);
    }
    let scopes: McpOAuthScope[];
    try {
      scopes = normalizeOAuthScopes(selectedScopes.join(" "));
    } catch {
      return jsonError("invalid_scope", "At least one valid permission is required.", 400);
    }

    const consumed = await consumeOAuthConsentRequest(requestToken, user.id);
    if (!consumed) return jsonError("invalid_request", "This consent request was already used.", 400);
    const code = await createOAuthAuthorizationCode({
      userId: user.id,
      clientId: consent.client_id,
      redirectUri: consent.redirect_uri,
      resource: consent.resource,
      codeChallenge: consent.code_challenge,
      scopes,
    });
    const destination = new URL(consent.redirect_uri);
    destination.searchParams.set("code", code);
    destination.searchParams.set("state", consent.state);
    destination.searchParams.set("iss", new URL(request.url).origin);
    return Response.redirect(destination.toString(), 302);
  },
});
