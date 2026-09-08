import { handler, ok, requireSession, assertSameOrigin } from "@/lib/api";
import { restore } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

export const POST = handler(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  await requireSession();
  return ok(await restore(params.id));
});
