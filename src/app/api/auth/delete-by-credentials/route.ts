import { NextRequest, NextResponse } from "next/server";
import { forwardedForHeader } from "@/lib/clientIp";

const API_BASE = process.env.BACKEND_API_URL;

// Mirrors /api/auth/forgot-password — fully public, no session/cookie
// involved, so there's nothing for CSRF's double-submit check to protect.
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, message: "Email and password are required." }, { status: 400 });
  }

  const backendRes = await fetch(`${API_BASE}/auth/delete-by-credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
