import { handler, ok, requireSession } from "@/lib/api";
import { getStats } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireSession();
  return ok(await getStats());
});
