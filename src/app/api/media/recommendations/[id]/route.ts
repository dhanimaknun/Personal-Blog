import { z } from "zod";
import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { addRecommendation, dismissRecommendation } from "@/lib/recs";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const Action = z.object({ action: z.enum(["add", "dismiss"]) });

// PATCH /api/media/recommendations/:id → { action: "add" } copies it into the
// library as Planned; { action: "dismiss" } hides it for good (admin)
export const PATCH = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  const { action } = await readJson(req, Action);
  if (action === "add") return ok({ entry: await addRecommendation(params.id) });
  await dismissRecommendation(params.id);
  return ok({ ok: true });
});
