// Thin client-side helper for calling THIS app's own Next.js API routes —
// never the Express backend directly. The browser has no way to reach the
// backend with a valid token anyway (see lib/session.ts / lib/backendFetch.ts
// for why), so every client-side data call goes through one of these routes.

const CSRF_COOKIE_NAME = "paw_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

function readCsrfCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// The double-submit check itself is correct (verified: register → cookie
// issued → matching header → 200) — a 403 here means the browser's CSRF
// cookie is stale or mismatched for whatever reason (e.g. it's shared per
// origin across tabs, and a different login in another tab can leave one
// tab holding an inconsistent cookie). Not fixable by retrying the same
// request, but a raw "Invalid or missing CSRF token" is a dead end for
// whoever hits it — this at least tells them what will actually fix it.
function withFriendlyCsrfMessage<T>(status: number, data: T): T {
  if (status !== 403) return data;
  const payload = data as { success?: boolean; message?: string };
  if (payload?.message === "Invalid or missing CSRF token") {
    return { ...payload, message: "Your session needs a refresh — please reload the page and try again." } as T;
  }
  return data;
}

async function csrfWrite<T = unknown>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const csrfToken = readCsrfCookie();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data: withFriendlyCsrfMessage(res.status, data) };
}

export function apiPost<T = unknown>(path: string, body?: unknown) {
  return csrfWrite<T>("POST", path, body);
}

// For authenticated multipart uploads (FormData) — csrfWrite always
// JSON.stringifies its body, which would corrupt a file upload's multipart
// boundary, so this is a separate path that leaves Content-Type for the
// browser to set from the FormData instance itself.
async function csrfWriteForm<T = unknown>(
  method: "POST" | "PUT",
  path: string,
  formData: FormData
): Promise<{ status: number; data: T }> {
  const csrfToken = readCsrfCookie();
  const res = await fetch(path, {
    method,
    headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : undefined,
    body: formData,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data: withFriendlyCsrfMessage(res.status, data) };
}

export function apiPostForm<T = unknown>(path: string, formData: FormData) {
  return csrfWriteForm<T>("POST", path, formData);
}

export function apiPutForm<T = unknown>(path: string, formData: FormData) {
  return csrfWriteForm<T>("PUT", path, formData);
}

export function apiPut<T = unknown>(path: string, body?: unknown) {
  return csrfWrite<T>("PUT", path, body);
}

export function apiPatch<T = unknown>(path: string, body?: unknown) {
  return csrfWrite<T>("PATCH", path, body);
}

export function apiDelete<T = unknown>(path: string, body?: unknown) {
  return csrfWrite<T>("DELETE", path, body);
}

export async function apiGet<T = unknown>(path: string): Promise<{ status: number; data: T }> {
  const res = await fetch(path, { credentials: "include", cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}
