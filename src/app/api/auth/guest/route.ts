import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { issueCsrfCookie } from "@/lib/csrf";
import { forwardedForHeader } from "@/lib/clientIp";

const API_BASE = process.env.BACKEND_API_URL;

// Pre-auth, like /api/auth/login and /api/auth/register — no CSRF check
// (nothing to protect yet; the session this creates is what CSRF protection
// applies to afterward).
export async function POST(req: NextRequest) {
  const guestRes = await fetch(`${API_BASE}/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    cache: "no-store",
  });
  const guestData = await guestRes.json();

  if (!guestRes.ok || !guestData.success) {
    return NextResponse.json(
      { success: false, message: guestData.message || "Could not start a guest session" },
      { status: guestRes.status }
    );
  }

  const session = await getSession();
  session.accessToken = guestData.token;
  session.sessionId = guestData.sessionId;
  session.isAnonymous = true;
  session.refreshToken = undefined;
  session.user = undefined;
  await session.save();

  const res = NextResponse.json({ success: true, isAnonymous: true });
  issueCsrfCookie(res);
  return res;
}
