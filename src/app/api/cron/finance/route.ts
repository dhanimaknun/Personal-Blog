import { NextRequest, NextResponse } from "next/server";
import { refreshMarketPrices } from "@/lib/finance-market";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Daily Vercel Cron (see vercel.json): snapshot the gold price and fund NABs
// so the Finance Deck's history has a point for every day, visited or not.
//
// Same CRON_SECRET convention as /api/keepalive. The response carries no
// portfolio data — only how many sources failed (details go to the logs).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { errors, refreshedAt } = await refreshMarketPrices({ force: true });
  if (errors.length) console.error("[cron/finance]", errors);
  return NextResponse.json({ ok: errors.length === 0, failures: errors.length, at: refreshedAt });
}
