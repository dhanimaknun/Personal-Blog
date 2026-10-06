import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { getInvestments } from "@/lib/finance";
import { createInvestment, InvestmentInput } from "@/lib/finance-actions";

export const dynamic = "force-dynamic";

// GET /api/admin/finance/investments → every purchase (admin)
export const GET = handler(async () => {
  await requireSession();
  return ok(await getInvestments());
});

// POST /api/admin/finance/investments → record a purchase (admin)
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  const body = await readJson(req, InvestmentInput);
  return ok(await createInvestment(body), { status: 201 });
});
