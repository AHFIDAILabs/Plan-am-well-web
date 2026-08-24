import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import type { SessionData } from "@/lib/session";

const PATIENT_PREFIX = "/app";
const DOCTOR_PREFIX = "/provider";

// A fast, optimistic gate: decrypts the session cookie (cheap, no network
// call) to check a session exists and which portal it belongs to. It does
// NOT verify the access token against the backend — that happens lazily the
// first time a Server Component/Route Handler actually calls backendFetch
// and gets a real 401, which triggers the refresh-or-redirect-to-login path.
// Middleware's job is just "don't let a Doctor session render Patient
// screens or vice versa, and don't let an anonymous request through at all."
export async function proxy(req: NextRequest) {
  const cookie = req.cookies.get("paw_session")?.value;
  let session: SessionData | null = null;

  if (cookie) {
    try {
      session = await unsealData<SessionData>(cookie, { password: process.env.SESSION_SECRET! });
    } catch {
      session = null;
    }
  }

  const { pathname } = req.nextUrl;
  const isPatientRoute = pathname.startsWith(PATIENT_PREFIX);
  const isDoctorRoute = pathname.startsWith(DOCTOR_PREFIX);

  if ((isPatientRoute || isDoctorRoute) && !session?.accessToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPatientRoute && session?.user?.role === "Doctor") {
    return NextResponse.redirect(new URL(DOCTOR_PREFIX, req.url));
  }

  if (isDoctorRoute && ((session?.user && session.user.role !== "Doctor") || session?.isAnonymous)) {
    return NextResponse.redirect(new URL(PATIENT_PREFIX, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/provider/:path*"],
};
