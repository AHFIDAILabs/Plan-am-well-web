import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/doctors/${encodeURIComponent(id)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

// Real Doctor schema fields only — updateDoctor's own allowlist on the backend
// includes several fields ("about", "education", "languages", "consultationFee")
// that don't exist on the Doctor model and would silently no-op, so this list
// is intentionally narrower than that allowlist.
const ALLOWED_FIELDS = ["firstName", "lastName", "contactNumber", "specialization", "yearsOfExperience", "bio"] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;
  const incoming = await req.formData();

  const outgoing = new FormData();
  for (const field of ALLOWED_FIELDS) {
    const value = incoming.get(field);
    if (typeof value === "string") outgoing.append(field, value);
  }

  // Optional — only present when the doctor picked a new photo. Backend's
  // multer field name is "doctorImage", matching updateDoctor's upload.single().
  const imageFile = incoming.get("doctorImage");
  if (imageFile instanceof File && imageFile.size > 0) {
    outgoing.append("doctorImage", imageFile);
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/doctors/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: outgoing,
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
