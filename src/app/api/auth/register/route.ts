import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { issueCsrfCookie } from "@/lib/csrf";
import { forwardedForHeader } from "@/lib/clientIp";

const API_BASE = process.env.BACKEND_API_URL;

// Patient registration only — doctor registration requires a multipart
// profile-image upload and a much larger required field set (specialization,
// licenseNumber, etc.), so it gets its own route rather than being folded
// into this JSON one.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ success: false, message: "name, email and password are required" }, { status: 400 });
  }

  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    // The backend ignores/overrides roles from the client and always forces
    // ["User"] server-side — no need to (and no way to) request otherwise.
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const registerData = await registerRes.json();

  if (!registerRes.ok || !registerData.success) {
    return NextResponse.json(
      { success: false, message: registerData.message || "Registration failed" },
      { status: registerRes.status }
    );
  }

  // The backend doesn't auto-login on registration (no token in the
  // response) — chain a login call with the same credentials so a new
  // patient lands straight in the dashboard instead of hitting a second
  // login form immediately after signing up.
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const loginData = await loginRes.json();

  if (!loginRes.ok || !loginData.success) {
    // Registration itself succeeded — don't report failure, just tell the
    // client to send them to the login form instead of the dashboard.
    return NextResponse.json({ success: true, autoLoginFailed: true });
  }

  const session = await getSession();
  session.accessToken = loginData.token;
  session.refreshToken = loginData.refreshToken;
  session.user = {
    id: loginData.user._id,
    role: "User",
    name: loginData.user.name,
    email: loginData.user.email,
  };
  // See login/route.ts — a real account always supersedes a prior guest
  // session. Note this path creates a brand-new account independent of any
  // guest browsing that came before (it does not call /auth/convert), so a
  // guest's cart/session continuity is not preserved by registering this
  // way — a known gap, not silently "handled."
  session.isAnonymous = false;
  session.sessionId = undefined;
  await session.save();

  const res = NextResponse.json({ success: true, user: session.user });
  issueCsrfCookie(res);
  return res;
}
