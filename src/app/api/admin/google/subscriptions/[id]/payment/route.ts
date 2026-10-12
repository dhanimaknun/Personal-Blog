import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { PaymentInput, setPayment } from "@/lib/google-actions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// POST /api/admin/google/subscriptions/:id/payment {period, paid} → tick / untick (admin)
export const POST = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  return ok(await setPayment(params.id, await readJson(req, PaymentInput)));
});
