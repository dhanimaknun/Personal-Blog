import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Pinged weekly by Vercel Cron (see vercel.json). Supabase's free tier
// auto-pauses a project after ~7 days with no database activity; this
// trivial query is enough to keep the clock from ever reaching that.
//
// If CRON_SECRET is set, only requests carrying it are honoured — Vercel
// sends it automatically as "Authorization: Bearer <CRON_SECRET>" for its
// own cron invocations. Unset (the default) → open, since this endpoint
// reveals nothing but a post count.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.post.count();
  return NextResponse.json({ ok: true, posts: count, at: new Date().toISOString() });
}
