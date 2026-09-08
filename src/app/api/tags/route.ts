import { handler, ok } from "@/lib/api";
import { getTagCounts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export const GET = handler(async () => ok(await getTagCounts()));
