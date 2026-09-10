import { z } from "zod";
import { prisma } from "@/lib/prisma";

const cleanList = (input: unknown, max = 12): string[] => {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const out: string[] = [];
  for (const item of raw) {
    const v = String(item).trim().toLowerCase().slice(0, 40);
    if (v && !out.includes(v)) out.push(v);
  }
  return out.slice(0, max);
};

export const MediaInput = z.object({
  type: z.enum(["BOOK", "MOVIE", "SERIES", "MANGA", "MUSIC"]).optional(),
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  creator: z.string().trim().max(160).optional(),
  cover: z.string().trim().max(600).optional(),
  rating: z.number().min(0).max(5).optional(),
  genres: z.union([z.array(z.string()), z.string()]).optional(),
  moods: z.union([z.array(z.string()), z.string()]).optional(),
  status: z.enum(["PLANNED", "ONGOING", "COMPLETED", "DROPPED"]).optional(),
  notes: z.string().max(4000).optional(),
  favorite: z.boolean().optional(),
  consumedAt: z.string().datetime().nullable().optional(),
});

export type MediaInputShape = z.infer<typeof MediaInput>;

function toData(input: MediaInputShape) {
  const data: Record<string, unknown> = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.creator !== undefined) data.creator = input.creator.trim();
  if (input.cover !== undefined) data.cover = input.cover.trim();
  if (input.rating !== undefined) data.rating = Math.round(input.rating * 2) / 2;
  if (input.genres !== undefined) data.genres = cleanList(input.genres);
  if (input.moods !== undefined) data.moods = cleanList(input.moods);
  if (input.status !== undefined) data.status = input.status;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.favorite !== undefined) data.favorite = input.favorite;
  if (input.consumedAt !== undefined) {
    data.consumedAt = input.consumedAt ? new Date(input.consumedAt) : null;
  }
  return data;
}

export async function createMediaEntry(input: MediaInputShape) {
  if (!input.title?.trim()) throw new MediaError("Title is required", 422);
  return prisma.mediaEntry.create({
    data: { type: input.type ?? "BOOK", ...toData(input), title: input.title.trim() },
  });
}

export async function updateMediaEntry(id: string, input: MediaInputShape) {
  const existing = await prisma.mediaEntry.findUnique({ where: { id } });
  if (!existing) throw new MediaError("Entry not found", 404);
  return prisma.mediaEntry.update({ where: { id }, data: toData(input) });
}

export async function deleteMediaEntry(id: string) {
  const existing = await prisma.mediaEntry.findUnique({ where: { id } });
  if (!existing) throw new MediaError("Entry not found", 404);
  await prisma.mediaEntry.delete({ where: { id } });
}

export class MediaError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
