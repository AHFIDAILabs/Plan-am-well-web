import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { CSRF_COOKIE_NAME, verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const session = await getSession();
  session.destroy();

  const res = NextResponse.json({ success: true });
  res.cookies.delete(CSRF_COOKIE_NAME);
  return res;
}
