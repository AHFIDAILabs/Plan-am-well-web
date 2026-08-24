import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;
  const backendRes = await publicBackendFetch(req, `/advocacy/${encodeURIComponent(id)}/like`, { method: "POST" });
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
