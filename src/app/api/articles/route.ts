import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

const FORWARDED_PARAMS = ["category", "tag", "featured", "search", "page", "limit", "sort"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  const backendRes = await publicBackendFetch(req, `/advocacy${query.toString() ? `?${query}` : ""}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
