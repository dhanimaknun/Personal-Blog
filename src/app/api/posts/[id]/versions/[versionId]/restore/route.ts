import { handler, ok, requireSession, assertSameOrigin } from "@/lib/api";
import { restoreVersion } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

export const POST = handler(
  async (req, { params }: { params: { id: string; versionId: string } }) => {
    assertSameOrigin(req);
    await requireSession();
    return ok(await restoreVersion(params.id, params.versionId));
  },
);
