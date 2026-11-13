import { handler, ok, requireSession, assertSameOrigin } from "@/lib/api";
import { getRecommendations, refreshRecommendations } from "@/lib/recs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/media/recommendations → current "Up Next" picks (public read)
export const GET = handler(async () => ok(await getRecommendations()));

// POST /api/media/recommendations → re-analyse the library and fetch fresh picks (admin)
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  const { counts, errors } = await refreshRecommendations();
  return ok({ counts, failures: errors.length, items: await getRecommendations() });
});
