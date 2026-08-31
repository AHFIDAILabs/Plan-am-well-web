import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { getSession } from "./session";
import { forwardedForHeader } from "./clientIp";

const API_BASE = process.env.BACKEND_API_URL;

if (!API_BASE) {
  throw new Error("BACKEND_API_URL env var must be set (e.g. https://planamwell-backend.onrender.com/api/v1)");
}

export class BackendAuthError extends Error {}

async function rawFetch(
  path: string,
  accessToken: string | undefined,
  clientIpHeaders: Record<string, string>,
  init?: RequestInit
): Promise<Response> {
  // A FormData body (multipart uploads — e.g. doctor registration's profile
  // image) must NOT get a hardcoded JSON content-type: fetch sets its own
  // multipart boundary header from the FormData instance, and forcing
  // "application/json" here would corrupt that boundary and break the
  // backend's multer parsing.
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...clientIpHeaders,
      ...(init?.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    // Server-to-server calls always want fresh data — this fetch never runs
    // in the browser, so there's no user-facing cache to leverage here.
    cache: "no-store",
  });
}

/**
 * Calls the real Express backend on behalf of the current session. On a 401,
 * refreshes the access token exactly once (rotating the stored refresh token
 * in the same request, matching the backend's rotate-on-use behavior) and
 * retries. The browser never sees either token — only this function and the
 * route handlers that call it ever touch them.
 *
 * `req` is the incoming Next.js request being handled — used only to forward
 * the real visitor IP to the backend (see lib/clientIp.ts) so its per-IP
 * rate limiting stays meaningful instead of bucketing all web traffic behind
 * this one server's address.
 *
 * Throws BackendAuthError if there's no session or the refresh attempt also
 * fails (session destroyed in that case) — callers should catch this and
 * respond 401 to the browser, which should redirect to login.
 */
export async function backendFetch(req: NextRequest, path: string, init?: RequestInit): Promise<Response> {
  const session = await getSession();
  if (!session.accessToken) {
    throw new BackendAuthError("Not authenticated");
  }

  const clientIpHeaders = forwardedForHeader(req);

  let res = await rawFetch(path, session.accessToken, clientIpHeaders, init);

  if (res.status === 401 && session.refreshToken) {
    const refreshRes = await rawFetch("/auth/refreshToken", undefined, clientIpHeaders, {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!refreshRes.ok) {
      session.destroy();
      throw new BackendAuthError("Session expired — please log in again");
    }

    const data = await refreshRes.json();
    session.accessToken = data.token;
    session.refreshToken = data.refreshToken;
    await session.save();

    res = await rawFetch(path, session.accessToken, clientIpHeaders, init);
  }

  return res;
}

/**
 * For backend routes that are genuinely public (no verifyToken/guestAuth at
 * all — e.g. clinic search) and must work for signed-out visitors too. Still
 * forwards the real client IP so the backend's per-IP rate limiting stays
 * meaningful, same reasoning as backendFetch above — just without requiring
 * a session or attaching a bearer token.
 */
export async function publicBackendFetch(req: NextRequest, path: string, init?: RequestInit): Promise<Response> {
  return rawFetch(path, undefined, forwardedForHeader(req), init);
}

/**
 * Same as publicBackendFetch, but for a Server Component (a page.tsx doing
 * its own data fetch for generateMetadata/SSR) where no NextRequest is ever
 * handed to you. Reads the same X-Forwarded-For via next/headers instead.
 */
export async function publicServerFetch(path: string, init?: RequestInit): Promise<Response> {
  const headerList = await headers();
  const xff = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return rawFetch(path, undefined, xff ? { "X-Forwarded-For": xff } : {}, init);
}
