import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const limit = searchParams.get("limit") ?? "5";

  if (!q) {
    return NextResponse.json({ success: false, message: "q is required" }, { status: 400 });
  }

  const backendRes = await publicBackendFetch(
    req,
    `/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`
  );
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
