import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const backendRes = await publicBackendFetch(req, "/advocacy/tags");
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
