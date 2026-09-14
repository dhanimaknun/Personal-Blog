import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMediaEntry } from "@/lib/media-actions";
import { TYPE_LABEL } from "@/lib/media-shared";
import { createDraft, setStatus, PostError } from "@/lib/post-actions";
import { uploadImageBuffer } from "@/lib/storage";
import {
  sendMessage,
  downloadTelegramFile,
  parseTelegramEntry,
  parseTelegramPost,
  TELEGRAM_FULL_HELP,
} from "@/lib/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";
import { relativeTime } from "@/lib/dates";

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

const shortId = (id: string) => id.slice(-6);

async function handleDrafts(chatId: number) {
  const drafts = await prisma.post.findMany({
    where: { status: "DRAFT", deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  if (drafts.length === 0) {
    await sendMessage(chatId, "No drafts right now.");
    return;
  }
  const lines = drafts.map(
    (d) => `• ${d.title} — ${shortId(d.id)} (edited ${relativeTime(d.updatedAt)})`,
  );
  await sendMessage(chatId, `Recent drafts:\n\n${lines.join("\n")}\n\nReply "/publish <id>" to publish one.`);
}

async function handlePublish(chatId: number, idFragment: string) {
  const post = await prisma.post.findFirst({
    where: { deletedAt: null, id: { endsWith: idFragment.toLowerCase() } },
  });
  if (!post) {
    await sendMessage(chatId, `No post matches "${idFragment}". Try /drafts to see the short ids.`);
    return;
  }
  if (post.status === "PUBLISHED") {
    await sendMessage(chatId, `"${post.title}" is already published.\n${absoluteUrl(`/${post.slug}`)}`);
    return;
  }
  const updated = await setStatus(post.id, "PUBLISHED");
  await sendMessage(chatId, `Published ✓ — "${updated.title}"\n${absoluteUrl(`/${updated.slug}`)}`);
}

async function handlePost(chatId: number, text: string, photo?: TelegramPhoto[]) {
  const parsed = parseTelegramPost(text);
  if ("error" in parsed) {
    await sendMessage(chatId, parsed.error);
    return;
  }

  let content = parsed.body;
  if (photo?.length) {
    const largest = photo[photo.length - 1];
    const buffer = await downloadTelegramFile(largest.file_id);
    if (buffer) {
      const { url } = await uploadImageBuffer(buffer, "image/jpeg");
      content = `![${parsed.title}](${url})\n\n${content}`.trim();
    }
  }

  try {
    const draft = await createDraft({ title: parsed.title, content, tags: parsed.tags });
    if (parsed.publish) {
      const published = await setStatus(draft.id, "PUBLISHED");
      await sendMessage(
        chatId,
        `Published ✓ — "${published.title}"\n${absoluteUrl(`/${published.slug}`)}`,
      );
    } else {
      await sendMessage(
        chatId,
        `Draft saved — "${draft.title}" (${shortId(draft.id)})\nPreview: ${absoluteUrl(`/admin/preview/${draft.id}`)}\nReply "/publish ${shortId(draft.id)}" when it's ready.`,
      );
    }
  } catch (err) {
    const message = err instanceof PostError ? err.message : (err as Error).message;
    await sendMessage(chatId, `Couldn't save that: ${message}`);
  }
}

async function handleMedia(chatId: number, text: string, photo?: TelegramPhoto[]) {
  const parsed = parseTelegramEntry(text);
  if ("error" in parsed) {
    await sendMessage(chatId, parsed.error);
    return;
  }

  try {
    if (photo?.length) {
      const largest = photo[photo.length - 1];
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
}

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
    await sendMessage(chatId, TELEGRAM_FULL_HELP);
    return NextResponse.json({ ok: true });
  }

  const draftsCmd = /^\/drafts\b/i.test(text);
  const publishCmd = text.match(/^\/publish\s+(\S+)/i);

  if (draftsCmd) {
    await handleDrafts(chatId);
  } else if (publishCmd) {
    await handlePublish(chatId, publishCmd[1]);
  } else if (/^post\s*:/i.test(text)) {
    await handlePost(chatId, text, message.photo);
  } else {
    await handleMedia(chatId, text, message.photo);
  }

  return NextResponse.json({ ok: true });
}
