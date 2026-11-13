import { NextRequest, NextResponse } from "next/server";
import { refreshRecommendations } from "@/lib/recs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Weekly Vercel Cron (see vercel.json): rebuild After Hours' "Up Next" from
// whatever the library looks like now. Same CRON_SECRET convention as
// /api/cron/finance; the response carries only counts.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { counts, errors } = await refreshRecommendations();
  return NextResponse.json({ ok: errors.length === 0, counts, failures: errors.length });
}
