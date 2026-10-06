import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { updateInvestment, deleteInvestment, InvestmentInput } from "@/lib/finance-actions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// PATCH /api/admin/finance/investments/:id → edit a purchase (admin)
export const PATCH = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  const body = await readJson(req, InvestmentInput);
  return ok(await updateInvestment(params.id, body));
});

// DELETE /api/admin/finance/investments/:id → remove a purchase (admin)
export const DELETE = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  await deleteInvestment(params.id);
  return ok({ ok: true });
});
