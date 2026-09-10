import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { updateMediaEntry, deleteMediaEntry, MediaInput } from "@/lib/media-actions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// PATCH /api/media/:id → update (admin)
export const PATCH = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  const body = await readJson(req, MediaInput);
  return ok(await updateMediaEntry(params.id, body));
});

// DELETE /api/media/:id → remove (admin)
export const DELETE = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  await deleteMediaEntry(params.id);
  return ok({ ok: true });
});
