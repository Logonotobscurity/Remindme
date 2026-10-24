import { createFileRoute } from "@tanstack/react-router";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import {
  supabaseSessionClearCookie,
  supabaseSessionSetCookie,
  userFromSupabaseToken,
} from "@/lib/auth/supabase-user.server";

export const Route = createFileRoute("/api/auth/supabase-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertSameSiteRequest();
        } catch {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        let accessToken = "";
        try {
          const body = await request.json() as { accessToken?: unknown };
          accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
        } catch {
          return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
        }
        if (accessToken.length < 20 || accessToken.length > 8192) {
          return Response.json({ error: "Access token was not accepted." }, { status: 400 });
        }
        const user = await userFromSupabaseToken(accessToken);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        return Response.json(
          { ok: true, userId: user.id },
          { status: 200, headers: { "cache-control": "no-store", "set-cookie": supabaseSessionSetCookie(accessToken) } },
        );
      },
      DELETE: async () => {
        try {
          assertSameSiteRequest();
        } catch {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        return Response.json(
          { ok: true },
          { status: 200, headers: { "cache-control": "no-store", "set-cookie": supabaseSessionClearCookie() } },
        );
      },
    },
  },
});
