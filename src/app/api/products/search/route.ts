import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const category = searchParams.get("category");
  const limit = searchParams.get("limit") ?? "10";

  if (!query) {
    return NextResponse.json({ success: false, message: "query is required" }, { status: 400 });
  }

  const params = new URLSearchParams({ query, limit });
  if (category) params.set("category", category);

  const backendRes = await publicBackendFetch(req, `/products/search?${params}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
