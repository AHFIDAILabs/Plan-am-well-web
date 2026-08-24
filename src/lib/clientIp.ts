import { NextRequest } from "next/server";

/**
 * Best-effort real client IP for the incoming request, read from whatever
 * X-Forwarded-For our own hosting platform's edge sets. Not attacker-
 * controllable in a properly configured deployment — the platform in front
 * of this Next.js app (Vercel's edge, or a reverse proxy we control) is
 * responsible for producing a trustworthy value here, the same way the
 * backend already trusts exactly one hop from Render's own edge. In local
 * dev, with no such edge in front of us, this is undefined — expected.
 */
export function getClientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || undefined;
}

/**
 * Every server-to-server call this app makes to the Express backend goes
 * through this one Next.js server, so without this, the backend's IP-based
 * rate limiters (login/register throttling) would see all web traffic as
 * coming from a single IP — letting one abusive user's failed logins lock
 * out every other web user, not just themselves. Forwarding the real client
 * IP here, paired with the backend trusting this hop (see backend's
 * TRUSTED_PROXY_IPS), keeps per-visitor throttling meaningful for the web
 * path exactly as it already is for mobile's direct-to-Render traffic.
 */
export function forwardedForHeader(req: NextRequest): Record<string, string> {
  const ip = getClientIp(req);
  return ip ? { "X-Forwarded-For": ip } : {};
}
