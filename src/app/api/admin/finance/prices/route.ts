import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { getMarketPrices } from "@/lib/finance";
import { ManualPriceInput } from "@/lib/finance-actions";
import { clearManualPrice, saveManualPrice } from "@/lib/finance-market";

export const dynamic = "force-dynamic";

// GET /api/admin/finance/prices → full price history (admin)
export const GET = handler(async () => {
  await requireSession();
  return ok(await getMarketPrices());
});

// POST /api/admin/finance/prices → set (or, with price: null, clear) a manual
// price for one instrument on one day. Returns the full history.
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  const { key, date, price } = await readJson(req, ManualPriceInput);
  if (price === null) await clearManualPrice(key, date);
  else await saveManualPrice(key, date, price);
  return ok(await getMarketPrices());
});
