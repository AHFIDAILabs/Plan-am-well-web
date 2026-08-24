import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/chatbot/conversation/${encodeURIComponent(sessionId)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { sessionId } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/chatbot/conversation/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
