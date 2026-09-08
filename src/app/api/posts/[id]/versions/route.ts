import { handler, ok, requireSession } from "@/lib/api";
import { listVersions } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }: { params: { id: string } }) => {
  await requireSession();
  return ok(await listVersions(params.id));
});
