import { handler, ok, requireSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const session = await requireSession();
  return ok({ username: session.username });
});
