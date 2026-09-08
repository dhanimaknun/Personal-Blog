import { z } from "zod";
import { handler, ok, fail, readJson, assertSameOrigin } from "@/lib/api";
import { verifyCredentials, startSession } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({
  username: z.string().min(1, "Username is required").max(120),
  password: z.string().min(1, "Password is required").max(200),
});

export const POST = handler(async (req) => {
  assertSameOrigin(req);

  const limit = rateLimit(clientKey(req, "login"), 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return fail(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const { username, password } = await readJson(req, Body);
  const valid = await verifyCredentials(username, password);
  if (!valid) return fail("Invalid username or password.", 401);

  await startSession({ username });
  return ok({ ok: true });
});
