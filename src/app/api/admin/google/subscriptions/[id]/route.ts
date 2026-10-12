import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { deleteSubscription, SubscriptionInput, updateSubscription } from "@/lib/google-actions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// PATCH /api/admin/google/subscriptions/:id → edit (admin)
export const PATCH = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  return ok(await updateSubscription(params.id, await readJson(req, SubscriptionInput)));
});

// DELETE /api/admin/google/subscriptions/:id → remove, with its payments (admin)
export const DELETE = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  await deleteSubscription(params.id);
  return ok({ ok: true });
});
