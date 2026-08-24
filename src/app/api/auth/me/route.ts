import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

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
