import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { requireUserId } from "@/lib/auth/verify.server";

type ActivityAuthorization =
  | { userId: string; response?: never }
  | { userId?: never; response: Response };

/**
 * REST handlers do not go through createServerFn middleware, so enforce the
 * same checks explicitly: Fetch-Metadata isolation plus a verified session.
 * The bearer token is only used by the isolated live-preview iframe; deployed
 * requests authenticate from the same-origin session cookie.
 */
export async function authorizeActivityRequest(
  request: Request,
): Promise<ActivityAuthorization> {
  try {
    assertSameSiteRequest();
    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    return { userId: await requireUserId(bearerToken) };
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : 0;

    if (status === 401) {
      return {
        response: Response.json(
          { error: "Unauthorized", code: "unauthorized" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    if (status === 403) {
      return {
        response: Response.json(
          { error: "Forbidden", code: "cross_site_request" },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }

    console.error("[activity-api] Could not verify the request identity", error);
    return {
      response: Response.json(
        { error: "Activity authorization is unavailable", code: "auth_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
}
