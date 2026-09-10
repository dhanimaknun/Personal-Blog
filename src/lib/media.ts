import type { MediaEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export * from "@/lib/media-shared";

export async function getMediaEntries(): Promise<MediaEntry[]> {
  return prisma.mediaEntry.findMany({
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  });
}
