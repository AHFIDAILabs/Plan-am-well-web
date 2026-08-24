import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { conversationId } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/chat/conversation/${encodeURIComponent(conversationId)}/read`, {
      method: "POST",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
