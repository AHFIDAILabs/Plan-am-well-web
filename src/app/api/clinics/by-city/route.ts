import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");

  if (!city?.trim()) {
    return NextResponse.json({ success: false, message: "city is required" }, { status: 400 });
  }

  const backendRes = await publicBackendFetch(req, `/hospitals/by-city?city=${encodeURIComponent(city)}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
