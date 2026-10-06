import { handler, ok, requireSession, assertSameOrigin } from "@/lib/api";
import { refreshMarketPrices } from "@/lib/finance-market";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/admin/finance/prices/refresh[?force=1] → fetch the latest gold
// price and fund NABs (throttled to every 30 min unless forced). Admin.
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  const force = new URL(req.url).searchParams.get("force") === "1";
  return ok(await refreshMarketPrices({ force }));
});
