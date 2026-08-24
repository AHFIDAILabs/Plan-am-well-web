import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET() {
  const session = await getSession();
  if (!session.accessToken || session.isAnonymous) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ success: true, registered: !!session.webauthn?.credentialId });
}

export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const session = await getSession();
  if (!session.accessToken || session.isAnonymous) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  session.webauthn = undefined;
  await session.save();
  return NextResponse.json({ success: true });
}
