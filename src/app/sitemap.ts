import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getArchive, getTagCounts } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, archive, tags] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    getArchive(),
    getTagCounts(),
  ]);

  const now = new Date();

  return [
    { url: site.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/after-hours`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${site.url}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...posts.map((p) => ({
      url: `${site.url}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...tags.map((t) => ({
      url: `${site.url}/tags/${t.tag}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...archive.flatMap((y) =>
      y.months.map((m) => ({
        url: `${site.url}/archive/${y.year}/${String(m.month).padStart(2, "0")}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.3,
      })),
    ),
  ];
}
