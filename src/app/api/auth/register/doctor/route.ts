import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

// No CSRF check here, deliberately — same as /api/auth/login and
// /api/auth/register (patient): this is a pre-auth route with no session
// cookie yet, so there's nothing for the double-submit check to compare
// against. It also doesn't auto-login afterward like patient registration
// does: a self-registered doctor's status is "submitted", not "approved",
// and the backend blocks doctor login outright until an admin approves them.
const REQUIRED_FIELDS = ["firstName", "lastName", "email", "password", "specialization", "licenseNumber"] as const;
const ALLOWED_TEXT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "password",
  "specialization",
  "licenseNumber",
  "contactNumber",
  "yearsOfExperience",
  "bio",
] as const;

export async function POST(req: NextRequest) {
  const incoming = await req.formData();

  for (const field of REQUIRED_FIELDS) {
    if (!incoming.get(field)) {
      return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
    }
  }

  const imageFile = incoming.get("doctorImage");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ success: false, message: "A profile photo is required" }, { status: 400 });
  }

  const outgoing = new FormData();
  for (const field of ALLOWED_TEXT_FIELDS) {
    const value = incoming.get(field);
    if (typeof value === "string" && value) outgoing.append(field, value);
  }
  outgoing.append("doctorImage", imageFile);

  const backendRes = await publicBackendFetch(req, "/doctors", {
    method: "POST",
    body: outgoing,
  });
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
