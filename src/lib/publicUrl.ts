import { NextRequest } from "next/server";

/**
 * The public-facing origin (protocol + host) the browser actually sent this
 * request to. `req.nextUrl.origin` reflects whatever Next.js reconstructed
 * the request URL from internally — behind Render's reverse proxy that
 * resolves to the container's internal bind address (e.g.
 * "http://localhost:10000") rather than the real public domain, exactly the
 * same failure mode already fixed for WebAuthn's relying-party ID (see
 * getRpID in ./webauthn.ts). X-Forwarded-Host/X-Forwarded-Proto, set by most
 * proxies including Render, are what the browser actually used and always
 * match window.location.origin.
 */
export function getPublicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
