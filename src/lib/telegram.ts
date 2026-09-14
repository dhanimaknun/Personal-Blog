// Minimal Telegram Bot API client — plain fetch, no SDK.
import { MEDIA_TYPES, MEDIA_STATUSES, TYPE_LABEL, type MediaType, type MediaStatus } from "@/lib/media-shared";
import type { MediaInputShape } from "@/lib/media-actions";

const API = "https://api.telegram.org";

function token(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_OWNER_CHAT_ID);
}

export async function sendMessage(chatId: number | string, text: string): Promise<void> {
  const t = token();
  if (!t) return;
  await fetch(`${API}/bot${t}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

/** Downloads a Telegram-hosted file (e.g. a photo) as a Buffer. */
export async function downloadTelegramFile(fileId: string): Promise<Buffer | null> {
  const t = token();
  if (!t) return null;
  try {
    const infoRes = await fetch(`${API}/bot${t}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const info = await infoRes.json();
    const path = info?.result?.file_path;
    if (!path) return null;
    const fileRes = await fetch(`${API}/file/bot${t}/${path}`);
    if (!fileRes.ok) return null;
    return Buffer.from(await fileRes.arrayBuffer());
  } catch {
    return null;
  }
}

// ── Message format ──────────────────────────────────────────
//
//   movie: Perfect Days
//   by: Wim Wenders
//   rating: 5
//   status: completed
//   genres: drama, slice of life
//   mood: comforting
//   notes: komorebi
//
// First line is required: "<type>: <title>". Everything else is optional
// key: value lines. Attach a photo (with this as the caption) to set the cover.

const TYPE_ALIASES: Record<string, MediaType> = {
  book: "BOOK",
  novel: "BOOK",
  movie: "MOVIE",
  film: "MOVIE",
  series: "SERIES",
  show: "SERIES",
  drama: "SERIES",
  manga: "MANGA",
  manhwa: "MANGA",
  comic: "MANGA",
  music: "MUSIC",
  song: "MUSIC",
  album: "MUSIC",
};

const STATUS_ALIASES: Record<string, MediaStatus> = {
  planned: "PLANNED",
  plan: "PLANNED",
  "to watch": "PLANNED",
  "to read": "PLANNED",
  ongoing: "ONGOING",
  "in progress": "ONGOING",
  watching: "ONGOING",
  reading: "ONGOING",
  listening: "ONGOING",
  completed: "COMPLETED",
  complete: "COMPLETED",
  done: "COMPLETED",
  finished: "COMPLETED",
  dropped: "DROPPED",
  quit: "DROPPED",
  abandoned: "DROPPED",
};

export const TELEGRAM_HELP = `Send me an entry like this — first line required, rest optional:

${MEDIA_TYPES.map((t) => TYPE_LABEL[t].toLowerCase()).join("/")}: <title>
by: <author/director/artist>
rating: <0-5>
status: ${MEDIA_STATUSES.map((s) => s.toLowerCase()).join("/")}
genres: comma, separated
mood: comma, separated
notes: whatever you want to remember
date: 2026-09-11

Example:
movie: Perfect Days
by: Wim Wenders
rating: 5
status: completed
genres: drama
mood: comforting
notes: komorebi

Attach a photo with this as the caption to set the cover.`;

// ── Blog post format ────────────────────────────────────────
//
//   post: On slow mornings
//   tags: life, writing
//   publish: yes
//
//   Some mornings don't ask anything of you.
//
//   They just sit there, quiet, waiting for coffee.
//
// First line required: "post: <title>". "tags:" and "publish:" are
// optional header lines right after it. Everything from the next blank
// line on is the Markdown body. Omit "publish:" to save as a draft.

export const TELEGRAM_POST_HELP = `To write a journal entry:

post: Your Title
tags: comma, separated (optional)
publish: yes (optional — leave out to save as a draft)

...then a blank line, then the body in Markdown.

Commands:
/drafts — list your recent drafts
/publish <id> — publish a draft by its short id (shown by /drafts)
/help — show this message

Attach a photo with "post: ..." as the caption to drop it into the post.`;

export type PostParseResult =
  | { title: string; tags: string[]; publish: boolean; body: string }
  | { error: string };

export function parseTelegramPost(text: string): PostParseResult {
  const lines = text.replace(/\r/g, "").split("\n");

  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;

  const head = lines[i]?.match(FIELD_LINE);
  if (!head || head[1].trim().toLowerCase() !== "post" || !head[2].trim()) {
    return { error: `First line has to be "post: Your Title".\n\n${TELEGRAM_POST_HELP}` };
  }
  const title = head[2].trim();
  i++;

  let tags: string[] = [];
  let publish = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      break;
    }
    const m = line.match(FIELD_LINE);
    if (!m) break;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (key === "tags") {
      tags = value.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (key === "publish") {
      publish = /^(y|yes|true|1)/i.test(value);
      i++;
    } else {
      break; // not a recognised header — treat as the start of the body
    }
  }

  const body = lines.slice(i).join("\n").trim();
  return { title, tags, publish, body };
}

export type ParseResult = { data: MediaInputShape } | { error: string };

const FIELD_LINE = /^([a-zA-Z ]+):\s*(.*)$/;

export function parseTelegramEntry(text: string): ParseResult {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: TELEGRAM_HELP };

  const head = lines[0].match(FIELD_LINE);
  const type = head && TYPE_ALIASES[head[1].trim().toLowerCase()];
  const title = head?.[2]?.trim();

  if (!type || !title) {
    return {
      error: `I couldn't read that as either a media entry or a post.\n\n${TELEGRAM_FULL_HELP}`,
    };
  }

  const data: MediaInputShape = { type, title };

  for (const line of lines.slice(1)) {
    const kv = line.match(FIELD_LINE);
    if (!kv) continue;
    const key = kv[1].trim().toLowerCase();
    const value = kv[2].trim();
    if (!value) continue;

    switch (key) {
      case "by":
      case "creator":
      case "author":
      case "director":
      case "artist":
        data.creator = value;
        break;
      case "rating":
      case "stars": {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) data.rating = Math.max(0, Math.min(5, n));
        break;
      }
      case "status": {
        const s = STATUS_ALIASES[value.toLowerCase()];
        if (s) data.status = s;
        break;
      }
      case "genre":
      case "genres":
        data.genres = value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "mood":
      case "moods":
        data.moods = value.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "notes":
      case "note":
        data.notes = value;
        break;
      case "favorite":
      case "fav":
        data.favorite = /^(y|yes|true|1)/i.test(value);
        break;
      case "date":
      case "when":
      case "finished": {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) data.consumedAt = d.toISOString();
        break;
      }
      default:
        break;
    }
  }

  return { data };
}

export const TELEGRAM_FULL_HELP = `I can do two things:

— After Hours (books/movies/series/manga/music):
${TELEGRAM_HELP}

— The journal:
${TELEGRAM_POST_HELP}`;
