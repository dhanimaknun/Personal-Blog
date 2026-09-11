import { NextResponse } from "next/server";
import { createMediaEntry } from "@/lib/media-actions";
import { TYPE_LABEL } from "@/lib/media-shared";
import { uploadImageBuffer } from "@/lib/storage";
import { sendMessage, downloadTelegramFile, parseTelegramEntry, TELEGRAM_HELP } from "@/lib/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TelegramPhoto = { file_id: string; width: number };
type TelegramMessage = {
  chat: { id: number };
  from?: { id: number };
  text?: string;
  caption?: string;
  photo?: TelegramPhoto[];
};

// Telegram POSTs every update here. Verified two ways:
//  1. the secret_token set on the webhook, echoed back in a header
//  2. the sender's Telegram user id must match TELEGRAM_OWNER_CHAT_ID
export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || got !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const message: TelegramMessage | undefined = update?.message;
  if (!message?.chat?.id) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const ownerId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (!ownerId || String(message.from?.id) !== ownerId) {
    return NextResponse.json({ ok: true }); // ignore anyone who isn't you, silently
  }

  const limit = rateLimit(`tg:${chatId}`, 20, 60_000);
  if (!limit.ok) {
    await sendMessage(chatId, "Slow down a little — try again in a moment.");
    return NextResponse.json({ ok: true });
  }

  const text = (message.caption || message.text || "").trim();

  if (!text || /^\/(start|help)\b/i.test(text)) {
    await sendMessage(chatId, TELEGRAM_HELP);
    return NextResponse.json({ ok: true });
  }

  const parsed = parseTelegramEntry(text);
  if ("error" in parsed) {
    await sendMessage(chatId, parsed.error);
    return NextResponse.json({ ok: true });
  }

  try {
    if (message.photo?.length) {
      const largest = message.photo[message.photo.length - 1];
      const buffer = await downloadTelegramFile(largest.file_id);
      if (buffer) {
        const { url } = await uploadImageBuffer(buffer, "image/jpeg");
        parsed.data.cover = url;
      }
    }

    const created = await createMediaEntry(parsed.data);
    await sendMessage(
      chatId,
      `Added ${TYPE_LABEL[created.type]} — "${created.title}" ✓\n${absoluteUrl("/after-hours")}`,
    );
  } catch (err) {
    await sendMessage(chatId, `Couldn't save that: ${(err as Error).message}`);
  }

  return NextResponse.json({ ok: true });
}
