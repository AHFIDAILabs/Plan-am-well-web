import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string; requestId: string }> }
) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { conversationId, requestId } = await params;
  const body = await req.json();

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/chat/conversation/${encodeURIComponent(conversationId)}/video-request/${encodeURIComponent(requestId)}/respond`,
      { method: "POST", body: JSON.stringify(body) }
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
