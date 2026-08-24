import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

// Named [id] for consistency with the sibling like/comments routes (which
// take the article's real _id), even though this one actually receives a
// slug — Next.js requires all dynamic segments at this level to share one
// param name; the value's actual meaning just depends on which route it hits.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  const backendRes = await publicBackendFetch(req, `/advocacy/${encodeURIComponent(slug)}`);
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
