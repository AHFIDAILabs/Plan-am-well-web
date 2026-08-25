import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { CSRF_COOKIE_NAME, verifyCsrf, csrfRejection, issueCsrfCookie } from "@/lib/csrf";

// The CSRF cookie is otherwise only ever issued at login/register/guest-
// creation — a session that outlives that cookie (cleared by a browser
// privacy setting, a stale/mismatched value from some other cause, or any
// other way it can go missing without the underlying login session also
// being invalidated) has no way to recover: every mutating request 403s
// with "Invalid or missing CSRF token" forever, and reloading the page does
// nothing, since a plain page load was never part of the issuing path
// either. This route already runs on every authenticated page load (see
// AuthContext.tsx) — piggybacking a check onto it here means simply
// reloading actually does fix a missing cookie, closing the gap that made
// that instruction a dead end for whoever hit it before this fix shipped.
function withCsrfCookieIfMissing(req: NextRequest, res: NextResponse): NextResponse {
  if (!req.cookies.get(CSRF_COOKIE_NAME)?.value) {
    issueCsrfCookie(res);
  }
  return res;
}

// Tells the client who's logged in (if anyone) without ever exposing the
// underlying tokens — only session.user, never accessToken/refreshToken.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  if (session.isAnonymous) {
    return withCsrfCookieIfMissing(req, NextResponse.json({ success: true, user: null, isAnonymous: true }));
  }
  if (!session.user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  return withCsrfCookieIfMissing(req, NextResponse.json({ success: true, user: session.user }));
}

// Self-service account deletion — mirrors mobile's PrivacySettingsScreen
// flow (password-confirmed, DELETE /auth/me). On success, the account no
// longer exists, so the local session is destroyed here too rather than
// leaving a session cookie pointing at nothing.
export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json({ success: false, message: "Password is required." }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
    const data = await backendRes.json();

    if (backendRes.ok && data.success) {
      const session = await getSession();
      session.destroy();
      const res = NextResponse.json(data, { status: backendRes.status });
      res.cookies.delete(CSRF_COOKIE_NAME);
      return res;
    }

    return NextResponse.json(data, { status: backendRes.status });
  });
}
