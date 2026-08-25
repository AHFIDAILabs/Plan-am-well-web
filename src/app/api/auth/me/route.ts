import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { CSRF_COOKIE_NAME, verifyCsrf, csrfRejection } from "@/lib/csrf";

// Tells the client who's logged in (if anyone) without ever exposing the
// underlying tokens — only session.user, never accessToken/refreshToken.
export async function GET() {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  if (session.isAnonymous) {
    return NextResponse.json({ success: true, user: null, isAnonymous: true });
  }
  if (!session.user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ success: true, user: session.user });
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
