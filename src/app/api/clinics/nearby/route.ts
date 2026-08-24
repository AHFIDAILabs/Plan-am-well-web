import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "5000";

  if (!lat || !lng) {
    return NextResponse.json({ success: false, message: "lat and lng are required" }, { status: 400 });
  }

  const backendRes = await publicBackendFetch(
    req,
    `/hospitals/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}`
  );
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
