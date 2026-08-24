import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "50";

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/chat/conversation/${encodeURIComponent(conversationId)}/messages?page=${page}&limit=${limit}`
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { conversationId } = await params;
  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ success: false, message: "content is required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/chat/conversation/${encodeURIComponent(conversationId)}/message`, {
      method: "POST",
      body: JSON.stringify({ content, messageType: "text" }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
