import { handler, ok, requireSession, HttpError } from "@/lib/api";
import { searchFunds } from "@/lib/finance-market";

export const dynamic = "force-dynamic";

// GET /api/admin/finance/funds?q=… → money-market funds matching the query,
// with their latest NAB (admin).
export const GET = handler(async (req) => {
  await requireSession();
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  try {
    return ok(await searchFunds(q));
  } catch (err) {
    console.error("[finance] fund search failed", err);
    throw new HttpError("The fund list is unavailable right now — try again shortly.", 502);
  }
});
