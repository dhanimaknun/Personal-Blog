import { handler, ok } from "@/lib/api";
import { endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  await endSession();
  return ok({ ok: true });
});
