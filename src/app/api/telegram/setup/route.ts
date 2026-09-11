import { handler, ok, fail, requireSession } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

// GET /api/telegram/setup — registers (or removes with ?remove=1) the
// Telegram webhook, using TELEGRAM_BOT_TOKEN from the server environment.
// Admin-only so the token is never exposed to the caller.
export const GET = handler(async (req) => {
  await requireSession();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) {
    return fail("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET first.", 501);
  }

  const remove = new URL(req.url).searchParams.get("remove") === "1";
  const endpoint = remove
    ? `https://api.telegram.org/bot${token}/deleteWebhook`
    : `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
        absoluteUrl("/api/telegram/webhook"),
      )}&secret_token=${encodeURIComponent(secret)}`;

  const res = await fetch(endpoint);
  const body = await res.json().catch(() => ({}));
  return ok({ telegram: body });
});
