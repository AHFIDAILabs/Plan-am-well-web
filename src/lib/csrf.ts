import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const CSRF_COOKIE_NAME = "paw_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Issues a fresh CSRF token and attaches it to the response as a cookie.
 * Deliberately NOT httpOnly — same-origin JS must be able to read it to echo
 * it back as a header. That's fine: the security property here comes from a
 * cross-origin attacker page being unable to READ this origin's cookies at
 * all (browsers enforce that regardless of httpOnly), not from hiding the
 * value from our own JS.
 */
export function issueCsrfCookie(res: NextResponse): string {
  const token = generateCsrfToken();
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return token;
}

/**
 * Double-submit check for state-changing requests: the token sent as a
 * header must match the token cookie. A forged cross-site request can make
 * the victim's browser send the session cookie automatically (that's what
 * SameSite=Lax already mostly blocks for POST, this is defense-in-depth),
 * but the attacker's page can't read this origin's CSRF cookie to also
 * attach a matching header — so a forged request's header will be missing
 * or wrong even if the session cookie rides along.
 */
export function verifyCsrf(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}

export function csrfRejection() {
  return NextResponse.json({ success: false, message: "Invalid or missing CSRF token" }, { status: 403 });
}
