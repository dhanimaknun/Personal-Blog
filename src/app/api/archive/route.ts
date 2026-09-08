import { handler, ok } from "@/lib/api";
import { getArchive } from "@/lib/posts";

export const dynamic = "force-dynamic";

export const GET = handler(async () => ok(await getArchive()));
