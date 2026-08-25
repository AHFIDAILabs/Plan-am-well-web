import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { conversationId, messageId } = await params;
  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ success: false, message: "content is required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/chat/conversation/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "PUT", body: JSON.stringify({ content }) }
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { conversationId, messageId } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/chat/conversation/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "DELETE" }
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
