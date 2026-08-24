import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const session = await getSession();
  if (!session.accessToken || session.isAnonymous || !session.user) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  const rpID = new URL(req.url).hostname;

  const options = await generateRegistrationOptions({
    rpName: "PlanAmWell",
    rpID,
    userName: session.user.email ?? session.user.name ?? session.user.id,
    userDisplayName: session.user.name ?? "PlanAmWell user",
    attestationType: "none",
    excludeCredentials: session.webauthn?.credentialId ? [{ id: session.webauthn.credentialId }] : undefined,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  session.webauthn = { ...session.webauthn, challenge: options.challenge };
  await session.save();

  return NextResponse.json({ success: true, options });
}
