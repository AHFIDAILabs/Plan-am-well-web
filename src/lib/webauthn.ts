import { NextRequest } from "next/server";

// `new URL(req.url).hostname` reflects whatever host Next.js reconstructed
// the request URL from internally — behind Render's reverse proxy that can
// resolve to the container's internal bind address ("localhost") rather than
// the public domain the browser is actually on, which WebAuthn's browser API
// then rejects ("The relying party ID ... is invalid for this domain").
// The Host header (or X-Forwarded-Host, set by most proxies including
// Render) is what the browser actually sent the request to, so it's the
// value that always matches window.location.hostname.
export function getRpID(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return host.split(":")[0];
}
