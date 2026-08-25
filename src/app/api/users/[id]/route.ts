import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

const ALLOWED_FIELDS = [
  "name",
  "phone",
  "gender",
  "dateOfBirth",
  "homeAddress",
  "city",
  "state",
  "lga",
] as const;

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

  // Optional — only present when the user picked a new photo. Backend's
  // multer field name is "userImage", matching updateUser's upload.single().
  const imageFile = incoming.get("userImage");
  if (imageFile instanceof File && imageFile.size > 0) {
    outgoing.append("userImage", imageFile);
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: outgoing,
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
