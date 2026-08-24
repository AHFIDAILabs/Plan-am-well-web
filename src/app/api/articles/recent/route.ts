import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit");
  const backendRes = await publicBackendFetch(req, `/advocacy/recent${limit ? `?limit=${limit}` : ""}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
