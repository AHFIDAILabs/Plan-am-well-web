import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ?? "20";

  const backendRes = await publicBackendFetch(req, `/products/category/${encodeURIComponent(category)}?limit=${limit}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
