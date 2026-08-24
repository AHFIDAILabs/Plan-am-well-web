import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "20";

  const backendRes = await publicBackendFetch(req, `/products?page=${page}&limit=${limit}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
