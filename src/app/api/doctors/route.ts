import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

// The backend's GET /doctors (getDoctors) has no auth middleware at all and
// only ever returns already-approved doctors — genuinely public. Using
// publicBackendFetch (not backendFetch) matters here specifically so
// signed-out landing-page visitors can load the doctors preview section;
// previously this required a session and threw a 401 for anyone not logged
// in, which was an unintended restriction, not a real access rule.
export async function GET(req: NextRequest) {
  const backendRes = await publicBackendFetch(req, "/doctors");
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
