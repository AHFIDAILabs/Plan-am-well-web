import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendRes = await publicBackendFetch(req, `/events/${encodeURIComponent(id)}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
