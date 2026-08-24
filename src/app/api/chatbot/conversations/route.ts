import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user?.id) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  return withAuthErrorHandling(async () => {
    // Always the caller's own id — never a client-supplied one, even though
    // the backend route itself doesn't verify :userId matches the bearer
    // token's subject.
    const backendRes = await backendFetch(req, `/chatbot/conversations/${encodeURIComponent(session.user!.id)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
