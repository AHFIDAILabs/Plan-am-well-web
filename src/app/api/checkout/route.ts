import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

const ALLOWED_FIELDS = [
  "name",
  "phone",
  "email",
  "gender",
  "dateOfBirth",
  "homeAddress",
  "city",
  "state",
  "lga",
  "preferences",
  "deliveryFee",
] as const;

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const payload: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
