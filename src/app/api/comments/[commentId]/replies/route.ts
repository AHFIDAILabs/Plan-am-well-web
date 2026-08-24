import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const backendRes = await publicBackendFetch(req, `/advocacy/comments/${encodeURIComponent(commentId)}/replies`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
