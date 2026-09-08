import { handler, ok, requireSession, assertSameOrigin } from "@/lib/api";
import { duplicatePost } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

export const POST = handler(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  await requireSession();
  return ok(await duplicatePost(params.id), { status: 201 });
});
