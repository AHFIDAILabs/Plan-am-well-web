import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { issueCsrfCookie } from "@/lib/csrf";
import { forwardedForHeader } from "@/lib/clientIp";

const API_BASE = process.env.BACKEND_API_URL;

export async function POST(req: NextRequest) {
  const { email, password, role } = await req.json();

  if (!email || !password || (role !== "User" && role !== "Doctor")) {
    return NextResponse.json({ success: false, message: "email, password and role are required" }, { status: 400 });
  }

  const path = role === "Doctor" ? "/auth/doctor/login" : "/auth/login";

  const backendRes = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const data = await backendRes.json();

  if (!backendRes.ok || !data.success) {
    // The backend already refuses login outright for a doctor whose
    // approvalStatus isn't "approved" (403, "Your account is pending
    // approval") rather than issuing a token and gating post-login — so the
    // web login form just needs to surface that message distinctly, not
    // build a separate "restricted shell" for pending doctors.
    return NextResponse.json(
      { success: false, message: data.message || "Login failed", pendingApproval: backendRes.status === 403 && role === "Doctor" },
      { status: backendRes.status }
    );
  }

  const session = await getSession();
  session.accessToken = data.token;
  session.refreshToken = data.refreshToken;
  session.user = {
    id: data.user._id,
    role: data.user.role === "Doctor" || role === "Doctor" ? "Doctor" : "User",
    name: data.user.name ?? (`${data.user.firstName ?? ""} ${data.user.lastName ?? ""}`.trim() || undefined),
    email: data.user.email,
  };
  // A real login always supersedes whatever guest session may have existed
  // beforehand — otherwise isAnonymous/sessionId would silently persist from
  // an earlier "Continue as Guest" and every gate would keep treating this
  // now-real session as anonymous.
  session.isAnonymous = false;
  session.sessionId = undefined;
  await session.save();

  const res = NextResponse.json({ success: true, user: session.user });
  issueCsrfCookie(res);
  return res;
}
