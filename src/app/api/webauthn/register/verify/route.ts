import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";
import { getRpID } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const session = await getSession();
  if (!session.accessToken || session.isAnonymous || !session.webauthn?.challenge) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const rpID = getRpID(req);
  const origin = req.headers.get("origin") ?? `https://${rpID}`;

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: session.webauthn.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ success: false, message: "Could not verify registration" }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    session.webauthn = {
      challenge: undefined,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
    };
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message ?? "Registration failed" }, { status: 400 });
  }
}
