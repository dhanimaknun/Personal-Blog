import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { getMediaEntries } from "@/lib/media";
import { createMediaEntry, MediaInput } from "@/lib/media-actions";

export const dynamic = "force-dynamic";

// GET /api/media → all entries (public read)
export const GET = handler(async () => ok(await getMediaEntries()));

// POST /api/media → create (admin; MediaError is unwrapped by `handler`)
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  const body = await readJson(req, MediaInput);
  return ok(await createMediaEntry(body), { status: 201 });
});
