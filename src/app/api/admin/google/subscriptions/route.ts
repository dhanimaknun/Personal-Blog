import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { getSubscriptions } from "@/lib/google";
import { createSubscription, SubscriptionInput } from "@/lib/google-actions";

export const dynamic = "force-dynamic";

// GET /api/admin/google/subscriptions → every subscription (admin)
export const GET = handler(async () => {
  await requireSession();
  return ok(await getSubscriptions());
});

// POST /api/admin/google/subscriptions → add one (admin)
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  return ok(await createSubscription(await readJson(req, SubscriptionInput)), { status: 201 });
});
